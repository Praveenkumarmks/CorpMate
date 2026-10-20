const mongoose = require("mongoose");
const { userField, sourceNoteField, locationFields, schemaOptions } = require("./base");

const irrigationSchema = new mongoose.Schema(
  {
    user: userField,
    ...locationFields,
    type: String, // drip, sprinkler, flood
    hours: Number,
    source: String, // well, canal, rain-fed
    sourceNote: sourceNoteField,
  },
  schemaOptions
);

module.exports = mongoose.model("Irrigation", irrigationSchema);
