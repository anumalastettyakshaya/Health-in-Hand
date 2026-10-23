const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const controller = require("../controllers/patientController");

router.use(auth, requireRole("patient"));
router.get("/me", controller.getMyProfile);
router.get("/summary", controller.getMySummary);
router.get("/profiles", controller.listProfiles);
router.post("/profiles", controller.createProfile);
router.patch("/profiles/:id", controller.updateProfile);
router.delete("/profiles/:id", controller.deleteProfile);

module.exports = router;
