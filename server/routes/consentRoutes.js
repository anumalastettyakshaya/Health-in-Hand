const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const controller = require("../controllers/consentController");

router.post("/", auth, requireRole("patient"), controller.createConsent);
router.get("/", auth, requireRole("patient"), controller.listMyConsents);
router.delete("/access-log", auth, requireRole("patient"), controller.clearPatientAccessLog);
router.post("/revoke-all", auth, requireRole("patient"), controller.revokeAllConsents);
router.delete("/", auth, requireRole("patient"), controller.clearAllConsents);
router.delete("/:id", auth, requireRole("patient"), controller.revokeConsent);
router.get("/verify/:token", auth, requireRole("doctor"), controller.verifyConsent);

module.exports = router;
