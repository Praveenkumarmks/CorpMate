const mongoose = require("mongoose");
const { userField, sourceNoteField, locationFields, schemaOptions } = require("./base");

const harvestSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    harvestNo: Number,
    boxes: { type: Number, min: 0 },
    kgPerBox: { type: Number, min: 0 },
    gradeA: Number,
    gradeB: Number,
    gradeC: Number,
    waste: Number,
    price: { type: Number, min: 0 }, // rupees per kg
    labour: Number,
    transport: Number,
    other: Number,
    sourceNote: sourceNoteField,
  },
  schemaOptions
);

// Calculated values. The server is the single source of truth for these.
harvestSchema.virtual("totalKg").get(function () {
  return (this.boxes || 0) * (this.kgPerBox || 0);
});
harvestSchema.virtual("revenue").get(function () {
  return this.totalKg * (this.price || 0);
});
harvestSchema.virtual("cost").get(function () {
  return (this.labour || 0) + (this.transport || 0) + (this.other || 0);
});
harvestSchema.virtual("net").get(function () {
  return this.revenue - this.cost;
});

module.exports = mongoose.model("Harvest", harvestSchema);
