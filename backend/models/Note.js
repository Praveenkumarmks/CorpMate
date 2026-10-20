const mongoose = require("mongoose");
const { userField, schemaOptions } = require("./base");

const noteSchema = new mongoose.Schema(
  {
    user: userField,
    text: { type: String, required: true, maxlength: 5000 }, // stored exactly as written or spoken
    crop: String,
    farm: String,
    field: String,
    lang: { type: String, default: "en" },
    date: { type: Date, default: Date.now },
    converted: { type: Boolean, default: false },
  },
  schemaOptions
);

module.exports = mongoose.model("Note", noteSchema);
