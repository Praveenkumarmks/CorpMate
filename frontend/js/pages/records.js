(function () {
"use strict";
// A read-only overview of everything recorded.
const { state } = CM.state;
const { pageHeader, dataTable, emptyState } = CM.components;
const { formatINR } = CM.utils;

CM.pages.records = {
  id: "records",

  render() {
    const { harvests, fertilizers, labour, irrigations, diagnoses } = state.data;
    const day = (value) => String(value).slice(0, 10);

    const harvestColumns = [
      { label: "Date", value: (h) => day(h.date) },
      { label: "Crop", value: (h) => h.crop },
      { label: "Boxes", value: (h) => h.boxes },
      { label: "Weight", value: (h) => `${h.totalKg} kg` },
      { label: "Revenue", value: (h) => formatINR(h.revenue) },
      { label: "Costs", value: (h) => formatINR(h.cost) },
      { label: "Net profit", value: (h) => formatINR(h.net) },
    ];

    const activities = [
      ...fertilizers.map((f) => ({ _id: f._id, date: f.date, kind: "🧪 Fertilizer", detail: `${f.name} ${f.quantity ?? ""} ${f.unit ?? ""}`.trim() })),
      ...labour.map((l) => ({ _id: l._id, date: l.date, kind: "👷 Labour", detail: `${l.worker} · ${formatINR(l.payment)}` })),
      ...irrigations.map((i) => ({ _id: i._id, date: i.date, kind: "💧 Irrigation", detail: `${i.hours ?? ""} hours` })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const activityColumns = [
      { label: "Date", value: (a) => day(a.date) },
      { label: "Type", value: (a) => a.kind },
      { label: "Details", value: (a) => a.detail },
    ];
    const diagnosisColumns = [
      { label: "Date", value: (d) => day(d.date) },
      { label: "Diagnosis", value: (d) => d.name },
      { label: "Confidence", value: (d) => `${d.confidence}%` },
    ];

    return `
      ${pageHeader("Records")}
      <section class="card"><h2>🌾 Harvests</h2>${harvests.length ? dataTable(harvestColumns, [...harvests].reverse()) : emptyState("No harvests yet.")}</section>
      <section class="card"><h2>🧪 Other activities</h2>${activities.length ? dataTable(activityColumns, activities) : emptyState("Nothing yet. Convert a note in AgriTrack to add fertilizer, labour and irrigation records.")}</section>
      <section class="card"><h2>👁️ Crop Doctor history</h2>${diagnoses.length ? dataTable(diagnosisColumns, diagnoses) : emptyState("No saved diagnoses.")}</section>`;
  },
};
})();
