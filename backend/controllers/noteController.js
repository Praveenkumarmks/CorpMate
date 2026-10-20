const { Note, Harvest, Fertilizer, Irrigation, Expense } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

// Turns a note into farm records. The original note is never deleted.
//
// Body: { data, noteId?, text?, crop?, lang? }
//   data   = the reviewed values, e.g. { crop, boxes, kgPerBox, fertilizer, fertilizerKg, labourCost, ... }
//   noteId = convert a note that is already saved
//   text   = or save this text as a new note first
const convertNote = asyncHandler(async (req, res) => {
  const { data = {}, noteId, text, lang } = req.body;
  const user = req.userId;

  let note = null;
  if (noteId) note = await Note.findOne({ _id: noteId, user });
  else if (text) note = await Note.create({ user, text: String(text).slice(0, 5000), crop: req.body.crop, lang });

  const sourceNote = note && note._id;
  const crop = data.crop || req.body.crop;
  const created = {};

  if (data.boxes) {
    // Labour and other costs go into the harvest itself, so they are never counted twice.
    created.harvest = await Harvest.create({
      user, crop, sourceNote,
      boxes: data.boxes,
      kgPerBox: data.kgPerBox || 0,
      price: data.pricePerKg || 0,
      labour: data.labourCost || 0,
      other: data.otherCosts || 0,
    });
  } else if (data.labourCost) {
    created.expense = await Expense.create({ user, crop, sourceNote, category: "Labour", amount: data.labourCost, description: "From note" });
  }

  if (data.fertilizer) {
    created.fertilizer = await Fertilizer.create({ user, crop, sourceNote, name: data.fertilizer, quantity: data.fertilizerKg, unit: "kg" });
  }
  if (data.irrigationHours) {
    created.irrigation = await Irrigation.create({ user, crop, sourceNote, hours: data.irrigationHours });
  }

  if (note) {
    note.converted = true;
    await note.save();
  }
  res.status(201).json({ note, created });
});

module.exports = { convertNote };
