const User = require("./User");
const Farm = require("./Farm");
const Field = require("./Field");
const Crop = require("./Crop");
const Note = require("./Note");
const Harvest = require("./Harvest");
const Fertilizer = require("./Fertilizer");
const Pesticide = require("./Pesticide");
const Irrigation = require("./Irrigation");
const Labour = require("./Labour");
const Expense = require("./Expense");
const Sale = require("./Sale");
const PestRecord = require("./PestRecord");
const Diagnosis = require("./Diagnosis");

// URL name -> model. Each of these gets the standard list/create/update/delete API.
const RESOURCES = {
  farms: Farm,
  fields: Field,
  crops: Crop,
  notes: Note,
  harvests: Harvest,
  fertilizers: Fertilizer,
  pesticides: Pesticide,
  irrigations: Irrigation,
  labour: Labour,
  expenses: Expense,
  sales: Sale,
  pestrecords: PestRecord,
  diagnoses: Diagnosis,
};

module.exports = { User, Farm, Field, Crop, Note, Harvest, Fertilizer, Pesticide, Irrigation, Labour, Expense, Sale, PestRecord, Diagnosis, RESOURCES };
