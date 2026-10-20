const mongoose = require("mongoose");
const { userField, schemaOptions } = require("./base");

const fieldSchema = new mongoose.Schema(
  {
    user: userField,
    farm: String,
    name: { type: String, required: true, trim: true },
    area: Number,
    soil: String,
    notes: String,
  },
  schemaOptions
);

module.exports = mongoose.model("Field", fieldSchema);
