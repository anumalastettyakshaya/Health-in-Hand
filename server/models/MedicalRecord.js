const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  familyProfileId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recordType: {
    type: String,
    enum: ["prescription", "lab-report", "diagnosis", "scan", "other"],
    default: "other"
  },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 3000 },
  provider: { type: String, trim: true, maxlength: 200 },
  doctorName: { type: String, trim: true, maxlength: 150 },
  medication: { type: String, trim: true, maxlength: 500 },
  followUp: { type: String, trim: true, maxlength: 500 },
  recordDate: { type: Date, default: Date.now },
  // Internal local path only. Never return this path directly to the frontend.
  filePath: { type: String, select: false },
  originalFileName: { type: String, maxlength: 255 },
  verifiedByDoctor: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
