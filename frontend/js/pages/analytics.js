(function () {
"use strict";
const { api } = CM.api;
const { state } = CM.state;
const { isCurrent, renderPage } = CM.router;
const { $, esc, formatINR } = CM.utils;
const { CROPS } = CM.config;
const { pageHeader, statCard, meterList, emptyState } = CM.components;

const filters = { crop: "", from: "", to: "" };

function results(data) {
  const { totals, byCrop, monthly, expenseCategories } = data;
  const monthRows = monthly.length
    ? monthly.map((m) => `<p class="note-line"><b>${esc(m.month)}</b> · Revenue ${formatINR(m.revenue)} · Expenses ${formatINR(m.expenses)}</p>`).join("")
    : emptyState("No data for this period.");

  return `
    <div class="stats">
      ${statCard(totals.boxes, "Total boxes")}
      ${statCard(`${totals.kg.toLocaleString("en-IN")} kg`, "Total weight")}
      ${statCard(formatINR(totals.revenue), "Revenue")}
      ${statCard(formatINR(totals.expenses), "Expenses")}
      ${statCard(formatINR(totals.profit), "Profit")}
      ${statCard(totals.yieldPerAcre === null ? "-" : `${totals.yieldPerAcre} kg`, "Yield per acre")}
    </div>
    <section class="card"><h2>Crop performance (profit)</h2>
      ${byCrop.length ? meterList(byCrop.map((c) => ({ label: `${c.crop} · ${c.boxes} boxes`, value: c.profit })), formatINR) : emptyState("No harvests yet.")}
    </section>
    <section class="card"><h2>Monthly revenue and expenses</h2>${monthRows}</section>
    <section class="card"><h2>Expense categories</h2>
      ${expenseCategories.length ? meterList(expenseCategories.map((c) => ({ label: c.category, value: c.amount })), formatINR) : emptyState("No expenses recorded.")}
      <p class="muted small">Sales recorded: ${formatINR(totals.salesTotal)}</p>
    </section>`;
}

async function load() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  try {
    const data = await api(`/analytics?${params}`);
    if (isCurrent("analytics") && $("#analytics-body")) $("#analytics-body").innerHTML = results(data);
  } catch (error) {
    if ($("#analytics-body")) $("#analytics-body").textContent = error.message;
  }
}

CM.pages.analytics = {
  id: "analytics",

  render() {
    return `
      ${pageHeader("Analytics")}
      <section class="card">
        <form id="filter-form" class="form-grid">
          <div class="field"><label for="flt-crop">Crop</label>
            <select id="flt-crop"><option value="">All crops</option>${CROPS.map((c) => `<option${filters.crop === c ? " selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label for="flt-from">From</label><input id="flt-from" type="date" value="${esc(filters.from)}"></div>
          <div class="field"><label for="flt-to">To</label><input id="flt-to" type="date" value="${esc(filters.to)}"></div>
        </form>
      </section>
      <div id="analytics-body" class="muted">Loading…</div>`;
  },

  mount(root) {
    $("#filter-form", root).addEventListener("change", () => {
      filters.crop = $("#flt-crop").value;
      filters.from = $("#flt-from").value;
      filters.to = $("#flt-to").value;
      load();
    });
    load();
  },
};
})();
