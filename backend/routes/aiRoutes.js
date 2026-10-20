const router = require("express").Router();
const ai = require("../controllers/aiController");

router.post("/structure", ai.structureNote);
router.post("/doctor", ai.diagnoseCrop);
router.post("/chat", ai.chat);
router.post("/assistant", ai.askAssistant);
router.post("/market", ai.marketPrice);

module.exports = router;
