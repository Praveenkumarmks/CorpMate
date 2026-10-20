const mongoose = require("mongoose");
const { userField, schemaOptions } = require("./base");

const farmSchema = new mongoose.Schema(
  {
    user: userField,
    name: { type: String, required: true, trim: true },
    location: String,
    area: Number, // acres
    soil: String,
    notes: String,
  },
  schemaOptions
);

module.exports = mongoose.model("Farm", farmSchema);
