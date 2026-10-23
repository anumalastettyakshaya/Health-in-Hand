const AccessLog = require("../models/AccessLog");
const Consent = require("../models/Consent");
const User = require("../models/User");

exports.getMyProfile = async (req, res) => {
  res.json({
    doctor: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      age: req.user.age,
      gender: req.user.gender,
      doctorRegistrationNumber: req.user.doctorRegistrationNumber
    }
  });
};

exports.findPatientByEmail = async (req, res, next) => {
  try {
    const email = (req.query.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Provide a patient email to search." });

    // Return only the minimum details needed to identify the patient.
    const patient = await User.findOne({ email, role: "patient" }).select("name email");
    if (!patient) return res.status(404).json({ message: "Patient not found." });

    res.json({ patient: { id: patient._id, name: patient.name, email: patient.email } });
  } catch (error) {
    next(error);
  }
};

exports.getAccessLog = async (req, res, next) => {
  try {
    const logs = await AccessLog.find({ doctorId: req.user._id }).sort({ accessedAt: -1 }).limit(1000).populate("patientId", "name email familyProfiles").populate("consentId", "familyProfileId").lean();
    res.json({ logs: logs.map(log => { const patient = log.patientId || {}; const profileId = log.consentId?.familyProfileId; const profile = profileId && patient.familyProfiles ? patient.familyProfiles.find(p => String(p._id) === String(profileId)) : null; return { id: log._id, patientName: profile?.name || patient.name || "Patient", action: log.action === "view-records" ? "Viewed records" : log.action === "created-record" ? "Added record" : log.action === "updated-record" ? "Updated record" : log.action === "deleted-record" ? "Deleted record" : log.action, accessedAt: log.accessedAt }; }) });
  } catch (error) { next(error); }
};
