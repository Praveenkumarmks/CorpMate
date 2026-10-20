const { Harvest } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

const num = (value) => Number(value) || 0;
const average = (list) => list.reduce((sum, v) => sum + v, 0) / list.length;
const DAY = 24 * 60 * 60 * 1000;

// GET /api/predict?crop=Tomato
// A simple estimate from the last few harvests: average size, +/- a band, and the usual gap between harvests.
const getPrediction = asyncHandler(async (req, res) => {
  const crop = String(req.query.crop || "");
  const harvests = await Harvest.find({ user: req.userId, ...(crop && { crop }) }).sort({ date: 1 }).lean();

  if (harvests.length < 2) return res.json({ ok: false, samples: harvests.length });

  const recent = harvests.slice(-5);
  const boxes = average(recent.map((h) => num(h.boxes)));
  const kgPerBox = average(recent.map((h) => num(h.kgPerBox)));
  const prices = recent.map((h) => num(h.price)).filter(Boolean);
  const price = prices.length ? average(prices) : 0;

  const gaps = harvests
    .slice(-6)
    .map((h, i, list) => (i === 0 ? null : (new Date(h.date) - new Date(list[i - 1].date)) / DAY))
    .filter((gap) => gap && gap > 0);
  const gapDays = gaps.length ? Math.round(average(gaps)) : null;
  const lastDate = new Date(harvests[harvests.length - 1].date);

  const band = (value) => [Math.round(value * 0.95), Math.round(value * 1.15)];

  const seasonal = {};
  for (const h of harvests) {
    const month = new Date(h.date).toISOString().slice(0, 7);
    seasonal[month] = (seasonal[month] || 0) + num(h.boxes);
  }

  res.json({
    ok: true,
    samples: harvests.length,
    boxes: band(boxes),
    kg: band(boxes * kgPerBox),
    revenue: band(boxes * kgPerBox * price),
    avgIntervalDays: gapDays,
    nextDate: gapDays ? new Date(+lastDate + gapDays * DAY).toISOString().slice(0, 10) : null,
    seasonal,
    disclaimer: "Predictions are estimates based on available farm data and historical records.",
  });
});

module.exports = { getPrediction };
