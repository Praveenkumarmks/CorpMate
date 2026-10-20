const router = require("express").Router();
const auth = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/signup", auth.signup);
router.post("/login", auth.login);
router.post("/forgot", auth.forgotPassword);
router.post("/reset", auth.resetPassword);

router.route("/me").all(protect).get(auth.getMe).put(auth.updateMe).delete(auth.deleteMe);

module.exports = router;
