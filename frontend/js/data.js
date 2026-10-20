(function () {
"use strict";
const { api } = CM.api;
const { state, emptyData } = CM.state;

// Loads everything the logged-in farmer owns.
async function loadData() {
  state.data = { ...emptyData(), ...(await api("/all")) };
}

function resetData() {
  state.data = emptyData();
}
CM.data = { loadData, resetData };
})();
