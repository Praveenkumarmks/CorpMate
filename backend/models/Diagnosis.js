const mongoose = require("mongoose");
const { userField, schemaOptions } = require("./base");

const diagnosisSchema = new mongoose.Schema(
  {
    user: userField,
    crop: String,
    name: { type: String, required: true },
    confidence: Number, // 0 to 100
    symptoms: [String],
    recommendations: [String],
    date: { type: Date, default: Date.now },
    notes: String,
  },
  schemaOptions
);

module.exports = mongoose.model("Diagnosis", diagnosisSchema);
