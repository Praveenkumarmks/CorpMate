(function () {
"use strict";
const { api, getMode } = CM.api;
const { localApi } = CM.localApi;
const { state } = CM.state;
const { loadData } = CM.data;
const { renderPage, navigate } = CM.router;
const { logout } = CM.auth;
const { showOnboarding } = CM.onboarding;
const { $, esc, storageSet, storageRemove } = CM.utils;
const { pageHeader } = CM.components;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  storageSet("cm_theme", theme);
}

// The data card differs: with a server it is a cloud account, without one it is this browser.
function dataCard(isLocal) {
  if (isLocal) {
    return `
      <section class="card">
        <h2>💾 Data on this device</h2>
        <p>The app is running without a server, so your records are saved in this browser only. Run the CropMate backend
        (see the README) to get login, cloud backup and AI features.</p>
        <div class="button-row">
          <button class="btn btn-outline" id="backup-btn">Show backup text</button>
          <button class="btn btn-outline" id="reset-btn">Reset to demo data</button>
        </div>
        <textarea id="backup-text" readonly hidden></textarea>
      </section>`;
  }
  return `
    <section class="card">
      <h2>☁️ Cloud backup</h2>
      <p>Your records are stored in your private CropMate cloud account. Log in on any phone or laptop to see the same data.</p>
      <div class="button-row">
        <button class="btn btn-outline" id="backup-btn">Show backup text</button>
        <button class="btn btn-outline" id="logout-btn">Log out</button>
      </div>
      <textarea id="backup-text" readonly hidden></textarea>
    </section>`;
}

CM.pages.settings = {
  id: "settings",

  render() {
    const user = state.user || {};
    const isLocal = getMode() === "local";
    return `
      ${pageHeader("Profile & backup", { addNote: false })}

      <section class="card">
        <h2>👤 Profile</h2>
        <form id="profile-form" class="form-grid">
          <div class="field"><label for="p-name">Name</label><input id="p-name" value="${esc(user.name)}" required></div>
          <div class="field"><label for="p-email">Email</label><input id="p-email" value="${esc(user.email)}" readonly></div>
          <div class="form-actions"><button class="btn" type="submit">Save profile</button></div>
        </form>
        <p class="muted small" id="profile-message" role="status">Your account email cannot be changed here.</p>
      </section>

      ${dataCard(isLocal)}

      <section class="card">
        <h2>Appearance</h2>
        <div class="button-row" style="margin-top:0">
          <button class="btn btn-outline" data-theme="light">Light</button>
          <button class="btn btn-outline" data-theme="dark">Dark</button>
          <button class="btn btn-outline" id="welcome-btn">Replay welcome</button>
        </div>
      </section>

      ${isLocal ? "" : `
      <section class="card">
        <h2>Delete account</h2>
        <p class="muted small">This permanently deletes your account and all of your farm records.</p>
        <button class="btn btn-outline" id="delete-btn">Delete my account</button>
      </section>`}`;
  },

  mount(root) {
    $("#profile-form", root).addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        state.user = (await api("/auth/me", { method: "PUT", body: { name: $("#p-name").value } })).user;
        $("#profile-message").textContent = "Saved ✓";
      } catch (error) {
        $("#profile-message").textContent = error.message;
      }
    });

    $("#backup-btn", root).addEventListener("click", async () => {
      try {
        const backup = await api("/export");
        const box = $("#backup-text");
        box.hidden = false;
        box.value = JSON.stringify(backup, null, 2);
      } catch (error) {
        alert(error.message);
      }
    });

    const resetButton = $("#reset-btn", root);
    if (resetButton) {
      resetButton.addEventListener("click", async () => {
        if (!confirm("Replace everything on this device with the demo data?")) return;
        localApi.reset();
        await loadData();
        navigate("home");
      });
    }

    const logoutButton = $("#logout-btn", root);
    if (logoutButton) logoutButton.addEventListener("click", logout);

    root.querySelectorAll("[data-theme]").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
    $("#welcome-btn", root).addEventListener("click", () => showOnboarding(() => renderPage()));

    const deleteButton = $("#delete-btn", root);
    if (deleteButton) {
      deleteButton.addEventListener("click", async () => {
        if (prompt("Type DELETE to permanently remove your account and all data.") !== "DELETE") return;
        try {
          await api("/auth/me", { method: "DELETE" });
          storageRemove("cm_onboarded");
          logout();
        } catch (error) {
          alert(error.message);
        }
      });
    }
  },
};
})();
