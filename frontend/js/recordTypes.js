(function () {
"use strict";
// Describes every simple record screen (farms, crops, fertilizers, ...).
// One generic page (pages/recordPage.js) builds the form and table from these descriptions.
const { CROPS, STAGES } = CM.config;
const { formatINR } = CM.utils;

const crop = { name: "crop", label: "Crop", type: "select", options: CROPS, required: true };
const field = { name: "field", label: "Field" };
const date = { name: "date", label: "Date", type: "date" };

const RECORD_TYPES = {
  farms: {
    title: "My Farms",
    fields: [
      { name: "name", label: "Farm name", required: true },
      { name: "location", label: "Location" },
      { name: "area", label: "Area (acres)", type: "number" },
      { name: "soil", label: "Soil type", type: "select", options: ["Red", "Black", "Loamy", "Sandy", "Clay"] },
      { name: "notes", label: "Notes" },
    ],
  },
  crops: {
    title: "Crops",
    fields: [
      crop,
      { name: "farm", label: "Farm" },
      field,
      { name: "area", label: "Area (acres)", type: "number" },
      { name: "plantingDate", label: "Planting date", type: "date" },
      { name: "plants", label: "Number of plants", type: "number" },
      { name: "stage", label: "Growth stage", type: "select", options: STAGES, required: true },
      { name: "expectedHarvest", label: "Expected harvest", type: "date" },
    ],
  },
  fertilizers: {
    title: "Fertilizers",
    fields: [
      { name: "name", label: "Fertilizer", required: true },
      { ...crop, required: false },
      field,
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "unit", label: "Unit", type: "select", options: ["kg", "g", "L"], required: true },
      date,
      { name: "method", label: "Application method" },
      { name: "cost", label: "Cost ₹", type: "number" },
    ],
  },
  pesticides: {
    title: "Pesticides",
    fields: [
      { name: "name", label: "Product", required: true },
      { ...crop, required: false },
      field,
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "unit", label: "Unit", type: "select", options: ["L", "ml", "kg", "g"], required: true },
      date,
      { name: "pest", label: "Pest / disease" },
      { name: "cost", label: "Cost ₹", type: "number" },
    ],
  },
  irrigations: {
    title: "Irrigation",
    fields: [
      { ...crop, required: false },
      field,
      date,
      { name: "type", label: "Type", type: "select", options: ["Drip", "Sprinkler", "Flood"] },
      { name: "hours", label: "Duration (hours)", type: "number" },
      { name: "source", label: "Water source", type: "select", options: ["Well", "Borewell", "Canal", "Rain-fed"] },
      { name: "notes", label: "Notes" },
    ],
  },
  labour: {
    title: "Labour",
    fields: [
      { name: "worker", label: "Worker name", required: true },
      {
        name: "workType", label: "Work type", type: "select",
        options: ["Planting", "Harvesting", "Fertilizer Application", "Irrigation", "Cleaning", "Maintenance", "Other"],
      },
      { ...crop, required: false },
      date,
      { name: "hours", label: "Hours worked", type: "number" },
      { name: "payment", label: "Payment ₹", type: "number" },
      { name: "status", label: "Payment status", type: "select", options: ["Paid", "Pending"], required: true },
    ],
  },
  expenses: {
    title: "Expenses",
    fields: [
      {
        name: "category", label: "Category", type: "select", required: true,
        options: ["Seeds", "Fertilizer", "Pesticides", "Labour", "Transportation", "Water", "Electricity", "Equipment", "Maintenance", "Other"],
      },
      { name: "amount", label: "Amount ₹", type: "number", required: true },
      date,
      { ...crop, required: false },
      { name: "description", label: "Description" },
    ],
  },
  sales: {
    title: "Sales",
    fields: [
      crop,
      { name: "buyer", label: "Buyer" },
      { name: "quantity", label: "Quantity (kg)", type: "number" },
      { name: "price", label: "Price ₹/kg", type: "number" },
      date,
      { name: "status", label: "Payment status", type: "select", options: ["Paid", "Pending", "Partial"], required: true },
    ],
    extraColumns: [{ label: "Total", value: (row) => formatINR(row.total) }],
  },
  pestrecords: {
    title: "Pest & disease records",
    fields: [
      { ...crop, required: false },
      { name: "pest", label: "Pest / disease", required: true },
      date,
      { name: "severity", label: "Severity", type: "select", options: ["Low", "Medium", "High"], required: true },
      { name: "action", label: "Action taken" },
      { name: "product", label: "Product used" },
      { name: "notes", label: "Notes" },
    ],
  },
};
CM.recordTypes = { RECORD_TYPES };
})();
