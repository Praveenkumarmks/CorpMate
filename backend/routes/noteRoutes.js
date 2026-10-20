const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { convertNote } = require("../controllers/noteController");

// Must be registered before the generic /notes/:id routes.
router.post("/notes/convert", protect, convertNote);

module.exports = router;
