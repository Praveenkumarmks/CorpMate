const { RESOURCES } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

// Returns everything that belongs to the logged-in user.
// The app calls this after login, and it doubles as a full backup.
const getAll = asyncHandler(async (req, res) => {
  const names = Object.keys(RESOURCES);
  const results = await Promise.all(
    names.map((name) => {
      const sort = name === "harvests" ? { date: 1 } : { createdAt: -1 };
      return RESOURCES[name].find({ user: req.userId }).sort(sort).limit(5000);
    })
  );
  res.json(Object.fromEntries(names.map((name, i) => [name, results[i]])));
});

module.exports = { getAll };
