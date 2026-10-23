const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  consentId: { type: mongoose.Schema.Types.ObjectId, ref: "Consent", required: true },
  action: { type: String, enum: ["view-records", "created-record", "updated-record", "deleted-record"], default: "view-records" },
  accessedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AccessLog", accessLogSchema);
