const MedicalRecord = require("../models/MedicalRecord");
const Consent = require("../models/Consent");
const AccessLog = require("../models/AccessLog");

exports.getMyProfile = async (req, res) => {
  const selectedId = req.headers["x-profile-id"];
  const selected = selectedId && selectedId !== "self" ? req.user.familyProfiles?.id(selectedId) : null;
  if (selectedId && selectedId !== "self" && !selected) return res.status(400).json({ message: "Selected family profile is invalid." });
  res.json({ patient: { id: selected?._id || req.user._id, accountId: req.user._id, name: selected?.name || req.user.name, email: selected ? (selected.email || "") : req.user.email, phone: selected ? (selected.phone || "") : req.user.phone, age: selected?.age ?? req.user.age, gender: selected?.gender ?? req.user.gender, relation: selected?.relation || "Self", dateOfBirth: req.user.dateOfBirth } });
};

exports.getMySummary = async (req, res, next) => {
  try {
    const selectedId = req.headers["x-profile-id"];
    const profileId = selectedId && selectedId !== "self" ? req.user.familyProfiles?.id(selectedId)?._id : null;
    if (selectedId && selectedId !== "self" && !profileId) return res.status(400).json({ message: "Selected family profile is invalid." });
    const consentFilter = { patientId: req.user._id, familyProfileId: profileId };
    const profileConsentIds = await Consent.find(consentFilter).distinct("_id");
    const [recordCount, activeConsentCount, recentRecords, recentAccess, accessCount] = await Promise.all([
      MedicalRecord.countDocuments({ patientId: req.user._id, familyProfileId: profileId }),
      Consent.countDocuments({
        ...consentFilter,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      }),
      MedicalRecord.find({ patientId: req.user._id, familyProfileId: profileId })
        .select("-filePath")
        .sort({ recordDate: -1 })
        .limit(5)
        .lean(),
      AccessLog.find({ patientId: req.user._id, consentId: { $in: profileConsentIds } })
        .populate("doctorId", "name email")
        .sort({ accessedAt: -1 })
        .limit(10)
        .lean(),
      AccessLog.countDocuments({ patientId: req.user._id, consentId: { $in: profileConsentIds } })
    ]);

    res.json({ recordCount, activeConsentCount, recentRecords, recentAccess, accessCount });
  } catch (error) {
    next(error);
  }
};


exports.listProfiles = async (req, res) => {
  res.json({ profiles: [{ _id: "self", name: req.user.name, relation: "Self", email: req.user.email, phone: req.user.phone, age: req.user.age, gender: req.user.gender, isSelf: true }, ...(req.user.familyProfiles || []).map(x => ({ _id: x._id, name: x.name, relation: x.relation, email: x.email, phone: x.phone, age: x.age, gender: x.gender, createdAt: x.createdAt }))] });
};
exports.createProfile = async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Profile name is required." });
  req.user.familyProfiles.push({ name, relation: req.body.relation || "Other", email: req.body.email || undefined, phone: req.body.phone || undefined, age: req.body.age !== undefined && req.body.age !== "" ? Number(req.body.age) : undefined, gender: req.body.gender || undefined });
  await req.user.save();
  const profile = req.user.familyProfiles[req.user.familyProfiles.length - 1];
  res.status(201).json({ profile: { _id: profile._id, name: profile.name, relation: profile.relation, email: profile.email, phone: profile.phone } });
};
exports.updateProfile = async (req, res) => {
  const profile = req.user.familyProfiles.id(req.params.id);
  if (!profile) return res.status(404).json({ message: "Family profile not found." });
  for (const key of ["name", "relation", "email", "phone", "age", "gender"]) if (req.body[key] !== undefined) profile[key] = req.body[key];
  await req.user.save();
  res.json({ profile: { _id: profile._id, name: profile.name, relation: profile.relation, email: profile.email, phone: profile.phone, age: profile.age, gender: profile.gender } });
};
exports.deleteProfile = async (req, res, next) => {
  try {
    const profile = req.user.familyProfiles.id(req.params.id);
    if (!profile) return res.status(404).json({ message: "Family profile not found." });
    const MedicalRecord = require("../models/MedicalRecord");
    const Consent = require("../models/Consent");
    const records = await MedicalRecord.find({ patientId: req.user._id, familyProfileId: profile._id }).select("+filePath");
    for (const record of records) if (record.filePath) require("fs").unlink(record.filePath, () => {});
    await Promise.all([
      MedicalRecord.deleteMany({ patientId: req.user._id, familyProfileId: profile._id }),
      Consent.deleteMany({ patientId: req.user._id, familyProfileId: profile._id })
    ]);
    profile.deleteOne(); await req.user.save();
    res.json({ message: "Profile and its records deleted." });
  } catch (error) { next(error); }
};
