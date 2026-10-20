(function () {
"use strict";
const { state } = CM.state;
const { api } = CM.api;
const { loadData } = CM.data;
const { renderPage, navigate } = CM.router;
const { $, today, formatINR } = CM.utils;
const { CROPS } = CM.config;
const { pageHeader, formField, dataTable, emptyState, bindDelete } = CM.components;

const FIELDS = [
  { name: "crop", label: "Crop", type: "select", options: CROPS, required: true },
  { name: "date", label: "Harvest date", type: "date", value: today() },
  { name: "boxes", label: "Number of boxes", type: "number", required: true },
  { name: "kgPerBox", label: "Weight per box (kg)", type: "number" },
  { name: "price", label: "Selling price (₹/kg)", type: "number" },
  { name: "waste", label: "Waste (kg)", type: "number" },
  { name: "labour", label: "Labour cost ₹", type: "number" },
  { name: "transport", label: "Transport cost ₹", type: "number" },
  { name: "other", label: "Other costs ₹", type: "number" },
];

const COLUMNS = [
  { label: "Date", value: (h) => String(h.date).slice(0, 10) },
  { label: "Crop", value: (h) => h.crop },
  { label: "Boxes", value: (h) => h.boxes },
  { label: "Weight", value: (h) => `${h.totalKg} kg` },
  { label: "Revenue", value: (h) => formatINR(h.revenue) },
  { label: "Costs", value: (h) => formatINR(h.cost) },
  { label: "Net profit", value: (h) => formatINR(h.net) },
];

// Shows the same calculation the server does, so the farmer sees the result while typing.
function updatePreview(form) {
  const n = (name) => Number(form.elements[name].value) || 0;
  const totalKg = n("boxes") * n("kgPerBox");
  const revenue = totalKg * n("price");
  const costs = n("labour") + n("transport") + n("other");
  $("#harvest-preview").innerHTML =
    `Total weight <b>${totalKg} kg</b> · Revenue <b>${formatINR(revenue)}</b> · Costs <b>${formatINR(costs)}</b> · Net profit <b>${formatINR(revenue - costs)}</b>`;
}

CM.pages.harvest = {
  id: "harvest",

  render() {
    const rows = [...state.data.harvests].reverse();
    return `
      ${pageHeader("Harvest")}
      <section class="card">
        <h2>New harvest</h2>
        <form id="harvest-form" class="form-grid">
          ${FIELDS.map(formField).join("")}
          <div class="form-actions">
            <p id="harvest-preview" class="muted"></p>
            <button class="btn" type="submit">💾 Save harvest</button>
          </div>
        </form>
        <p class="error" id="form-error" role="alert"></p>
      </section>
      <section class="card">
        ${rows.length ? dataTable(COLUMNS, rows, { canDelete: true }) : emptyState("No harvests yet.")}
      </section>`;
  },

  mount(root) {
    const form = $("#harvest-form", root);
    updatePreview(form);
    form.addEventListener("input", () => updatePreview(form));
    bindDelete(root, "harvests");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = {};
      for (const [name, value] of new FormData(form)) if (value !== "") body[name] = value;

      try {
        await api("/harvests", { method: "POST", body });
        await loadData();
        renderPage();
      } catch (error) {
        $("#form-error").textContent = error.message;
      }
    });
  },
};
})();
