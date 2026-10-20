const mongoose = require("mongoose");
const { userField, locationFields, schemaOptions } = require("./base");

const pestRecordSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    pest: { type: String, required: true, trim: true },
    severity: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    action: String,
    product: String,
  },
  schemaOptions
);

module.exports = mongoose.model("PestRecord", pestRecordSchema);
