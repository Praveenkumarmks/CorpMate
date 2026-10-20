const { Harvest, Expense, Labour, Fertilizer, Pesticide, Sale, Crop } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

const num = (value) => Number(value) || 0;
const monthKey = (date) => new Date(date).toISOString().slice(0, 7); // "2026-10"

// GET /api/analytics?crop=&farm=&from=&to=
const getAnalytics = asyncHandler(async (req, res) => {
  const { crop, farm, from, to } = req.query;

  const filter = { user: req.userId };
  if (crop) filter.crop = String(crop);
  if (farm) filter.farm = String(farm);
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [harvests, expenses, labour, fertilizers, pesticides, sales, crops] = await Promise.all([
    Harvest.find(filter).lean(),
    Expense.find(filter).lean(),
    Labour.find(filter).lean(),
    Fertilizer.find(filter).lean(),
    Pesticide.find(filter).lean(),
    Sale.find(filter).lean(),
    Crop.find({ user: req.userId, ...(crop && { crop: String(crop) }), ...(farm && { farm: String(farm) }) }).lean(),
  ]);

  const byCrop = {};
  const byMonth = {};
  const categories = {};
  const totals = { boxes: 0, kg: 0, revenue: 0, expenses: 0 };

  const cropRow = (name) => (byCrop[name || "Other"] ??= { crop: name || "Other", boxes: 0, kg: 0, revenue: 0, expenses: 0 });
  const monthRow = (date) => (byMonth[monthKey(date)] ??= { month: monthKey(date), revenue: 0, expenses: 0 });

  for (const h of harvests) {
    const kg = num(h.boxes) * num(h.kgPerBox);
    const revenue = kg * num(h.price);
    const cost = num(h.labour) + num(h.transport) + num(h.other);

    const row = cropRow(h.crop);
    row.boxes += num(h.boxes);
    row.kg += kg;
    row.revenue += revenue;
    row.expenses += cost;

    monthRow(h.date).revenue += revenue;
    monthRow(h.date).expenses += cost;
    categories["Harvest costs"] = (categories["Harvest costs"] || 0) + cost;
    totals.boxes += num(h.boxes);
    totals.kg += kg;
    totals.revenue += revenue;
    totals.expenses += cost;
  }

  // Adds a list of cost records (expenses, labour, fertilizer, pesticide) to the totals.
  const addCosts = (records, categoryOf, amountOf) => {
    for (const record of records) {
      const amount = num(amountOf(record));
      const category = categoryOf(record);
      categories[category] = (categories[category] || 0) + amount;
      cropRow(record.crop).expenses += amount;
      monthRow(record.date).expenses += amount;
      totals.expenses += amount;
    }
  };
  addCosts(expenses, (e) => e.category || "Other", (e) => e.amount);
  addCosts(labour, () => "Labour", (l) => l.payment);
  addCosts(fertilizers, () => "Fertilizer", (f) => f.cost);
  addCosts(pesticides, () => "Pesticides", (p) => p.cost);

  const acres = crops.reduce((sum, c) => sum + num(c.area), 0);

  res.json({
    totals: {
      ...totals,
      profit: totals.revenue - totals.expenses,
      salesTotal: sales.reduce((sum, s) => sum + num(s.quantity) * num(s.price), 0),
      yieldPerAcre: acres ? Math.round(totals.kg / acres) : null,
    },
    byCrop: Object.values(byCrop).map((row) => ({ ...row, profit: row.revenue - row.expenses })),
    monthly: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    expenseCategories: Object.entries(categories).map(([category, amount]) => ({ category, amount })),
  });
});

module.exports = { getAnalytics };
