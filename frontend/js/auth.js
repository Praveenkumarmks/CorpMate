(function () {
"use strict";
// Login, sign-up and password reset screens.
const { $, esc } = CM.utils;
const { api, setToken, clearToken } = CM.api;
const { state } = CM.state;
const { resetData } = CM.data;
const { showOverlay, hideOverlay } = CM.overlay;

let onLoggedIn = () => {};
const initAuth = (callback) => { onLoggedIn = callback; };

const TITLES = { login: "Log in", signup: "Create account", forgot: "Send reset link", reset: "Save new password" };

// mode: "login" | "signup" | "forgot" | "reset"
function showAuth(mode = "login", message = "", isOk = false) {
  const field = (id, label, type, extra = "") =>
    `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra}></div>`;

  const fields = [
    mode === "signup" ? field("auth-name", "Your name", "text", 'autocomplete="name"') : "",
    mode !== "reset" ? field("auth-email", "Email", "email", 'autocomplete="email"') : "",
    mode !== "forgot"
      ? field("auth-password", mode === "reset" ? "New password" : "Password", "password",
          `autocomplete="${mode === "login" ? "current-password" : "new-password"}"`)
      : "",
  ].join("");

  showOverlay(`
    <div class="auth-card">
      <img class="logo" src="assets/logo.jpg" alt="CropMate">
      <h1>CropMate</h1>
      <p class="muted small">Farm Smarter. Grow Better. Together.</p>
      <form id="auth-form" class="auth-form">
        ${fields}
        <p class="auth-message${isOk ? " ok" : ""}" role="alert">${esc(message)}</p>
        <button class="btn" type="submit" style="width:100%">${TITLES[mode]}</button>
      </form>
      <p class="small">
        <a href="#" id="auth-switch">${mode === "login" ? "Create an account" : "Back to log in"}</a>
        ${mode === "login" ? ' · <a href="#" id="auth-forgot">Forgot password?</a>' : ""}
      </p>
    </div>`);

  $("#auth-switch").addEventListener("click", (event) => {
    event.preventDefault();
    if (mode === "reset") location.hash = "";
    showAuth(mode === "login" ? "signup" : "login");
  });
  const forgot = $("#auth-forgot");
  if (forgot) forgot.addEventListener("click", (event) => { event.preventDefault(); showAuth("forgot"); });

  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = (id) => ($(id) ? $(id).value : "");
    const button = $("#auth-form button");
    button.disabled = true;

    try {
      if (mode === "forgot") {
        await api("/auth/forgot", { method: "POST", body: { email: value("#auth-email") } });
        return showAuth("login", "If that email is registered, a reset link has been sent.", true);
      }
      if (mode === "reset") {
        await api("/auth/reset", { method: "POST", body: { token: location.hash.slice(7), password: value("#auth-password") } });
        location.hash = "";
        return showAuth("login", "Password changed. Please log in.", true);
      }

      const result = await api(`/auth/${mode}`, {
        method: "POST",
        body: { name: value("#auth-name"), email: value("#auth-email"), password: value("#auth-password") },
      });
      setToken(result.token);
      state.user = result.user;
      hideOverlay();
      await onLoggedIn();
    } catch (error) {
      showAuth(mode, error.message);
    }
  });
}

function logout() {
  if (CM.chatWidget) CM.chatWidget.reset();
  clearToken();
  state.user = null;
  resetData();
  showAuth("login");
}
CM.auth = { initAuth, showAuth, logout };
})();
