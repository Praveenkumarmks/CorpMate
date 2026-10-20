const { Harvest, Expense, Labour, Note } = require("../models");

const num = (value) => Number(value) || 0;

// A short summary of the farmer's data. The AI assistant answers questions from this.
async function buildSummary(userId) {
  const [harvests, expenses, labour, notes] = await Promise.all([
    Harvest.find({ user: userId }).sort({ date: -1 }).limit(30).lean(),
    Expense.find({ user: userId }).lean(),
    Labour.find({ user: userId }).lean(),
    Note.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const revenue = harvests.reduce((sum, h) => sum + num(h.boxes) * num(h.kgPerBox) * num(h.price), 0);
  const harvestCosts = harvests.reduce((sum, h) => sum + num(h.labour) + num(h.transport) + num(h.other), 0);
  const expenses_ = expenses.reduce((sum, e) => sum + num(e.amount), 0);
  const labourPaid = labour.reduce((sum, l) => sum + num(l.payment), 0);
  const totalExpenses = harvestCosts + expenses_ + labourPaid;

  return {
    harvests: harvests.length,
    boxes: harvests.reduce((sum, h) => sum + num(h.boxes), 0),
    kg: harvests.reduce((sum, h) => sum + num(h.boxes) * num(h.kgPerBox), 0),
    revenue,
    expenses: totalExpenses,
    profit: revenue - totalExpenses,
    recentHarvests: harvests.slice(0, 5).map((h) => ({ crop: h.crop, date: h.date, boxes: h.boxes, kgPerBox: h.kgPerBox, price: h.price })),
    recentNotes: notes.map((n) => n.text.slice(0, 160)),
  };
}

module.exports = { buildSummary };
