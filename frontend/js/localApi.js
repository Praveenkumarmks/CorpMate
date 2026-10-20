(function () {
"use strict";
// A small stand-in for the backend. It keeps everything in this browser (localStorage),
// so the app works when you simply open index.html without running the server.
// It understands the same URLs as the real API, so the screens do not need to know the difference.

const KEY = "cm_local_db";
const USER_KEY = "cm_local_user";
const RESOURCES = ["farms", "fields", "crops", "notes", "harvests", "fertilizers", "pesticides", "irrigations", "labour", "expenses", "sales", "pestrecords", "diagnoses"];
const NUMERIC = new Set(["area", "plants", "quantity", "cost", "hours", "payment", "amount", "price", "boxes", "kgPerBox", "waste", "labour", "transport", "other", "confidence", "harvestNo", "gradeA", "gradeB", "gradeC"]);
const DATE_FIELDS = ["date", "plantingDate", "expectedHarvest"];
const NO_DATE = ["farms", "fields", "crops"];
const REQUIRED = { farms: ["name"], crops: ["crop"], notes: ["text"], fertilizers: ["name"], pesticides: ["name"], labour: ["worker"], expenses: ["category", "amount"], pestrecords: ["pest"], diagnoses: ["name"] };
const DAY = 864e5;

const num = (value) => Number(value) || 0;
const copy = (value) => JSON.parse(JSON.stringify(value));
const newId = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

// ---------- storage ----------
let cache = null;

function demoData() {
  const doc = (fields) => ({ _id: newId(), createdAt: new Date().toISOString(), ...fields });
  return {
    farms: [doc({ name: "Main Farm", area: 5, soil: "Loamy" }), doc({ name: "Second Farm", area: 3, soil: "Red" })],
    crops: [
      doc({ crop: "Tomato", farm: "Main Farm", area: 2, stage: "Fruiting" }),
      doc({ crop: "Chilli", farm: "Main Farm", area: 1.5, stage: "Growing" }),
    ],
    harvests: [
      doc({ crop: "Tomato", boxes: 22, kgPerBox: 20, price: 34, labour: 2900, date: daysAgo(24) }),
      doc({ crop: "Tomato", boxes: 25, kgPerBox: 20, price: 35, labour: 3100, date: daysAgo(20) }),
      doc({ crop: "Chilli", boxes: 14, kgPerBox: 15, price: 60, labour: 1800, date: daysAgo(15) }),
      doc({ crop: "Tomato", boxes: 28, kgPerBox: 20, price: 36, labour: 3300, date: daysAgo(9) }),
    ],
    notes: [doc({ text: "Watered Field A for 2 hours.", date: daysAgo(1) })],
  };
}

function db() {
  if (cache) return cache;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) cache = JSON.parse(saved);
  } catch { /* storage blocked */ }
  if (!cache) {
    cache = demoData();
    save();
  }
  for (const name of RESOURCES) cache[name] = cache[name] || [];
  return cache;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage blocked */ }
}

function reset() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ---------- records ----------
// Adds the calculated values the real server adds.
function decorate(name, row) {
  const out = { ...row, id: row._id };
  if (name === "harvests") {
    out.totalKg = num(row.boxes) * num(row.kgPerBox);
    out.revenue = out.totalKg * num(row.price);
    out.cost = num(row.labour) + num(row.transport) + num(row.other);
    out.net = out.revenue - out.cost;
  }
  if (name === "sales") out.total = num(row.quantity) * num(row.price);
  return out;
}

function castBody(body) {
  const out = {};
  for (const [key, raw] of Object.entries(body || {})) {
    if (["user", "_id", "id", "createdAt", "updatedAt"].includes(key)) continue;
    if (NUMERIC.has(key) && raw !== "" && raw !== null) {
      const n = Number(raw);
      if (Number.isNaN(n)) throw new Error(`${key} must be a number`);
      out[key] = n;
    } else if (DATE_FIELDS.includes(key) && raw) {
      const d = new Date(raw);
      if (Number.isNaN(+d)) throw new Error(`${key} is not a valid date`);
      out[key] = d.toISOString();
    } else {
      out[key] = raw;
    }
  }
  return out;
}

function insert(name, fields) {
  for (const field of REQUIRED[name] || []) {
    if (fields[field] === undefined || fields[field] === "") throw new Error(`${field} is required`);
  }
  const doc = { ...fields, _id: newId(), createdAt: new Date().toISOString() };
  if (!NO_DATE.includes(name) && !doc.date) doc.date = doc.createdAt;
  db()[name].unshift(doc);
  save();
  return doc;
}

function list(name, query) {
  let rows = db()[name];
  for (const key of ["crop", "farm", "field", "status", "category"]) if (query[key]) rows = rows.filter((r) => r[key] === query[key]);
  if (query.from) rows = rows.filter((r) => new Date(r.date) >= new Date(query.from));
  if (query.to) rows = rows.filter((r) => new Date(r.date) <= new Date(query.to));
  return rows.map((r) => decorate(name, r));
}

function everything() {
  const result = {};
  for (const name of RESOURCES) {
    const rows = db()[name].map((r) => decorate(name, r));
    result[name] = name === "harvests" ? rows.sort((a, b) => new Date(a.date) - new Date(b.date)) : rows;
  }
  return result;
}

// ---------- note reading (same rules as the server) ----------
const CROPS = ["Tomato", "Chilli", "Banana", "Coconut", "Onion"];
const TAMIL_CROPS = { "தக்காளி": "Tomato", "மிளகாய்": "Chilli", "வாழை": "Banana" };
const FERT = "urea|dap|potash|npk|compost";
const cap = (w) => w[0].toUpperCase() + w.slice(1).toLowerCase();

function parseNote(input) {
  const text = input.replace(/பெட்டி/g, "box");
  const r = {};
  for (const [ta, en] of Object.entries(TAMIL_CROPS)) if (text.includes(ta)) r.crop = en;
  const crop = CROPS.find((c) => new RegExp(c, "i").test(text));
  if (crop) r.crop = crop;

  const boxes = text.match(/(\d+(?:\.\d+)?)\s*box/i) || text.match(/box(?:es)?\D{0,6}(\d+)/i);
  if (boxes) r.boxes = Number(boxes[1]);
  const kg = text.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:per|each|a)\s*box/i) || text.match(/box[^.]{0,20}?(\d+(?:\.\d+)?)\s*kg/i);
  if (kg) r.kgPerBox = Number(kg[1]);
  if (r.boxes && r.kgPerBox) r.totalKg = r.boxes * r.kgPerBox;

  const f1 = text.match(new RegExp(`(${FERT})\\D{0,20}?(\\d+(?:\\.\\d+)?)\\s*(kg|g)`, "i"));
  const f2 = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(kg|g)\\s*(?:of\\s*)?(${FERT})`, "i"));
  if (f1) { r.fertilizer = cap(f1[1]); r.fertilizerKg = Number(f1[2]); }
  else if (f2) { r.fertilizer = cap(f2[3]); r.fertilizerKg = Number(f2[1]); }

  const labour = text.match(/labou?r\D{0,12}?(\d[\d,]*)/i);
  if (labour) r.labourCost = Number(labour[1].replace(/,/g, ""));
  const other = text.match(/(?:transport\w*|other)\D{0,12}?(\d[\d,]*)/i);
  if (other) r.otherCosts = Number(other[1].replace(/,/g, ""));
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (hours && /water|irrigat/i.test(text)) r.irrigationHours = Number(hours[1]);
  const price =
    text.match(/(?:price|rate|at|@)\s*(?:of\s*)?(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:rupees?|rs)?\s*(?:\/|per|a)\s*kg/i) ||
    text.match(/(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:₹|rupees?|rs\.?)\s*(?:\/|per|a)\s*kg/i) ||
    text.match(/(?:₹|rs\.?\s*)(\d+(?:\.\d+)?)\s*(?:\/|per)\s*kg/i);
  if (price) r.pricePerKg = Number(price[1]);
  return r;
}

function convertNote(body) {
  const data = body.data || {};
  let note = null;
  if (body.noteId) note = db().notes.find((n) => n._id === body.noteId);
  else if (body.text) note = insert("notes", { text: String(body.text).slice(0, 5000), crop: body.crop });
  const crop = data.crop || body.crop;
  const created = {};

  if (data.boxes) {
    created.harvest = insert("harvests", { crop, boxes: data.boxes, kgPerBox: data.kgPerBox || 0, price: data.pricePerKg || 0, labour: data.labourCost || 0, other: data.otherCosts || 0 });
  } else if (data.labourCost) {
    created.expense = insert("expenses", { crop, category: "Labour", amount: data.labourCost, description: "From note" });
  }
  if (data.fertilizer) created.fertilizer = insert("fertilizers", { crop, name: data.fertilizer, quantity: data.fertilizerKg, unit: "kg" });
  if (data.irrigationHours) created.irrigation = insert("irrigations", { crop, hours: data.irrigationHours });
  if (note) { note.converted = true; save(); }
  return { note, created };
}

// ---------- analytics and predictions (same maths as the server) ----------
const monthOf = (d) => new Date(d).toISOString().slice(0, 7);

function analytics(q) {
  const D = db();
  const keep = (r) =>
    (!q.crop || r.crop === q.crop) && (!q.farm || r.farm === q.farm) &&
    (!q.from || new Date(r.date) >= new Date(q.from)) && (!q.to || new Date(r.date) <= new Date(q.to));
  const byCrop = {}, byMonth = {}, categories = {};
  const totals = { boxes: 0, kg: 0, revenue: 0, expenses: 0 };
  const cropRow = (n) => (byCrop[n || "Other"] = byCrop[n || "Other"] || { crop: n || "Other", boxes: 0, kg: 0, revenue: 0, expenses: 0 });
  const monthRow = (d) => (byMonth[monthOf(d)] = byMonth[monthOf(d)] || { month: monthOf(d), revenue: 0, expenses: 0 });

  for (const h of D.harvests.filter(keep)) {
    const kg = num(h.boxes) * num(h.kgPerBox), revenue = kg * num(h.price), cost = num(h.labour) + num(h.transport) + num(h.other);
    const row = cropRow(h.crop);
    row.boxes += num(h.boxes); row.kg += kg; row.revenue += revenue; row.expenses += cost;
    monthRow(h.date).revenue += revenue; monthRow(h.date).expenses += cost;
    categories["Harvest costs"] = (categories["Harvest costs"] || 0) + cost;
    totals.boxes += num(h.boxes); totals.kg += kg; totals.revenue += revenue; totals.expenses += cost;
  }
  const addCosts = (rows, categoryOf, amountOf) => {
    for (const r of rows.filter(keep)) {
      const amount = num(amountOf(r)), category = categoryOf(r);
      categories[category] = (categories[category] || 0) + amount;
      cropRow(r.crop).expenses += amount; monthRow(r.date).expenses += amount; totals.expenses += amount;
    }
  };
  addCosts(D.expenses, (e) => e.category || "Other", (e) => e.amount);
  addCosts(D.labour, () => "Labour", (l) => l.payment);
  addCosts(D.fertilizers, () => "Fertilizer", (f) => f.cost);
  addCosts(D.pesticides, () => "Pesticides", (p) => p.cost);

  const acres = D.crops.filter((c) => (!q.crop || c.crop === q.crop) && (!q.farm || c.farm === q.farm)).reduce((s, c) => s + num(c.area), 0);
  return {
    totals: { ...totals, profit: totals.revenue - totals.expenses, salesTotal: D.sales.filter(keep).reduce((s, x) => s + num(x.quantity) * num(x.price), 0), yieldPerAcre: acres ? Math.round(totals.kg / acres) : null },
    byCrop: Object.values(byCrop).map((r) => ({ ...r, profit: r.revenue - r.expenses })),
    monthly: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    expenseCategories: Object.entries(categories).map(([category, amount]) => ({ category, amount })),
  };
}

function predict(crop) {
  const harvests = db().harvests.filter((h) => !crop || h.crop === crop).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (harvests.length < 2) return { ok: false, samples: harvests.length };
  const avg = (list) => list.reduce((s, v) => s + v, 0) / list.length;
  const recent = harvests.slice(-5);
  const boxes = avg(recent.map((h) => num(h.boxes))), kgPerBox = avg(recent.map((h) => num(h.kgPerBox)));
  const prices = recent.map((h) => num(h.price)).filter(Boolean), price = prices.length ? avg(prices) : 0;
  const gaps = harvests.slice(-6).map((h, i, l) => (i ? (new Date(h.date) - new Date(l[i - 1].date)) / DAY : null)).filter((g) => g && g > 0);
  const gap = gaps.length ? Math.round(avg(gaps)) : null;
  const band = (v) => [Math.round(v * 0.95), Math.round(v * 1.15)];
  return {
    ok: true, samples: harvests.length, boxes: band(boxes), kg: band(boxes * kgPerBox), revenue: band(boxes * kgPerBox * price),
    nextDate: gap ? new Date(+new Date(harvests[harvests.length - 1].date) + gap * DAY).toISOString().slice(0, 10) : null,
  };
}

function assistant(question) {
  const D = db();
  const revenue = D.harvests.reduce((s, h) => s + num(h.boxes) * num(h.kgPerBox) * num(h.price), 0);
  const costs = D.harvests.reduce((s, h) => s + num(h.labour) + num(h.transport) + num(h.other), 0)
    + D.expenses.reduce((s, e) => s + num(e.amount), 0) + D.labour.reduce((s, l) => s + num(l.payment), 0);
  const inr = (v) => "₹" + Math.round(v).toLocaleString("en-IN");
  const q = question.toLowerCase();
  if (/profit|earn/.test(q)) return `Your profit so far is ${inr(revenue - costs)} (revenue ${inr(revenue)}, expenses ${inr(costs)}).`;
  if (/box|harvest|yield/.test(q)) return `You have recorded ${D.harvests.reduce((s, h) => s + num(h.boxes), 0)} boxes across ${D.harvests.length} harvests.`;
  return "In local mode I can answer questions about your profit, boxes and harvests. Run the CropMate server with an AI key for full answers.";
}


// ---------- AI Assistant without the server ----------
// Understands simple commands (add, change, delete, questions) and the weather. It only PREPARES changes;
// the app asks you to confirm before anything is saved.
const todayText = () => new Date().toISOString().slice(0, 10);
const rupees = (v) => "₹" + Math.round(v).toLocaleString("en-IN");
const money = "(?:₹|rs\\.?\\s*)?";
let proposalCount = 0;
const proposal = (fields) => ({ pid: "p" + ++proposalCount + Date.now().toString(36), ...fields });

function latestRow(name, crop) {
  return db()[name]
    .filter((r) => !crop || r.crop === crop)
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))[0];
}

const EXPENSE_WORDS = [[/seed/, "Seeds"], [/fertili|urea|dap|potash/, "Fertilizer"], [/pesticid|spray/, "Pesticides"], [/labou?r|worker/, "Labour"],
  [/diesel|transport|fuel/, "Transportation"], [/water/, "Water"], [/electric|power/, "Electricity"], [/repair|maint/, "Maintenance"], [/tool|equipment|machine/, "Equipment"]];

function addProposals(text) {
  const o = parseNote(text), out = [], date = todayText(), crop = o.crop;
  if (o.boxes) {
    out.push(proposal({ kind: "create", resource: "harvests", data: { crop, date, boxes: o.boxes, kgPerBox: o.kgPerBox || 0, price: o.pricePerKg || 0, labour: o.labourCost || 0, other: o.otherCosts || 0 },
      summary: `Harvest of ${crop || "crop"}: ${o.boxes} boxes${o.kgPerBox ? ` × ${o.kgPerBox} kg` : ""}${o.pricePerKg ? ` at ₹${o.pricePerKg}/kg` : ""}` }));
  } else if (o.labourCost) {
    out.push(proposal({ kind: "create", resource: "expenses", data: { category: "Labour", amount: o.labourCost, date, crop }, summary: `Labour expense ${rupees(o.labourCost)}` }));
  }
  if (o.fertilizer) out.push(proposal({ kind: "create", resource: "fertilizers", data: { name: o.fertilizer, quantity: o.fertilizerKg, unit: "kg", crop, date }, summary: `Fertilizer: ${o.fertilizer} ${o.fertilizerKg} kg` }));
  if (o.irrigationHours) out.push(proposal({ kind: "create", resource: "irrigations", data: { hours: o.irrigationHours, crop, date }, summary: `Irrigation: ${o.irrigationHours} hours` }));

  const sold = text.match(new RegExp(`sold\\D{0,12}(\\d+(?:\\.\\d+)?)\\s*kg\\D{0,25}?${money}(\\d+)`, "i"));
  if (sold) out.push(proposal({ kind: "create", resource: "sales", data: { crop, quantity: Number(sold[1]), price: Number(sold[2]), date }, summary: `Sale: ${sold[1]} kg at ₹${sold[2]}/kg` }));

  const spent = !out.length && text.match(new RegExp(`(?:expense|spent|paid for|bought)\\D{0,30}?${money}(\\d[\\d,]*)`, "i"));
  if (spent) {
    const amount = Number(spent[1].replace(/,/g, "")), found = EXPENSE_WORDS.find(([re]) => re.test(text.toLowerCase()));
    const category = found ? found[1] : "Other";
    out.push(proposal({ kind: "create", resource: "expenses", data: { category, amount, date, crop }, summary: `Expense (${category}): ${rupees(amount)}` }));
  }
  return out;
}

function editProposal(text) {
  const lower = text.toLowerCase();
  const m = lower.match(/(price|boxes|labou?r|kg per box|weight|amount)\D{0,25}?(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const crop = CROPS.find((c) => lower.includes(c.toLowerCase()));
  const resource = /expense/.test(lower) || m[1] === "amount" ? "expenses" : "harvests";
  const field = { price: "price", boxes: "boxes", "kg per box": "kgPerBox", weight: "kgPerBox", amount: "amount" }[m[1]] || "labour";
  const row = latestRow(resource, crop);
  if (!row) return { error: `I could not find a ${resource.slice(0, -1)} to change.` };
  return proposal({ kind: "update", resource, recordId: row._id, data: { [field]: Number(m[2]) }, before: { [field]: row[field] ?? "empty" },
    summary: `Change ${field} of your latest ${resource.slice(0, -1)}${row.crop ? ` (${row.crop})` : ""} to ${m[2]}` });
}

function deleteProposal(text) {
  const lower = text.toLowerCase();
  const word = ["harvest", "expense", "sale", "note", "fertilizer"].find((w) => lower.includes(w));
  if (!word) return null;
  const resource = word + "s";
  const row = latestRow(resource, CROPS.find((c) => lower.includes(c.toLowerCase())));
  if (!row) return { error: `You have no ${resource} to delete.` };
  const what = resource === "harvests" ? `${row.crop || ""} harvest of ${row.boxes} boxes` : resource === "notes" ? `note "${String(row.text).slice(0, 40)}"` : `latest ${word}`;
  return proposal({ kind: "delete", resource, recordId: row._id, summary: `Delete your ${what} (${String(row.date || row.createdAt).slice(0, 10)})` });
}

const DISEASES = [
  [/yellow/, "Yellow leaves often mean low nitrogen, too much water, or root trouble. Check drainage, water less if the soil is soggy, and add compost or a split dose of nitrogen as per the product label. If new leaves are yellow with green veins, it may be iron or zinc shortage."],
  [/blight|brown spot|dark spot|ring/, "Brown spots with rings, especially on lower leaves, look like early blight. Remove affected leaves, avoid wetting leaves when watering, give space for airflow, and use a fungicide only as per the label."],
  [/caterpillar|worm|hole|bored|borer/, "Holes in leaves or fruit point to caterpillars or fruit borers. Hand-pick larvae, set pheromone traps, and use neem oil or a label-approved bio-pesticide. Check the field every two days."],
  [/aphid|whitefly|white fly|sticky|curl/, "Curling leaves or a sticky film often means aphids, whiteflies or other sucking pests. Spray neem oil, use yellow sticky traps, and remove heavily infested leaves."],
  [/wilt|droop|collapse/, "Sudden wilting may be bacterial or fungal wilt, or water stress. Check soil moisture first. If the plant stays wilted when the soil is moist, remove it and avoid replanting the same crop there."],
  [/powder|white patch|mildew/, "White powdery patches are powdery mildew. Improve airflow, avoid overhead watering, remove badly affected leaves, and use a sulphur or label-approved fungicide."],
];

function weatherTip(daily) {
  const rainy = daily.some((d) => d.rainChance >= 60 || d.rainMm >= 10);
  return rainy ? "Tip: rain looks likely, so delay spraying and fertilizer." : "Tip: dry spell ahead, so plan irrigation if the soil is drying.";
}

async function weatherText(place) {
  try {
    const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`)).json();
    const spot = geo.results && geo.results[0];
    if (!spot) return `I could not find a place called "${place}".`;
    const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${spot.latitude}&longitude=${spot.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=3`)).json();
    const daily = f.daily.time.map((date, i) => ({ date, max: f.daily.temperature_2m_max[i], min: f.daily.temperature_2m_min[i], rainChance: f.daily.precipitation_probability_max[i], rainMm: f.daily.precipitation_sum[i] }));
    const name = [spot.name, spot.admin1].filter(Boolean).join(", ");
    return `Weather in ${name}: ${f.current.temperature_2m}°C now, humidity ${f.current.relative_humidity_2m}%, wind ${f.current.wind_speed_10m} km/h.\n` +
      daily.map((d) => `${d.date}: ${d.min}–${d.max}°C, rain chance ${d.rainChance}% (${d.rainMm} mm)`).join("\n") + "\n" + weatherTip(daily);
  } catch {
    return "I could not reach the weather service. Please check your internet connection.";
  }
}

function placeFrom(text) {
  const m = text.replace(/[?.!]+$/, "").replace(/\b(today|tomorrow|now|please)\b/gi, "").trim().match(/\b(?:in|at|for|near)\s+([A-Za-z\u0B80-\u0BFF][A-Za-z\u0B80-\u0BFF .'-]{1,40})$/i);
  if (m && !/^(my|the)\s+(farm|field)/i.test(m[1].trim())) return m[1].trim();
  const farm = db().farms.find((f) => f.location);
  return farm ? farm.location : "";
}


// General questions without the server: a short answer from Wikipedia (English, or Tamil if you write in Tamil).
async function research(text) {
  const host = /[\u0B80-\u0BFF]/.test(text) ? "ta" : "en";
  const query = text.replace(/[?!.]+$/g, "").replace(/^(what is|what are|what's|who is|who was|tell me about|explain|define|meaning of|how does|why is|why do|how to)\s+/i, "").slice(0, 120);
  try {
    const found = await (await fetch(`https://${host}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`)).json();
    const hit = found.query && found.query.search && found.query.search[0];
    if (!hit) return null;
    const page = await (await fetch(`https://${host}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`)).json();
    if (!page.extract) return null;
    const extract = page.extract.length > 700 ? page.extract.slice(0, 700).replace(/\s+\S*$/, "") + "…" : page.extract;
    const uri = (page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page) || `https://${host}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`;
    return { text: extract, sources: [{ title: "Wikipedia: " + page.title, uri }] };
  } catch {
    return null;
  }
}

async function chat(body) {
  const last = [...(body.messages || [])].reverse().find((m) => m.role === "user");
  const text = String((last && last.text) || "").trim().slice(0, 500);
  if (!text) throw new Error("Type a question");
  const lower = text.toLowerCase(), D = db();
  const reply = (message, proposals = [], sources = []) => ({ reply: message, proposals, sources });

  if (/weather|forecast|temperature|climate|\brain(?:fall)?\b.*\b(?:today|tomorrow|tonight|week|chance|expect|will)\b|\b(?:will|is)\b.*\brain\b/.test(lower)) {
    const place = placeFrom(text);
    return reply(place ? await weatherText(place) : 'Which place? For example: "weather in Madurai". (Tip: save a location on your farm and I will use it.)');
  }
  if (/\b(delete|remove)\b/.test(lower)) {
    const p = deleteProposal(text);
    if (p && p.error) return reply(p.error);
    if (p) return reply("I have prepared this deletion. Please check it and confirm.", [p]);
  }
  if (/\b(change|update|edit|correct|set)\b/.test(lower)) {
    const p = editProposal(text);
    if (p && p.error) return reply(p.error);
    if (p) return reply("I have prepared this change. Please check it and confirm.", [p]);
  }
  if (/\b(add|record|log|create|enter|harvested|gave|applied|spent|sold|watered|bought)\b/.test(lower)) {
    const list = addProposals(text);
    if (list.length) return reply(`I found ${list.length} thing${list.length > 1 ? "s" : ""} to save. Please check and confirm.`, list);
  }
  if (/price|rate|market|mandi/.test(lower)) {
    return reply("Live market prices need the CropMate server with a price source connected. Meanwhile, you can record your own selling prices under Sales or Harvest.");
  }
  const disease = DISEASES.find(([re]) => re.test(lower));
  if (disease) return reply(disease[1] + "\nFor a photo check, open Crop Doctor. Always follow product labels and ask a local agriculture officer.");

  const revenue = D.harvests.reduce((s, h) => s + num(h.boxes) * num(h.kgPerBox) * num(h.price), 0);
  const costs = D.harvests.reduce((s, h) => s + num(h.labour) + num(h.transport) + num(h.other), 0) + D.expenses.reduce((s, e) => s + num(e.amount), 0) + D.labour.reduce((s, l) => s + num(l.payment), 0);
  if (/profit|earn/.test(lower)) return reply(`Your profit so far is ${rupees(revenue - costs)} (revenue ${rupees(revenue)}, expenses ${rupees(costs)}).`);
  if (/expense|spent|cost/.test(lower)) return reply(`Your recorded expenses total ${rupees(costs)}.`);
  if (/(show|list|last|recent).*harvest|harvest.*(list|history)/.test(lower)) {
    const rows = [...D.harvests].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    return reply(rows.length ? "Your latest harvests:\n" + rows.map((h) => `${String(h.date).slice(0, 10)}: ${h.crop || "-"}, ${h.boxes} boxes × ${h.kgPerBox} kg, ${rupees(num(h.boxes) * num(h.kgPerBox) * num(h.price))}`).join("\n") : "You have no harvests yet.");
  }
  if (/box|harvest|yield|production/.test(lower)) return reply(`You have recorded ${D.harvests.reduce((s, h) => s + num(h.boxes), 0)} boxes across ${D.harvests.length} harvests.`);

  if (text.length > 3) {
    const found = await research(text);
    if (found) return reply(found.text, [], found.sources);
  }
  return reply('I can answer about your profit, expenses and harvests, check the weather ("weather in Madurai"), give plant problem tips, and add or change records ("add harvest 12 boxes tomato 20kg"). For full AI chat, web research and live prices, run the CropMate server.');
}

// ---------- the one function the app calls ----------
const NEEDS_SERVER = "This feature needs the CropMate server with an AI key. See the README to run the backend.";

async function handle(path, { method = "GET", body = {} } = {}) {
  const url = new URL(path, "http://local");
  const [first, second] = url.pathname.split("/").filter(Boolean);
  const query = Object.fromEntries(url.searchParams);

  if (first === "auth" && second === "me") {
    const stored = (() => { try { return JSON.parse(localStorage.getItem(USER_KEY)) || {}; } catch { return {}; } })();
    if (method === "PUT") {
      stored.name = String(body.name || "Farmer").slice(0, 80);
      try { localStorage.setItem(USER_KEY, JSON.stringify(stored)); } catch { /* ignore */ }
    }
    if (method === "DELETE") { reset(); return { ok: true }; }
    return { user: { id: "local", name: stored.name || "Farmer", email: "Saved on this device" } };
  }
  if (first === "all" || first === "export") return copy(everything());
  if (first === "analytics") return analytics(query);
  if (first === "predict") return predict(query.crop);

  if (first === "ai") {
    if (second === "chat") return chat(body);
    if (second === "structure") return { data: parseNote(String(body.text || "")), source: "rules" };
    if (second === "assistant") return { answer: assistant(String(body.q || "")) };
    throw new Error(NEEDS_SERVER);
  }
  if (first === "notes" && second === "convert") return copy(convertNote(body));

  if (RESOURCES.includes(first)) {
    const name = first;
    if (!second) {
      if (method === "POST") return copy(decorate(name, insert(name, castBody(body))));
      return copy(list(name, query));
    }
    const rows = db()[name];
    const index = rows.findIndex((r) => r._id === second);
    if (index < 0) throw new Error("Not found");
    if (method === "DELETE") { rows.splice(index, 1); save(); return { ok: true }; }
    if (method === "PUT") { rows[index] = { ...rows[index], ...castBody(body) }; save(); }
    return copy(decorate(name, rows[index]));
  }
  throw new Error("Not found");
}

const localApi = { handle, reset };
CM.localApi = { localApi };
})();
