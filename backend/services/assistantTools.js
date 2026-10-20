// The things the AI assistant is allowed to do.
//
// Reading (query_records, farm_summary, weather, market_price, web_research) happens immediately.
// Changing data never happens here: propose_create / propose_update / propose_delete only make a
// "proposal". The app shows it to the farmer, and nothing is saved until they tap Confirm.
const crypto = require("crypto");
const { RESOURCES } = require("../models");
const { buildSummary } = require("./farmSummary");
const { getWeather } = require("./weatherService");
const { getMandiPrices } = require("./priceService");
const gemini = require("./geminiService");
const { pickBody } = require("../utils/sanitize");

const resourceNames = Object.keys(RESOURCES);

// What each record type contains, so the AI uses the right field names.
const FIELD_GUIDE = `
harvests: crop, date, boxes, kgPerBox, price (rupees per kg), labour, transport, other, waste, notes
fertilizers: name, crop, field, quantity, unit (kg|g|L), date, method, cost
pesticides: name, crop, field, quantity, unit (L|ml|kg|g), pest, cost, date
irrigations: crop, field, date, type (Drip|Sprinkler|Flood), hours, source (Well|Borewell|Canal|Rain-fed)
labour: worker, workType, crop, date, hours, payment, status (Paid|Pending)
expenses: category (Seeds|Fertilizer|Pesticides|Labour|Transportation|Water|Electricity|Equipment|Maintenance|Other), amount, date, crop, description
sales: crop, buyer, quantity (kg), price (rupees per kg), date, status (Paid|Pending|Partial)
farms: name, location, area (acres), soil
crops: crop, farm, field, area, plantingDate, plants, stage (Planned|Planted|Growing|Flowering|Fruiting|Harvesting|Completed), expectedHarvest
pestrecords: crop, pest, date, severity (Low|Medium|High), action, product
notes: text, crop
(dates are written YYYY-MM-DD)`;

function systemPrompt() {
  return (
    "You are CropMate AI, a friendly and knowledgeable assistant for a farmer in India. You can help with anything, like a general AI assistant, and you know the farmer's records. Today is " + new Date().toISOString().slice(0, 10) + ".\n" +
    "- Answer any question. Use simple words and short answers. Reply in the same language the farmer writes in (English or Tamil).\n" +
    "- Plain text only: no markdown, no asterisks, no tables. Use short lines or numbered steps.\n" +
    "- For facts that change or that you are not sure about (news, prices, laws, government schemes, dates, products, current events), call web_research first, then explain the answer simply and say where it came from.\n" +
    "- For any number about their farm, call query_records or farm_summary. Never invent farm numbers.\n" +
    "- Weather: call the weather tool. If no place is given it uses the farm's saved location; if there is none, ask for a place. Add one practical farming tip (for example, delay spraying if rain is likely).\n" +
    "- Prices: call market_price. If it has no live data, use web_research. If that also fails, give only a rough range and say clearly it is an estimate to check at the local market.\n" +
    "- Plant disease and pests: ask for symptoms if needed, suggest the likely cause and low-risk steps first. Never give chemical doses; say to follow the product label and ask a local agriculture officer. For a photo, tell them to use Crop Doctor.\n" +
    "- To add, edit or delete anything, call propose_create, propose_update or propose_delete. These only prepare the change. Then tell the farmer to check it and tap Confirm. Never say it is already saved.\n" +
    "- To edit or delete, first find the record with query_records and use its id. If more than one record could match, ask which one.\n" +
    "- If something essential is missing (for example the number of boxes), ask one short question instead of guessing.\n" +
    "Record fields:" + FIELD_GUIDE
  );
}

const text = (description) => ({ type: "STRING", description });

const declarations = [
  {
    name: "query_records",
    description: "Read the farmer's saved records, newest first. Each row has an id.",
    parameters: {
      type: "OBJECT",
      properties: {
        resource: { type: "STRING", enum: resourceNames },
        crop: text("Only this crop, e.g. Tomato"),
        from: text("Start date YYYY-MM-DD"),
        to: text("End date YYYY-MM-DD"),
        limit: { type: "NUMBER", description: "How many rows (max 20)" },
      },
      required: ["resource"],
    },
  },
  {
    name: "web_research",
    description: "Search the web for current or factual information (news, prices, schemes, how-to, science, anything) and get a short sourced answer.",
    parameters: { type: "OBJECT", properties: { query: text("What to look up, as a clear search question") }, required: ["query"] },
  },
  { name: "farm_summary", description: "Totals for the whole farm: harvests, boxes, kg, revenue, expenses, profit, recent harvests and notes." },
  {
    name: "weather",
    description: "Current weather and a short forecast for a place.",
    parameters: { type: "OBJECT", properties: { place: text("Town or city. Leave out to use the farm's saved location."), days: { type: "NUMBER", description: "1 to 7" } } },
  },
  {
    name: "market_price",
    description: "Latest mandi (market) prices for a crop, in rupees per kg, if a live source is connected.",
    parameters: { type: "OBJECT", properties: { commodity: text("Crop name, e.g. Tomato"), state: text("State, e.g. Tamil Nadu"), market: text("Market name") }, required: ["commodity"] },
  },
  {
    name: "propose_create",
    description: "Prepare a NEW record for the farmer to confirm. Nothing is saved until they confirm.",
    parameters: {
      type: "OBJECT",
      properties: {
        resource: { type: "STRING", enum: resourceNames },
        data: text('The fields as a JSON object string, e.g. {"crop":"Tomato","boxes":12,"kgPerBox":20}'),
        summary: text("One short plain sentence describing the change"),
      },
      required: ["resource", "data", "summary"],
    },
  },
  {
    name: "propose_update",
    description: "Prepare a change to an existing record for the farmer to confirm. Use the id from query_records.",
    parameters: {
      type: "OBJECT",
      properties: {
        resource: { type: "STRING", enum: resourceNames },
        id: text("Record id"),
        data: text("Only the fields to change, as a JSON object string"),
        summary: text("One short plain sentence describing the change"),
      },
      required: ["resource", "id", "data", "summary"],
    },
  },
  {
    name: "propose_delete",
    description: "Prepare the deletion of a record for the farmer to confirm. Use the id from query_records.",
    parameters: {
      type: "OBJECT",
      properties: { resource: { type: "STRING", enum: resourceNames }, id: text("Record id"), summary: text("One short plain sentence describing what will be deleted") },
      required: ["resource", "id", "summary"],
    },
  },
];

// ---------- helpers ----------
const plain = (doc) => {
  const row = JSON.parse(JSON.stringify(doc));
  row.id = row._id;
  for (const key of ["_id", "__v", "user", "sourceNote", "createdAt", "updatedAt"]) delete row[key];
  return row;
};

function parseData(value) {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    if (data && typeof data === "object" && !Array.isArray(data)) return { data: pickBody(data) };
  } catch { /* fall through */ }
  return { error: "data must be a JSON object" };
}

const wait = (text) => ({ ok: true, status: "Prepared. Waiting for the farmer to confirm in the app." });

// ---------- tools ----------
async function queryRecords(args, ctx) {
  const Model = RESOURCES[args.resource];
  if (!Model) return { error: "Unknown resource" };

  const filter = { user: ctx.userId };
  const hasDate = Boolean(Model.schema.path("date"));
  if (args.crop && Model.schema.path("crop")) filter.crop = String(args.crop);
  if (hasDate && (args.from || args.to)) {
    filter.date = {};
    if (args.from) filter.date.$gte = new Date(args.from);
    if (args.to) filter.date.$lte = new Date(args.to);
  }
  const limit = Math.min(20, Math.max(1, Number(args.limit) || 10));
  const [rows, total] = await Promise.all([
    Model.find(filter).sort(hasDate ? { date: -1 } : { createdAt: -1 }).limit(limit),
    Model.countDocuments(filter),
  ]);
  return { total, shown: rows.length, rows: rows.map(plain) };
}

async function weather(args, ctx) {
  let place = String(args.place || "").trim();
  if (!place) {
    const farm = await RESOURCES.farms.findOne({ user: ctx.userId, location: { $exists: true, $ne: "" } });
    place = farm ? farm.location : "";
  }
  if (!place) return { error: "No place given and no farm location saved. Ask the farmer for a place." };
  const result = await getWeather(place, args.days);
  return result.found ? result : { error: `Could not find a place called "${place}".` };
}

// Looks something up on the web using Gemini with Google Search. Sources are passed back to the app.
async function webResearch(args, ctx) {
  const query = String(args.query || "").slice(0, 300);
  if (!query) return { error: "No question given" };

  const data = await gemini.generateContent({
    systemInstruction: { parts: [{ text: "You are a careful research assistant. Search the web and answer factually in plain text, under 150 words. Say if sources disagree or you are unsure. Use only what the sources say for prices, dates and numbers." }] },
    contents: [{ role: "user", parts: [{ text: query }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  });

  const candidate = data.candidates && data.candidates[0];
  const answer = ((candidate && candidate.content && candidate.content.parts) || []).map((part) => part.text || "").join("").trim();
  const chunks = (candidate && candidate.groundingMetadata && candidate.groundingMetadata.groundingChunks) || [];
  const sources = chunks.map((chunk) => chunk.web).filter((web) => web && web.uri).slice(0, 4).map((web) => ({ title: web.title || web.uri, uri: web.uri }));

  for (const source of sources) if (!ctx.sources.some((s) => s.uri === source.uri)) ctx.sources.push(source);
  return answer ? { answer, sources: sources.map((s) => s.title) } : { error: "No answer found" };
}

async function proposeCreate(args, ctx) {
  const Model = RESOURCES[args.resource];
  if (!Model) return { ok: false, error: "Unknown resource" };
  const parsed = parseData(args.data);
  if (parsed.error) return { ok: false, error: parsed.error };

  try {
    await new Model({ ...parsed.data, user: ctx.userId }).validate();
  } catch (error) {
    return { ok: false, error: error.message };
  }
  ctx.proposals.push({ pid: crypto.randomUUID(), kind: "create", resource: args.resource, data: parsed.data, summary: String(args.summary).slice(0, 200) });
  return wait();
}

async function findOwned(args, ctx) {
  const Model = RESOURCES[args.resource];
  if (!Model) return { error: "Unknown resource" };
  try {
    const doc = await Model.findOne({ _id: args.id, user: ctx.userId });
    return doc ? { Model, doc } : { error: "No record with that id" };
  } catch {
    return { error: "No record with that id" };
  }
}

async function proposeUpdate(args, ctx) {
  const found = await findOwned(args, ctx);
  if (found.error) return { ok: false, error: found.error };
  const parsed = parseData(args.data);
  if (parsed.error) return { ok: false, error: parsed.error };

  try {
    const copy = new found.Model(found.doc.toObject());
    copy.set(parsed.data);
    await copy.validate();
  } catch (error) {
    return { ok: false, error: error.message };
  }
  const before = {};
  for (const key of Object.keys(parsed.data)) before[key] = found.doc.get(key);
  ctx.proposals.push({ pid: crypto.randomUUID(), kind: "update", resource: args.resource, recordId: String(args.id), data: parsed.data, before, summary: String(args.summary).slice(0, 200) });
  return wait();
}

async function proposeDelete(args, ctx) {
  const found = await findOwned(args, ctx);
  if (found.error) return { ok: false, error: found.error };
  ctx.proposals.push({ pid: crypto.randomUUID(), kind: "delete", resource: args.resource, recordId: String(args.id), summary: String(args.summary).slice(0, 200) });
  return wait();
}

// Runs one tool the AI asked for. ctx = { userId, proposals: [], sources: [] }
async function runTool(name, args, ctx) {
  switch (name) {
    case "query_records": return queryRecords(args, ctx);
    case "farm_summary": return buildSummary(ctx.userId);
    case "weather": return weather(args, ctx);
    case "web_research": return webResearch(args, ctx);
    case "market_price": return getMandiPrices(args);
    case "propose_create": return proposeCreate(args, ctx);
    case "propose_update": return proposeUpdate(args, ctx);
    case "propose_delete": return proposeDelete(args, ctx);
    default: return { error: `Unknown tool ${name}` };
  }
}

module.exports = { declarations, systemPrompt, runTool };
