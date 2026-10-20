(function () {
"use strict";
// Crop Doctor: take or upload a leaf photo and get a diagnosis.
const { api } = CM.api;
const { loadData } = CM.data;
const { state } = CM.state;
const { renderPage } = CM.router;
const { $, $$, esc, shortDate } = CM.utils;
const { DISEASE_SAMPLES } = CM.diseaseSamples;
const { pageHeader, emptyState } = CM.components;

let photo = null;       // resized photo as a data URL
let result = null;      // { name, confidence, symptoms, recommendations }
let selectedSample = null;
let message = "";
let saved = false;

// Phone photos are huge. Shrink to 1024px so the upload is fast.
function resizePhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function analyze() {
  message = "Analyzing your photo…";
  renderPage();
  try {
    result = await api("/ai/doctor", { method: "POST", body: { image: photo.split(",")[1], mime: "image/jpeg" } });
    selectedSample = null; saved = false; message = "";
  } catch (error) {
    message = error.message;
  }
  renderPage();
}

async function saveDiagnosis() {
  try {
    await api("/diagnoses", { method: "POST", body: { name: result.name, confidence: result.confidence, symptoms: result.symptoms, recommendations: result.recommendations } });
    await loadData();
    saved = true;
  } catch (error) {
    message = error.message;
  }
  renderPage();
}

const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

CM.pages.doctor = {
  id: "doctor",

  render() {
    const history = state.data.diagnoses;
    return `
      ${pageHeader("Crop Doctor Studio")}
      <section class="card">
        <h2>Add a photo or pick a sample</h2>
        <input id="photo-input" type="file" accept="image/*" capture="environment" aria-label="Upload a crop photo">
        ${photo ? `<img class="preview" src="${esc(photo)}" alt="Your crop photo"><div class="button-row"><button class="btn" id="analyze-btn">🔍 Analyze photo with AI</button></div>` : ""}
        <p class="muted small" role="status">${esc(message || "Upload a photo for AI analysis, or pick a sample below.")}</p>
        <div class="samples">
          ${Object.entries(DISEASE_SAMPLES).map(([key, s]) => `<button class="sample${selectedSample === key ? " active" : ""}" data-sample="${key}">${esc(s.name)}</button>`).join("")}
        </div>
      </section>

      ${result ? `
        <section class="card">
          <h2>${esc(result.name)} <span class="tag">${esc(result.confidence)}% confidence</span></h2>
          <div class="meter"><div class="meter-fill" style="width:${Number(result.confidence) || 0}%"></div></div>
          <h3>Symptoms</h3>${list(result.symptoms)}
          <h3>Recommendations</h3>${list(result.recommendations)}
          <div class="button-row"><button class="btn" id="save-dx-btn"${saved ? " disabled" : ""}>${saved ? "✓ Saved" : "💾 Save to farm history"}</button></div>
          <p class="muted small">Guidance only. Confirm with a local agriculture officer before spraying.</p>
        </section>` : ""}

      <section class="card"><h2>History</h2>
        ${history.length ? history.map((d) => `<p class="note-line"><span class="tag">${esc(shortDate(d.date))}</span> ${esc(d.name)} · ${esc(d.confidence)}%</p>`).join("") : emptyState("No saved diagnoses yet.")}
      </section>`;
  },

  mount(root) {
    $("#photo-input", root).addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      photo = await resizePhoto(file);
      result = null; selectedSample = null; message = "";
      renderPage();
    });
    const analyzeButton = $("#analyze-btn", root);
    if (analyzeButton) analyzeButton.addEventListener("click", analyze);

    $$("[data-sample]", root).forEach((button) =>
      button.addEventListener("click", () => {
        selectedSample = button.dataset.sample;
        result = { ...DISEASE_SAMPLES[selectedSample] };
        saved = false;
        renderPage();
      })
    );
    const saveButton = $("#save-dx-btn", root);
    if (saveButton) saveButton.addEventListener("click", saveDiagnosis);
  },
};
})();
