const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { authLimiter, aiLimiter } = require("../middleware/rateLimiters");

router.get("/health", (req, res) => res.json({ ok: true }));

router.use("/auth", authLimiter, require("./authRoutes"));
router.use("/ai", protect, aiLimiter, require("./aiRoutes"));
router.use(require("./noteRoutes"));
router.use(require("./insightRoutes"));
router.use(require("./recordRoutes"));

module.exports = router;
