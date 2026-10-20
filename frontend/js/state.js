(function () {
"use strict";
// The app's shared data. Pages read from here; the server is the source of truth.

function emptyData() {
  return {
    farms: [], fields: [], crops: [], notes: [], harvests: [], fertilizers: [], pesticides: [],
    irrigations: [], labour: [], expenses: [], sales: [], pestrecords: [], diagnoses: [],
  };
}

const state = {
  user: null,        // { id, name, email }
  data: emptyData(), // everything loaded from GET /api/all
  sync: "ok",        // ok | syncing | offline | error
};
CM.state = { emptyData, state };
})();
