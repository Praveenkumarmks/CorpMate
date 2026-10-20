(function () {
"use strict";
// The full-screen layer used by the welcome slides and the login screen.
const { $ } = CM.utils;

function showOverlay(html) {
  const overlay = $("#overlay");
  overlay.innerHTML = html;
  overlay.hidden = false;
  return overlay;
}

function hideOverlay() {
  const overlay = $("#overlay");
  overlay.hidden = true;
  overlay.innerHTML = "";
}
CM.overlay = { showOverlay, hideOverlay };
})();
