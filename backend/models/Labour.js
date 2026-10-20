const mongoose = require("mongoose");
const { userField, sourceNoteField, locationFields, schemaOptions } = require("./base");

const labourSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    worker: { type: String, required: true, trim: true },
    workType: String,
    hours: Number,
    payment: Number,
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
    sourceNote: sourceNoteField,
  },
  schemaOptions
);

module.exports = mongoose.model("Labour", labourSchema);
