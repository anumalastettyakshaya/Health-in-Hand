const crypto = require("crypto");
const Consent = require("../models/Consent");
const MedicalRecord = require("../models/MedicalRecord");
const AccessLog = require("../models/AccessLog");

exports.createConsent = async (req, res, next) => {
  try {
    const requestedMinutes = Number(req.body.expiresInMinutes || 15);
    if (!Number.isInteger(requestedMinutes) || requestedMinutes < 1 || requestedMinutes > 60) {
      return res.status(400).json({ message: "expiresInMinutes must be an integer from 1 to 60." });
    }

    const selectedId = req.headers["x-profile-id"];
    const familyProfileId = selectedId && selectedId !== "self" ? req.user.familyProfiles?.id(selectedId)?._id : null;
    if (selectedId && selectedId !== "self" && !familyProfileId) return res.status(400).json({ message: "Selected family profile is invalid." });
    let recordIds = [];
    if (Array.isArray(req.body.recordIds) && req.body.recordIds.length) {
      const validRecords = await MedicalRecord.find({
        _id: { $in: req.body.recordIds },
        patientId: req.user._id, familyProfileId
      }).select("_id");
      if (validRecords.length !== req.body.recordIds.length) {
        return res.status(400).json({ message: "One or more selected records do not belong to you." });
      }
      recordIds = validRecords.map(record => record._id);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + requestedMinutes * 60 * 1000);

    const consent = await Consent.create({
      patientId: req.user._id,
      familyProfileId,
      tokenHash,
      recordIds,
      expiresAt
    });

    // The raw token is returned only at creation; the database stores its hash.
    res.status(201).json({
      message: "Temporary access created. Share the token only with the intended doctor.",
      consent: { id: consent._id, expiresAt: consent.expiresAt },
      accessToken: rawToken
    });
  } catch (error) {
    next(error);
  }
};

exports.listMyConsents = async (req, res, next) => {
  try {
    const consents = await Consent.find({ patientId: req.user._id })
      .select("-tokenHash")
      .populate("doctorId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ consents });
  } catch (error) {
    next(error);
  }
};

exports.revokeConsent = async (req, res, next) => {
  try {
    const consent = await Consent.findOne({
      _id: req.params.id,
      patientId: req.user._id
    });
    if (!consent) return res.status(404).json({ message: "Consent not found." });
    if (!consent.revokedAt) {
      consent.revokedAt = new Date();
      await consent.save();
    }
    res.json({ message: "Access revoked.", revokedAt: consent.revokedAt });
  } catch (error) {
    next(error);
  }
};

exports.verifyConsent = async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can verify a patient access token." });
    }
    const rawToken = req.params.token;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const consent = await Consent.findOne({ tokenHash }).select("+tokenHash");
    if (!consent || consent.revokedAt || consent.expiresAt <= new Date()) {
      return res.status(403).json({ valid: false, message: "Token is invalid, expired, or revoked." });
    }
    res.json({ valid: true, expiresAt: consent.expiresAt });
  } catch (error) {
    next(error);
  }
};

exports.clearAllConsents = async (req, res, next) => {
  try {
    const result = await Consent.deleteMany({ patientId: req.user._id });
    res.json({ message: "All access grants cleared.", deletedCount: result.deletedCount || 0 });
  } catch (error) { next(error); }
};

exports.revokeAllConsents = async (req, res, next) => {
  try {
    const result = await Consent.updateMany({ patientId: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { revokedAt: new Date() } });
    res.json({ message: "All active access grants revoked.", revokedCount: result.modifiedCount || 0 });
  } catch (error) { next(error); }
};

exports.clearPatientAccessLog = async (req, res, next) => {
  try {
    const consents = await Consent.find({ patientId: req.user._id }).select("_id").lean();
    const ids = consents.map(c => c._id);
    const result = await AccessLog.deleteMany({ patientId: req.user._id });
    res.json({ message: "Access history cleared.", deletedCount: result.deletedCount || 0 });
  } catch (error) { next(error); }
};
