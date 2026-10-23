const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const controller = require("../controllers/doctorController");

router.use(auth, requireRole("doctor"));
router.get("/me", controller.getMyProfile);
router.get("/access-log", controller.getAccessLog);
router.get("/find-patient", controller.findPatientByEmail);

module.exports = router;
