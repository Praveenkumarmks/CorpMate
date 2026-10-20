(function () {
"use strict";
// The welcome slides shown the first time the app opens.
const { $, esc, storageSet } = CM.utils;
const { showOverlay, hideOverlay } = CM.overlay;

const SLIDES = [
  { title: "TRACK", text: "Your Farm", icon: "🌿" },
  { title: "ANALYZE", text: "Your Growth", icon: "📊" },
  { title: "PREDICT", text: "Better Yields", icon: "💡" },
  { title: "BACKUP", text: "Always Safe", icon: "☁️" },
  { title: "GROW", text: "A Better Tomorrow", icon: "🌅" },
];

// Sunrise hills, a farmhouse, a windmill and a palm tree.
const SCENERY = `
<svg class="scenery" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 70Q100 20 200 60T400 50V140H0Z" fill="#1d5e2b"/>
  <path d="M0 95Q120 55 250 90T400 80V140H0Z" fill="#2F7D32"/>
  <path d="M0 120Q150 85 400 115V140H0Z" fill="#66BB6A"/>
  <rect x="60" y="80" width="34" height="20" fill="#6D4C41"/>
  <path d="M56 80l21-16 21 16z" fill="#a1612f"/>
  <path d="M340 100L346 52L352 100Z" fill="#6D4C41"/>
  <path d="M346 52V32M346 52L366 58M346 52L326 58" stroke="#6D4C41" stroke-width="3"/>
  <path d="M300 104Q298 76 306 56" stroke="#6D4C41" stroke-width="3" fill="none"/>
  <path d="M306 56q-14-6-22 4M306 56q14-8 24 2M306 56q-4-14-14-14M306 56q6-14 16-12" stroke="#2F7D32" stroke-width="4" fill="none"/>
</svg>`;

function showOnboarding(onDone, startAt = 0) {
  let index = startAt;

  const finish = () => {
    storageSet("cm_onboarded", "1");
    hideOverlay();
    onDone();
  };

  const draw = () => {
    const slide = SLIDES[index];
    const last = index === SLIDES.length - 1;
    showOverlay(`
      ${SCENERY}
      <img class="logo" src="assets/logo.jpg" alt="CropMate">
      <h1>CropMate</h1>
      <p class="tagline">Farm Smarter. Grow Better. Together.</p>
      <div class="slide-icon">${slide.icon}</div>
      <h2 class="slide-title">${esc(slide.title)}</h2>
      <p class="slide-text">${esc(slide.text)}</p>
      <div class="button-row" style="justify-content:center">
        <button class="btn btn-sun" id="onb-next">${last ? "Get Started" : "Next"}</button>
        <button class="btn btn-outline" id="onb-skip">Skip</button>
      </div>
      <p class="small" style="margin-top:16px">More than a farm app. A partner in your farming journey.</p>`);

    $("#onb-next").addEventListener("click", () => (last ? finish() : (index++, draw())));
    $("#onb-skip").addEventListener("click", finish);
  };

  draw();
}
CM.onboarding = { showOnboarding };
})();
