(function () {
"use strict";
// One generic screen for every simple record type: a form on top, a table below.
const { state } = CM.state;
const { api } = CM.api;
const { loadData } = CM.data;
const { renderPage } = CM.router;
const { $ } = CM.utils;
const { RECORD_TYPES } = CM.recordTypes;
const { pageHeader, formField, dataTable, emptyState, bindDelete, defaultFor } = CM.components;

// Dates come back as full timestamps; show only the day.
function displayValue(field, value) {
  if (value === undefined || value === null) return "";
  return field.type === "date" ? String(value).slice(0, 10) : value;
}

function createRecordPage(key) {
  const type = RECORD_TYPES[key];

  return {
    id: key,

    render() {
      const rows = state.data[key];
      const columns = [
        ...type.fields.map((f) => ({ label: f.label, value: (row) => displayValue(f, row[f.name]) })),
        ...(type.extraColumns || []),
      ];

      return `
        ${pageHeader(type.title)}
        <section class="card">
          <h2>Add new</h2>
          <form id="record-form" class="form-grid">
            ${type.fields.map((f) => formField({ ...f, value: defaultFor(f) })).join("")}
            <div class="form-actions"><button class="btn" type="submit">💾 Save</button></div>
          </form>
          <p class="error" id="form-error" role="alert"></p>
        </section>
        <section class="card">
          ${rows.length ? dataTable(columns, rows, { canDelete: true }) : emptyState("Nothing here yet. Fill in the form above and save your first record.")}
        </section>`;
    },

    mount(root) {
      bindDelete(root, key);

      $("#record-form", root).addEventListener("submit", async (event) => {
        event.preventDefault();
        const body = {};
        for (const [name, value] of new FormData(event.target)) if (value !== "") body[name] = value;

        try {
          await api(`/${key}`, { method: "POST", body });
          await loadData();
          renderPage();
        } catch (error) {
          $("#form-error").textContent = error.message;
        }
      });
    },
  };
}
CM.recordPage = { createRecordPage };
})();
