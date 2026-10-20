const mongoose = require("mongoose");
const { userField, schemaOptions } = require("./base");

const STAGES = ["Planned", "Planted", "Growing", "Flowering", "Fruiting", "Harvesting", "Completed"];

const cropSchema = new mongoose.Schema(
  {
    user: userField,
    crop: { type: String, required: true, trim: true },
    farm: String,
    field: String,
    area: Number,
    plantingDate: Date,
    plants: Number,
    seed: String,
    stage: { type: String, enum: STAGES, default: "Planned" },
    expectedHarvest: Date,
    notes: String,
  },
  schemaOptions
);

module.exports = mongoose.model("Crop", cropSchema);
