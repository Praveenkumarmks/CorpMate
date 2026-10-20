const mongoose = require("mongoose");
const { userField, sourceNoteField, locationFields, schemaOptions } = require("./base");

const CATEGORIES = ["Seeds", "Fertilizer", "Pesticides", "Labour", "Transportation", "Water", "Electricity", "Equipment", "Maintenance", "Other"];

const expenseSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    category: { type: String, required: true, enum: CATEGORIES },
    amount: { type: Number, required: true, min: 0 },
    description: String,
    sourceNote: sourceNoteField,
  },
  schemaOptions
);

module.exports = mongoose.model("Expense", expenseSchema);
