const mongoose = require("mongoose");
const { userField, sourceNoteField, locationFields, schemaOptions } = require("./base");

const pesticideSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    name: { type: String, required: true, trim: true },
    quantity: Number,
    unit: String,
    pest: String,
    purpose: String,
    cost: Number,
    sourceNote: sourceNoteField,
  },
  schemaOptions
);

module.exports = mongoose.model("Pesticide", pesticideSchema);
