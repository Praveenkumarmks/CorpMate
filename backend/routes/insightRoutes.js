const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { getAnalytics } = require("../controllers/analyticsController");
const { getPrediction } = require("../controllers/predictionController");
const { getAll } = require("../controllers/syncController");

router.use(protect);
router.get("/analytics", getAnalytics);
router.get("/predict", getPrediction);
router.get(["/all", "/export"], getAll);

module.exports = router;
