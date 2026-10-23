const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  familyProfileId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  tokenHash: { type: String, required: true, unique: true, select: false },
  recordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" }],
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Consent", consentSchema);
