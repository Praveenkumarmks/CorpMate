(function () {
"use strict";
const { api } = CM.api;
const { $ } = CM.utils;
const { CROPS } = CM.config;
const { pageHeader, formField } = CM.components;

CM.pages.market = {
  id: "market",

  render() {
    return `
      ${pageHeader("Market prices")}
      <section class="card">
        <form id="market-form" class="form-grid">
          ${formField({ name: "crop", label: "Crop", type: "select", options: CROPS, required: true })}
          ${formField({ name: "location", label: "Place (optional)" })}
          <div class="form-actions"><button class="btn" type="submit">Check price</button></div>
        </form>
        <p id="market-result" class="output" role="status"></p>
        <p class="muted small">AI estimate only, not live data. Confirm with your local market before selling.</p>
      </section>`;
  },

  mount(root) {
    $("#market-form", root).addEventListener("submit", async (event) => {
      event.preventDefault();
      const output = $("#market-result");
      output.textContent = "Checking…";
      try {
        const body = { crop: $("#f-crop").value, location: $("#f-location").value };
        output.textContent = (await api("/ai/market", { method: "POST", body })).text;
      } catch (error) {
        output.textContent = error.message;
      }
    });
  },
};
})();
