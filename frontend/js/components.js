(function () {
"use strict";
// Reusable pieces of HTML.
const { esc, today } = CM.utils;
const { api } = CM.api;
const { loadData } = CM.data;
const { renderPage } = CM.router;

function pageHeader(title, { addNote = true } = {}) {
  return `
    <header class="page-header">
      <div>
        <h1>${esc(title)}</h1>
        <div class="sync-status" data-sync></div>
      </div>
      ${addNote ? '<button class="btn" data-go="notes">+ Add Note</button>' : ""}
    </header>`;
}

const statCard = (value, label) => `<div class="stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
const emptyState = (text) => `<p class="muted">${esc(text)}</p>`;

// One form input. type: text | number | date | select
function formField({ name, label, type = "text", options = [], required = false, value = "", wide = false }) {
  const id = `f-${name}`;
  let input;
  if (type === "select") {
    const blank = required ? "" : '<option value="">-</option>';
    input = `<select id="${id}" name="${name}" ${required ? "required" : ""}>${blank}${options
      .map((o) => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`)
      .join("")}</select>`;
  } else {
    const extra = type === "number" ? 'step="any" min="0"' : "";
    input = `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" ${extra} ${required ? "required" : ""}>`;
  }
  return `<div class="field${wide ? " field-wide" : ""}"><label for="${id}">${esc(label)}</label>${input}</div>`;
}

// A table. columns = [{ label, value: (row) => text }]. Adds a delete button when canDelete is true.
function dataTable(columns, rows, { canDelete = false } = {}) {
  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join("") + (canDelete ? "<th></th>" : "");
  const body = rows
    .map((row) => {
      const cells = columns.map((c) => `<td>${esc(c.value(row))}</td>`).join("");
      const del = canDelete ? `<td><button class="icon-btn" data-delete="${esc(row._id)}" aria-label="Delete">✕</button></td>` : "";
      return `<tr>${cells}${del}</tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// Horizontal bars. items = [{ label, value }]
function meterList(items, format = (v) => v) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return items
    .map(
      (i) => `<div class="meter-row"><p>${esc(i.label)} · ${esc(format(i.value))}</p>
        <div class="meter"><div class="meter-fill" style="width:${Math.max(0, (i.value / max) * 100)}%"></div></div></div>`
    )
    .join("");
}

// Makes the delete buttons inside a table work.
function bindDelete(root, endpoint) {
  root.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this record?")) return;
      try {
        await api(`/${endpoint}/${button.dataset.delete}`, { method: "DELETE" });
        await loadData();
        renderPage();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

const defaultFor = (field) => (field.name === "date" ? today() : "");
CM.components = { pageHeader, statCard, emptyState, formField, dataTable, meterList, bindDelete, defaultFor };
})();
