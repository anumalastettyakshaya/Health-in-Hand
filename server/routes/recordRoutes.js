const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const controller = require("../controllers/recordController");

router.use(auth);
router.post("/", upload.single("file"), controller.createRecord);
router.get("/", controller.getRecords);
router.get("/shared", controller.getSharedRecords);
router.get("/:id/file", controller.openRecordFile);
router.patch("/:id", controller.updateRecord);
router.delete("/:id", controller.deleteRecord);

module.exports = router;
