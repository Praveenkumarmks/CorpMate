// Reads a farming note and pulls out the numbers. Works without AI.
// Example: "12 boxes tomato, each box 20kg, urea 5kg, labour 800"

const CROPS = ["Tomato", "Chilli", "Banana", "Coconut", "Onion"];
const TAMIL_CROPS = { "தக்காளி": "Tomato", "மிளகாய்": "Chilli", "வாழை": "Banana" };
const FERTILIZERS = "urea|dap|potash|npk|compost";

const toNumber = (text) => Number(String(text).replace(/,/g, ""));
const capitalize = (word) => word[0].toUpperCase() + word.slice(1).toLowerCase();

function parseNoteWithRules(input) {
  const text = input.replace(/பெட்டி/g, "box"); // Tamil word for "box"
  const result = {};

  for (const [tamil, english] of Object.entries(TAMIL_CROPS)) {
    if (text.includes(tamil)) result.crop = english;
  }
  const crop = CROPS.find((name) => new RegExp(name, "i").test(text));
  if (crop) result.crop = crop;

  const boxes = text.match(/(\d+(?:\.\d+)?)\s*box/i) || text.match(/box(?:es)?\D{0,6}(\d+)/i);
  if (boxes) result.boxes = toNumber(boxes[1]);

  const kgPerBox =
    text.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:per|each|a)\s*box/i) || text.match(/box[^.]{0,20}?(\d+(?:\.\d+)?)\s*kg/i);
  if (kgPerBox) result.kgPerBox = toNumber(kgPerBox[1]);
  if (result.boxes && result.kgPerBox) result.totalKg = result.boxes * result.kgPerBox;

  const fertNameFirst = text.match(new RegExp(`(${FERTILIZERS})\\D{0,20}?(\\d+(?:\\.\\d+)?)\\s*(kg|g)`, "i"));
  const fertAmountFirst = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(kg|g)\\s*(?:of\\s*)?(${FERTILIZERS})`, "i"));
  if (fertNameFirst) {
    result.fertilizer = capitalize(fertNameFirst[1]);
    result.fertilizerKg = toNumber(fertNameFirst[2]);
  } else if (fertAmountFirst) {
    result.fertilizer = capitalize(fertAmountFirst[3]);
    result.fertilizerKg = toNumber(fertAmountFirst[1]);
  }

  const labour = text.match(/labou?r\D{0,12}?(\d[\d,]*)/i);
  if (labour) result.labourCost = toNumber(labour[1]);

  const other = text.match(/(?:transport\w*|other)\D{0,12}?(\d[\d,]*)/i);
  if (other) result.otherCosts = toNumber(other[1]);

  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (hours && /water|irrigat/i.test(text)) result.irrigationHours = toNumber(hours[1]);

  const price =
    text.match(/(?:price|rate|at|@)\s*(?:of\s*)?(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:rupees?|rs)?\s*(?:\/|per|a)\s*kg/i) ||
    text.match(/(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:₹|rupees?|rs\.?)\s*(?:\/|per|a)\s*kg/i) ||
    text.match(/(?:₹|rs\.?\s*)(\d+(?:\.\d+)?)\s*(?:\/|per)\s*kg/i);
  if (price) result.pricePerKg = toNumber(price[1]);

  return result;
}

const NUMBER_KEYS = ["boxes", "kgPerBox", "totalKg", "fertilizerKg", "labourCost", "otherCosts", "irrigationHours", "pricePerKg"];

// Keeps only the expected keys from an AI answer and makes sure numbers are numbers.
function cleanAIResult(raw) {
  const result = {};
  if (typeof raw.crop === "string") result.crop = raw.crop.slice(0, 40);
  if (typeof raw.fertilizer === "string" && raw.fertilizer) result.fertilizer = raw.fertilizer.slice(0, 40);
  for (const key of NUMBER_KEYS) {
    if (raw[key] !== null && raw[key] !== "" && raw[key] !== undefined && Number.isFinite(Number(raw[key]))) {
      result[key] = Number(raw[key]);
    }
  }
  return result;
}

module.exports = { parseNoteWithRules, cleanAIResult };
