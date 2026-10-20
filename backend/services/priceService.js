// Daily mandi prices from the Government of India open data portal (Agmarknet).
// Needs a free API key from data.gov.in, set as DATA_GOV_API_KEY. Without it, no live prices are available.
const env = require("../config/env");

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"; // "Current daily price of various commodities from various markets (Mandi)"
const COMMODITY_NAMES = { chilli: "Green Chilli", chili: "Green Chilli" }; // the portal's own spelling

async function getMandiPrices({ commodity, state, market }) {
  if (!env.dataGovApiKey) return { available: false, reason: "No live price source is connected on this server (DATA_GOV_API_KEY is not set)." };

  const name = COMMODITY_NAMES[String(commodity || "").toLowerCase()] || commodity;
  const params = new URLSearchParams({ "api-key": env.dataGovApiKey, format: "json", limit: "10" });
  params.set("filters[commodity]", name);
  if (state) params.set("filters[state]", state);
  if (market) params.set("filters[market]", market);

  try {
    const response = await fetch(`https://api.data.gov.in/resource/${RESOURCE_ID}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { available: false, reason: `The price service returned an error (${response.status}).` };
    const data = await response.json();
    const rows = (data.records || []).map((r) => ({
      market: r.market, district: r.district, state: r.state, variety: r.variety, date: r.arrival_date,
      minPerKg: Number(r.min_price) / 100, maxPerKg: Number(r.max_price) / 100, modalPerKg: Number(r.modal_price) / 100, // the portal reports ₹ per quintal
    }));
    if (!rows.length) return { available: true, rows: [], note: "No recent prices found for that crop and place." };
    return { available: true, rows, note: "Prices are ₹ per kg, converted from ₹ per quintal. Source: Agmarknet, data.gov.in" };
  } catch (error) {
    return { available: false, reason: "Could not reach the price service." };
  }
}

module.exports = { getMandiPrices };
