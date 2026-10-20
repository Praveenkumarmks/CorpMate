const { Schema } = require("mongoose");

// Every record belongs to one user.
const userField = { type: Schema.Types.ObjectId, ref: "User", required: true, index: true };

// Records created by converting a note keep a link back to it.
const sourceNoteField = { type: Schema.Types.ObjectId, ref: "Note" };

// Every farm activity says where (farm, field, crop) and when it happened.
const locationFields = {
  farm: String,
  field: String,
  crop: String,
  date: { type: Date, default: Date.now },
  notes: String,
};

const schemaOptions = { timestamps: true, toJSON: { virtuals: true } };

module.exports = { userField, sourceNoteField, locationFields, schemaOptions };
