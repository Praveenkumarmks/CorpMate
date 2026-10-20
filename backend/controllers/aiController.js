const gemini = require("../services/geminiService");
const { parseNoteWithRules, cleanAIResult } = require("../services/noteParser");
const { buildSummary } = require("../services/farmSummary");
const assistantTools = require("../services/assistantTools");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const inr = (value) => "₹" + Math.round(value).toLocaleString("en-IN");

// POST /api/ai/structure  { text }
// Extracts crop, boxes, fertilizer, costs... from a note. Falls back to built-in rules if AI is off or fails.
const structureNote = asyncHandler(async (req, res) => {
  const text = String(req.body.text || "").slice(0, 3000);
  if (!text.trim()) throw new AppError("Write or speak a note first");

  if (gemini.isConfigured()) {
    try {
      const answer = await gemini.generate({
        systemInstruction: {
          parts: [{
            text:
              "You extract farm records from a farmer's note (English or Tamil). Return only JSON with these optional keys: " +
              "crop (English name), boxes, kgPerBox, totalKg, fertilizer, fertilizerKg, labourCost (rupees), otherCosts (rupees), " +
              "irrigationHours, pricePerKg. Leave out anything that is not stated. Never guess numbers.",
          }],
        },
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      });
      const data = cleanAIResult(gemini.parseJSON(answer));
      if (data.boxes && data.kgPerBox && !data.totalKg) data.totalKg = data.boxes * data.kgPerBox;
      return res.json({ data, source: "ai" });
    } catch (err) {
      console.error("AI structuring failed, using rules instead:", err.message);
    }
  }
  res.json({ data: parseNoteWithRules(text), source: "rules" });
});

// POST /api/ai/doctor  { image (base64), mime }
const diagnoseCrop = asyncHandler(async (req, res) => {
  const mime = String(req.body.mime || "");
  const image = String(req.body.image || "");
  if (!IMAGE_TYPES.includes(mime) || image.length < 100) throw new AppError("Please upload a JPG, PNG or WebP photo");

  const answer = await gemini.generate({
    systemInstruction: {
      parts: [{
        text:
          "You are CropMate Crop Doctor, an agronomy assistant. Look at the crop photo and return only JSON: " +
          '{"name": most likely problem or "Healthy", "confidence": integer 0-100, "symptoms": [up to 4 short strings you can see], ' +
          '"recommendations": [up to 5 short practical steps]}. Suggest low-risk, cultural steps first. Do not give chemical doses; ' +
          "tell the farmer to follow the product label and ask a local agriculture officer. If the photo is unclear, say so and lower the confidence.",
      }],
    },
    contents: [{ parts: [
      { inline_data: { mime_type: mime, data: image } },
      { text: String(req.body.prompt || "Identify the leaf problem, pest damage or nutrient deficiency.").slice(0, 300) },
    ] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  const result = gemini.parseJSON(answer);
  const list = (value) => (Array.isArray(value) ? value : []).slice(0, 6).map((item) => String(item).slice(0, 200));
  res.json({
    name: String(result.name || "Unclear").slice(0, 80),
    confidence: Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 0))),
    symptoms: list(result.symptoms),
    recommendations: list(result.recommendations),
  });
});

// POST /api/ai/assistant  { q }
const askAssistant = asyncHandler(async (req, res) => {
  const question = String(req.body.q || "").slice(0, 500);
  if (!question.trim()) throw new AppError("Type a question");

  const summary = await buildSummary(req.userId);

  if (gemini.isConfigured()) {
    try {
      const answer = await gemini.generate({
        systemInstruction: {
          parts: [{
            text:
              "You are CropMate Assistant for a farmer. Answer briefly in simple words, in the same language as the question (Tamil or English). " +
              "Use ONLY the farm data below for any numbers; if the data is missing, say so. Give careful general farming guidance and never give " +
              "pesticide or fertilizer doses beyond what a product label says. Farm data: " + JSON.stringify(summary),
          }],
        },
        contents: [{ parts: [{ text: question }] }],
        generationConfig: { temperature: 0.4 },
      });
      return res.json({ answer: answer.trim() });
    } catch (err) {
      console.error("Assistant AI failed, using basic answers:", err.message);
    }
  }

  // Basic answers when AI is off.
  const q = question.toLowerCase();
  let answer = "AI answers are switched off on this server. I can still tell you your profit, boxes and harvests.";
  if (/profit|earn/.test(q)) {
    answer = `Your profit so far is ${inr(summary.profit)} (revenue ${inr(summary.revenue)}, expenses ${inr(summary.expenses)}).`;
  } else if (/box|harvest|yield/.test(q)) {
    answer = `You have recorded ${summary.boxes} boxes (${summary.kg} kg) across ${summary.harvests} harvests.`;
  }
  res.json({ answer });
});

// POST /api/ai/market  { crop, location? }
// The AI has no live market data, so this is only a rough estimate.
const marketPrice = asyncHandler(async (req, res) => {
  const crop = String(req.body.crop || "").slice(0, 40);
  const location = String(req.body.location || "").slice(0, 60);
  if (!crop) throw new AppError("Choose a crop");

  const answer = await gemini.generate({
    systemInstruction: {
      parts: [{
        text:
          "You give a rough typical market price range for Indian farm produce. You do NOT have live data, so say clearly that this is an " +
          "estimate and the farmer must confirm at the local market. Keep it to 3 short lines: price range per kg or box, likely trend, one selling tip.",
      }],
    },
    contents: [{ parts: [{ text: `Typical market price for ${crop}${location ? " near " + location : ""}?` }] }],
    generationConfig: { temperature: 0.3 },
  });
  res.json({ text: answer.trim() });
});


// POST /api/ai/chat  { messages: [{ role: "user" | "assistant", text }] }
// The assistant can read farm data, weather and prices, research the web, and PROPOSE changes.
// It never saves anything itself: proposals come back to the app, and the farmer confirms them.
const MAX_STEPS = 6;

const chat = asyncHandler(async (req, res) => {
  const history = (Array.isArray(req.body.messages) ? req.body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .slice(-14);
  const contents = history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text.slice(0, 1500) }] }));
  if (!contents.length || contents[contents.length - 1].role !== "user") throw new AppError("Type a question");

  if (!gemini.isConfigured()) {
    return res.json({ reply: "The AI assistant needs a Gemini key on the server. Add GEMINI_API_KEY to backend/.env and restart.", proposals: [] });
  }

  const context = { userId: req.userId, proposals: [], sources: [] };
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const data = await gemini.generateContent({
      systemInstruction: { parts: [{ text: assistantTools.systemPrompt() }] },
      contents,
      tools: [{ functionDeclarations: assistantTools.declarations }],
      generationConfig: { temperature: 0.3 },
    });

    const content = data.candidates?.[0]?.content;
    const parts = (content && content.parts) || [];
    const calls = parts.filter((part) => part.functionCall);

    if (!calls.length) {
      reply = parts.map((part) => part.text || "").join("").trim();
      break;
    }

    // The AI asked to use tools: run them, give it the results, and let it continue.
    contents.push(content);
    const answers = [];
    for (const part of calls) {
      const { name, args } = part.functionCall;
      let result;
      try {
        result = await assistantTools.runTool(name, args || {}, context);
      } catch (error) {
        result = { error: error.message };
      }
      answers.push({ functionResponse: { name, response: { result } } });
    }
    contents.push({ role: "user", parts: answers });
  }

  res.json({ reply: reply || "Sorry, I could not finish that. Please try again.", proposals: context.proposals, sources: context.sources });
});

module.exports = { structureNote, diagnoseCrop, askAssistant, marketPrice, chat };
