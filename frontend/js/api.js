(function () {
"use strict";
// All talking to the server goes through api().
// If no server is reachable (for example index.html was opened by double-click), it uses the
// browser-only stand-in from localApi.js instead, so the app still works.
const { state } = CM.state;
const { storageGet, storageSet, storageRemove } = CM.utils;
const { localApi } = CM.localApi;

const BASE = window.CROPMATE_API || ""; // empty = same server that served this page
let token = storageGet("cm_token");
let mode = "server"; // "server" | "local"

const getMode = () => mode;
const hasToken = () => Boolean(token);

function setToken(value) {
  token = value;
  storageSet("cm_token", value);
}
function clearToken() {
  token = null;
  storageRemove("cm_token");
}

// Looks for the backend. Opening the file directly, or no server, means local mode.
async function detectMode() {
  if (location.protocol === "file:") {
    mode = "local";
  } else {
    try {
      const response = await fetch(`${BASE}/api/health`, { cache: "no-store" });
      mode = response.ok ? "server" : "local";
    } catch {
      mode = "local";
    }
  }
  return mode;
}

function setSync(status) {
  state.sync = status;
  window.dispatchEvent(new CustomEvent("sync:change"));
}

// api("/harvests", { method: "POST", body: { ... } })  ->  parsed JSON, or throws an Error with a readable message
async function api(path, options = {}) {
  if (mode === "local") {
    const result = await localApi.handle(path, options);
    setSync("local");
    return result;
  }

  const { method = "GET", body } = options;
  setSync("syncing");
  try {
    const response = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      if (response.status === 401 && token && !path.startsWith("/auth/")) window.dispatchEvent(new Event("auth:expired"));
      throw error;
    }
    setSync("ok");
    return data;
  } catch (error) {
    setSync(navigator.onLine ? "error" : "offline");
    throw error;
  }
}
CM.api = { getMode, hasToken, setToken, clearToken, detectMode, api };
})();
