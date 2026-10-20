(function () {
"use strict";
const { state } = CM.state;
const { PAGES } = CM.config;
const { esc, formatINR, shortDate, sum } = CM.utils;
const { pageHeader, statCard, emptyState } = CM.components;

function greeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${state.user ? state.user.name : "Farmer"}! 🌤️`;
}

CM.pages.home = {
  id: "home",

  render() {
    const { harvests, crops, notes } = state.data;

    const cropNames = [...harvests.map((h) => h.crop), ...crops.filter((c) => c.stage !== "Completed").map((c) => c.crop)];
    const activeCrops = new Set(cropNames.filter(Boolean)).size;
    const recent = harvests.slice(-8);
    const biggest = Math.max(1, ...recent.map((h) => h.boxes || 0));

    const trend = recent.length
      ? `<div class="bars">${recent
          .map((h) => `<div class="bar" style="height:${((h.boxes || 0) / biggest) * 100}%"><span>${esc(shortDate(h.date))}</span></div>`)
          .join("")}</div>`
      : emptyState("Your harvests will appear here as a chart.");

    const quick = [
      ["harvest", "🌾 Harvest", "btn btn-sun"],
      ["fertilizers", "🧪 Fertilizer", "btn btn-outline"],
      ["irrigations", "💧 Irrigation", "btn btn-outline"],
      ["expenses", "💰 Expense", "btn btn-outline"],
    ];

    return `
      ${pageHeader(greeting())}

      <div class="stats">
        ${statCard(activeCrops, "Active crops")}
        ${statCard(sum(harvests, (h) => h.boxes), "Total boxes")}
        ${statCard(`${sum(harvests, (h) => h.totalKg).toLocaleString("en-IN")} kg`, "Production")}
        ${statCard(formatINR(sum(harvests, (h) => h.revenue)), "Revenue")}
      </div>

      <section class="card"><h2>Harvest trend</h2>${trend}</section>

      <section class="card">
        <h2>Quick add</h2>
        <div class="button-row" style="margin-top:0">
          ${quick.map(([page, label, cls]) => `<button class="${cls}" data-go="${page}">${label}</button>`).join("")}
        </div>
      </section>

      <section class="card">
        <h2>All sections</h2>
        <div class="button-row" style="margin-top:0">
          ${PAGES.filter((p) => p.id !== "home").map((p) => `<button class="btn btn-outline btn-small" data-go="${p.id}">${p.icon} ${esc(p.label)}</button>`).join("")}
        </div>
      </section>

      <section class="card">
        <h2>Recent notes</h2>
        ${notes.length
          ? notes.slice(0, 3).map((n) => `<p class="note-line"><span class="tag">${esc(shortDate(n.date))}</span> ${esc(n.text)}</p>`).join("")
          : emptyState("No notes yet. Tap + Add Note to write your first one.")}
      </section>`;
  },
};
})();
