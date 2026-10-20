(function () {
"use strict";
const { api } = CM.api;
const { isCurrent, renderPage } = CM.router;
const { $, $$, esc, formatINR } = CM.utils;
const { CROPS } = CM.config;
const { pageHeader } = CM.components;

let selectedCrop = "Tomato";

function result(r) {
  if (!r.ok) return `<p>Add at least 2 harvests of this crop to see an estimate (you have ${r.samples}).</p>`;
  const money = r.revenue[1] ? `${formatINR(r.revenue[0])}–${formatINR(r.revenue[1])}` : "Add selling prices to see revenue";
  return `
    <p class="big">📦 ${r.boxes[0]}–${r.boxes[1]} boxes</p>
    <p class="big">⚖️ ${r.kg[0]}–${r.kg[1]} kg</p>
    <p class="big">💰 ${esc(money)}</p>
    ${r.nextDate ? `<p>📅 Possible next harvest: around ${esc(r.nextDate)}</p>` : ""}
    <p class="muted small">Based on ${r.samples} recorded harvests.</p>`;
}

CM.pages.predictions = {
  id: "predictions",

  render() {
    return `
      ${pageHeader("Predictions")}
      <section class="card">
        <h2>Next harvest estimate</h2>
        <div class="tabs">${CROPS.map((c) => `<button class="tab${c === selectedCrop ? " active" : ""}" data-crop="${c}">${c}</button>`).join("")}</div>
        <div id="prediction-body">Calculating…</div>
        <p class="muted small">Predictions are estimates based on available farm data and historical records.</p>
      </section>`;
  },

  async mount(root) {
    $$("[data-crop]", root).forEach((button) =>
      button.addEventListener("click", () => { selectedCrop = button.dataset.crop; renderPage(); })
    );
    try {
      const data = await api(`/predict?crop=${encodeURIComponent(selectedCrop)}`);
      if (isCurrent("predictions") && $("#prediction-body")) $("#prediction-body").innerHTML = result(data);
    } catch (error) {
      if ($("#prediction-body")) $("#prediction-body").textContent = error.message;
    }
  },
};
})();
