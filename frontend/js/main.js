(function () {
"use strict";
// App start-up: theme, pages, welcome slides, login (server mode only), then the first screen.
const { storageGet } = CM.utils;
const { state } = CM.state;
const { api, hasToken, clearToken, detectMode, getMode } = CM.api;
const { loadData } = CM.data;
const { registerPage, navigate, renderNav, initRouter } = CM.router;
const { initAuth, showAuth, logout } = CM.auth;
const { showOnboarding } = CM.onboarding;
const { hideOverlay } = CM.overlay;
const { RECORD_TYPES } = CM.recordTypes;

const home = CM.pages.home;
const notes = CM.pages.notes;
const harvest = CM.pages.harvest;
const records = CM.pages.records;
const analytics = CM.pages.analytics;
const doctor = CM.pages.doctor;
const market = CM.pages.market;
const predictions = CM.pages.predictions;
const settings = CM.pages.settings;
const { createRecordPage } = CM.recordPage;

[home, notes, harvest, records, analytics, doctor, market, predictions, settings].forEach(registerPage);
Object.keys(RECORD_TYPES).forEach((key) => registerPage(createRecordPage(key)));

// Shows the first screen once we know who is using the app.
async function startApp() {
  hideOverlay();
  CM.chatWidget.show();
  await loadData();
  navigate("home");
}

// Server mode: check the saved login, or show the login screen.
async function checkLogin() {
  if (!hasToken()) return showAuth();
  try {
    state.user = (await api("/auth/me")).user;
    await startApp();
  } catch (error) {
    if (error.status === 401) clearToken();
    showAuth("login", error.status === 401 ? "" : "Could not reach the server. Please try again.");
  }
}

// Local mode: no login needed, data stays in this browser.
async function openLocal() {
  state.user = (await api("/auth/me")).user;
  await startApp();
}

async function boot() {
  document.documentElement.dataset.theme = storageGet("cm_theme") || "";
  initRouter();
  CM.chatWidget.init();
  initAuth(startApp);
  renderNav();
  window.addEventListener("auth:expired", logout);

  await detectMode();
  if (getMode() === "server" && location.protocol.startsWith("http") && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  if (getMode() === "server" && location.hash.startsWith("#reset=")) return showAuth("reset");
  const next = getMode() === "local" ? openLocal : checkLogin;
  if (!storageGet("cm_onboarded")) return showOnboarding(next);
  next();
}

boot();
})();
