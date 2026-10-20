(function () {
"use strict";
// AgriTrack: type or speak a farm note, save it, and convert it into records.
const { state } = CM.state;
const { api } = CM.api;
const { loadData } = CM.data;
const { renderPage, navigate, isCurrent } = CM.router;
const { $, $$, esc, today, shortDate } = CM.utils;
const { CROPS } = CM.config;
const { createRecognizer, voiceSupported } = CM.voice;
const { pageHeader, formField, emptyState } = CM.components;

// Which values the AI/rules can find in a note, and how to label them in the review form.
const STRUCTURE_FIELDS = [
  ["crop", "Crop", "text"],
  ["boxes", "Boxes", "number"],
  ["kgPerBox", "Kg per box", "number"],
  ["totalKg", "Total kg", "number"],
  ["fertilizer", "Fertilizer", "text"],
  ["fertilizerKg", "Fertilizer kg", "number"],
  ["labourCost", "Labour ₹", "number"],
  ["otherCosts", "Other ₹", "number"],
  ["irrigationHours", "Irrigation hours", "number"],
  ["pricePerKg", "Price ₹/kg", "number"],
];

// Screen state. It lives here so the text survives when the page redraws.
let mode = "text";          // "text" | "voice"
let draft = "";             // the note being written
let lang = "en-IN";         // voice language
let message = "";           // small status line
let structured = null;      // { data, source } after "Structure with AI"
let reviewView = "form";    // "form" | "json"
let convertingNoteId = null;
let recorder = null;
let seconds = 0;
let timer = null;

const readDraft = () => ($("#note-text") ? $("#note-text").value : draft);
const clock = () => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function voicePanel() {
  const recording = Boolean(recorder);
  return `
    <button class="mic${recording ? " recording" : ""}" id="mic-btn" aria-label="${recording ? "Stop recording" : "Start recording"}">🎤</button>
    <p class="voice-status" id="voice-status">${recording ? `🔴 Recording ${clock()} · tap to stop` : "Tap to start speaking"}</p>
    <div class="field" style="max-width:200px;margin:0 auto 10px">
      <label for="voice-lang">Language</label>
      <select id="voice-lang">
        <option value="en-IN"${lang === "en-IN" ? " selected" : ""}>English</option>
        <option value="ta-IN"${lang === "ta-IN" ? " selected" : ""}>தமிழ்</option>
      </select>
    </div>`;
}

function reviewPanel() {
  if (!structured) return "";
  const { data, source } = structured;

  const form = STRUCTURE_FIELDS.map(
    ([key, label, type]) =>
      `<div class="field"><label>${label}<input data-key="${key}" type="${type}" step="any" value="${esc(data[key] ?? "")}"></label></div>`
  ).join("");

  return `
    <section class="card">
      <h2>🤖 Review before saving</h2>
      <p class="muted small">Found by ${source === "ai" ? "AI" : "built-in rules"}. Check every value, fix anything wrong, then confirm.</p>
      <div class="tabs">
        <button class="tab${reviewView === "form" ? " active" : ""}" data-review="form">Form</button>
        <button class="tab${reviewView === "json" ? " active" : ""}" data-review="json">JSON</button>
      </div>
      ${reviewView === "form" ? `<div class="form-grid">${form}</div>` : `<pre class="json">${esc(JSON.stringify(data, null, 2))}</pre>`}
      <div class="button-row"><button class="btn" id="confirm-btn">✓ Confirm and create records</button></div>
      <p class="muted small">Your original note is always kept.</p>
    </section>`;
}

function savedNotes() {
  const notes = state.data.notes;
  if (!notes.length) return emptyState("No notes yet.");
  return notes
    .map(
      (n) => `<p class="note-line"><span class="tag">${esc(shortDate(n.date))}</span> ${esc(n.text)}
        <button class="btn btn-outline btn-small" data-convert="${esc(n._id)}">${n.converted ? "Convert again" : "Convert"}</button></p>`
    )
    .join("");
}

async function saveNote() {
  draft = readDraft();
  if (!draft.trim()) return;
  try {
    await api("/notes", { method: "POST", body: { text: draft, crop: $("#f-crop").value, farm: $("#f-farm").value, lang, date: $("#f-date").value } });
    draft = ""; structured = null; message = "Note saved ✓";
    await loadData();
  } catch (error) {
    message = error.message;
  }
  renderPage();
}

async function runStructure() {
  draft = readDraft();
  if (!draft.trim()) { message = "Write or speak a note first."; return renderPage(); }
  message = "";
  try {
    structured = await api("/ai/structure", { method: "POST", body: { text: draft, lang } });
  } catch (error) {
    structured = null;
    message = error.message;
  }
  renderPage();
}

async function confirmConvert(root) {
  const data = {};
  $$("[data-key]", root).forEach((input) => {
    if (input.value !== "") data[input.dataset.key] = input.type === "number" ? Number(input.value) : input.value;
  });
  try {
    await api("/notes/convert", {
      method: "POST",
      body: {
        data,
        noteId: convertingNoteId || undefined,
        text: convertingNoteId ? undefined : draft,
        crop: $("#f-crop").value,
        lang,
      },
    });
    draft = ""; structured = null; convertingNoteId = null; message = "";
    await loadData();
    navigate("records");
  } catch (error) {
    message = error.message;
    renderPage();
  }
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function toggleRecording() {
  if (recorder) return recorder.stop();
  if (!voiceSupported()) {
    message = "Speech-to-text is not available in this browser. Please type your note.";
    return renderPage();
  }

  const before = readDraft();
  recorder = createRecognizer({
    lang,
    onText: (text) => {
      draft = `${before} ${text}`.trim();
      if ($("#note-text")) $("#note-text").value = draft;
    },
    onEnd: () => {
      stopTimer();
      recorder = null;
      if (isCurrent("notes")) renderPage();
    },
  });
  recorder.start();
  seconds = 0;
  timer = setInterval(() => {
    seconds++;
    if ($("#voice-status")) $("#voice-status").textContent = `🔴 Recording ${clock()} · tap to stop`;
  }, 1000);
  renderPage();
}

CM.pages.notes = {
  id: "notes",

  render() {
    const farmNames = state.data.farms.map((f) => f.name);
    return `
      ${pageHeader("Take a Farming Note", { addNote: false })}
      <div class="tabs">
        <button class="tab${mode === "text" ? " active" : ""}" data-mode="text">✍️ Text mode</button>
        <button class="tab${mode === "voice" ? " active" : ""}" data-mode="voice">🎙️ Voice mode</button>
      </div>

      <section class="card">
        ${mode === "voice" ? voicePanel() : ""}
        <div class="field">
          <label for="note-text">What happened today?</label>
          <textarea id="note-text" placeholder="Today harvested 12 boxes of tomato. Each box is around 20kg. Gave Urea 5kg. Labour ₹800.">${esc(draft)}</textarea>
        </div>
        <div class="form-grid" style="margin-top:10px">
          ${formField({ name: "farm", label: "Farm", type: "select", options: farmNames.length ? farmNames : ["Main Farm"], required: true })}
          ${formField({ name: "crop", label: "Crop", type: "select", options: CROPS, required: true })}
          ${formField({ name: "date", label: "Date", type: "date", value: today() })}
        </div>
        <p class="muted small" role="status">${esc(message)}</p>
        <div class="button-row">
          <button class="btn" id="save-btn">💾 Save note</button>
          <button class="btn btn-outline" id="structure-btn">🤖 Structure with AI</button>
          <button class="btn btn-outline" id="clear-btn">Clear</button>
        </div>
      </section>

      ${reviewPanel()}

      <section class="card"><h2>Saved notes</h2>${savedNotes()}</section>`;
  },

  mount(root) {
    $$("[data-mode]", root).forEach((button) =>
      button.addEventListener("click", () => { draft = readDraft(); mode = button.dataset.mode; renderPage(); })
    );
    $("#note-text", root).addEventListener("input", (event) => { draft = event.target.value; });
    $("#save-btn", root).addEventListener("click", saveNote);
    $("#structure-btn", root).addEventListener("click", runStructure);
    $("#clear-btn", root).addEventListener("click", () => { draft = ""; structured = null; convertingNoteId = null; message = ""; renderPage(); });

    const mic = $("#mic-btn", root);
    if (mic) mic.addEventListener("click", toggleRecording);
    const langSelect = $("#voice-lang", root);
    if (langSelect) langSelect.addEventListener("change", (event) => { lang = event.target.value; });

    $$("[data-convert]", root).forEach((button) =>
      button.addEventListener("click", () => {
        const note = state.data.notes.find((n) => n._id === button.dataset.convert);
        draft = note.text;
        convertingNoteId = note._id;
        mode = "text";
        runStructure();
      })
    );
    $$("[data-review]", root).forEach((button) =>
      button.addEventListener("click", () => {
        if (reviewView === "form") {
          // Keep any edits made in the form before switching to JSON.
          $$("[data-key]", root).forEach((input) => {
            if (input.value === "") delete structured.data[input.dataset.key];
            else structured.data[input.dataset.key] = input.type === "number" ? Number(input.value) : input.value;
          });
        }
        reviewView = button.dataset.review;
        renderPage();
      })
    );
    const confirm = $("#confirm-btn", root);
    if (confirm) confirm.addEventListener("click", () => confirmConvert(root));
  },

  unmount() {
    if (recorder) recorder.stop();
  },
};
})();
