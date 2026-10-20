const env = require("../config/env");
const AppError = require("../utils/AppError");

const isConfigured = () => Boolean(env.gemini.apiKey);

// Sends a request to Google Gemini and returns the full response (needed for tool calls).
async function generateContent(payload) {
  if (!isConfigured()) throw new AppError("AI is not set up on the server yet (GEMINI_API_KEY is missing)", 503);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.gemini.apiKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new AppError(`The AI service returned an error (${response.status})`, 502);

  return response.json();
}

// Sends a request to Google Gemini and returns only the plain text answer.
async function generate(payload) {
  const data = await generateContent(payload);
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("");
}

// Reads JSON from an AI answer, even if the model wrapped it in a code block.
function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/^```json|```$/g, "").trim());
  } catch {
    throw new AppError("The AI answer could not be read. Please try again", 502);
  }
}

module.exports = { isConfigured, generate, generateContent, parseJSON };
