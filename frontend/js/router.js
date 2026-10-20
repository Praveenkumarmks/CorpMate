(function () {
"use strict";
// Decides which screen is showing. A page is an object: { id, render(), mount?(root), unmount?() }
const { $, $$, esc } = CM.utils;
const { PAGES, BOTTOM_NAV } = CM.config;
const { state } = CM.state;

const pages = {};
let currentId = "home";

const registerPage = (page) => { pages[page.id] = page; };
const isCurrent = (id) => currentId === id;

const SYNC_LABELS = { ok: "☁️ Synced", syncing: "🔄 Syncing", offline: "⚠️ Offline", error: "⚠️ Sync problem", local: "💾 Saved on this device" };

function updateSyncLabels() {
  $$("[data-sync]").forEach((el) => { el.textContent = SYNC_LABELS[state.sync] || SYNC_LABELS.ok; });
}

// Draws the current page again (after saving something, for example).
function renderPage() {
  const main = $("#main");
  const page = pages[currentId];
  main.innerHTML = page.render();
  if (page.mount) page.mount(main);
  updateSyncLabels();
}

function navigate(id) {
  if (id === "assistant") { CM.chatWidget.open({ expanded: true }); return; } // opens the chat window, not a page
  if (!pages[id]) id = "home";
  if (pages[currentId] && pages[currentId].unmount) pages[currentId].unmount();
  currentId = id;
  renderPage();
  renderNav();
  window.scrollTo(0, 0);
}

function renderNav() {
  const item = (page, label, iconClass = "") =>
    `<button class="nav-item${page.id === currentId ? " active" : ""}" data-go="${page.id}">
       <span class="nav-icon ${iconClass}">${page.icon}</span><span>${esc(label)}</span>
     </button>`;

  $("#sidebar-nav").innerHTML = PAGES.map((p) => item(p, p.label)).join("");
  $("#bottom-nav").innerHTML = PAGES.filter((p) => BOTTOM_NAV.includes(p.id)).map((p) => item(p, p.short || p.label)).join("");
}

// Any element with data-go="pageId" works as a link.
function initRouter() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-go]");
    if (target) navigate(target.dataset.go);
  });
  window.addEventListener("sync:change", updateSyncLabels);
}
CM.router = { registerPage, isCurrent, updateSyncLabels, renderPage, navigate, renderNav, initRouter };
})();
