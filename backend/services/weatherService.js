// Weather from Open-Meteo (free, no API key). Finds the place, then reads the forecast.
const AppError = require("../utils/AppError");

const DESCRIPTIONS = [
  [0, "clear sky"], [1, "mostly clear"], [2, "partly cloudy"], [3, "overcast"], [45, "fog"], [48, "fog"],
  [51, "light drizzle"], [53, "drizzle"], [55, "heavy drizzle"], [61, "light rain"], [63, "rain"], [65, "heavy rain"],
  [71, "snow"], [80, "rain showers"], [81, "heavy rain showers"], [82, "violent rain showers"],
  [95, "thunderstorm"], [96, "thunderstorm with hail"], [99, "severe thunderstorm with hail"],
];

// Weather codes are numbers. Use the closest known code at or below the given one.
function describe(code) {
  let text = "unknown";
  for (const [known, label] of DESCRIPTIONS) if (code >= known) text = label;
  return text;
}

async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new AppError("The weather service is not answering right now", 502);
  return response.json();
}

async function getWeather(place, days = 3) {
  const geo = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`);
  const spot = geo.results && geo.results[0];
  if (!spot) return { found: false, place };

  const count = Math.min(7, Math.max(1, Number(days) || 3));
  const forecast = await getJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${spot.latitude}&longitude=${spot.longitude}` +
      "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max" +
      `&timezone=auto&forecast_days=${count}`
  );

  return {
    found: true,
    place: [spot.name, spot.admin1, spot.country].filter(Boolean).join(", "),
    current: {
      tempC: forecast.current.temperature_2m,
      humidityPercent: forecast.current.relative_humidity_2m,
      rainMm: forecast.current.precipitation,
      windKmh: forecast.current.wind_speed_10m,
      summary: describe(forecast.current.weather_code),
    },
    daily: forecast.daily.time.map((date, i) => ({
      date,
      maxC: forecast.daily.temperature_2m_max[i],
      minC: forecast.daily.temperature_2m_min[i],
      rainChancePercent: forecast.daily.precipitation_probability_max[i],
      rainMm: forecast.daily.precipitation_sum[i],
      summary: describe(forecast.daily.weather_code[i]),
    })),
  };
}

module.exports = { getWeather };
