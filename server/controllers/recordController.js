const MedicalRecord = require("../models/MedicalRecord");
const Consent = require("../models/Consent");
const AccessLog = require("../models/AccessLog");
const crypto = require("crypto");

const selectedProfile = (req) => {
  const id = req.headers["x-profile-id"] || req.body.familyProfileId;
  if (!id || id === "self") return null;
  if (!req.user.familyProfiles?.id(id)) return undefined;
  return id;
};
const allowedRecordTypes = ["prescription", "lab-report", "diagnosis", "scan", "other"];

exports.createRecord = async (req, res, next) => {
  try {
    const patientId = req.user.role === "patient" ? req.user._id : req.body.patientId;
    const familyProfileId = req.user.role === "patient" ? selectedProfile(req) : null;
    if (req.user.role === "patient" && familyProfileId === undefined) return res.status(400).json({ message: "Selected family profile is invalid." });

    if (!patientId) {
      if (req.file) require("fs").unlink(req.file.path, () => {});
      return res.status(400).json({ message: "patientId is required for a doctor-created record." });
    }
    if (req.user.role === "doctor" && !req.body.patientId) {
      if (req.file) require("fs").unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Provide patientId for a doctor-created record." });
    }

    const { title, description, recordType, recordDate } = req.body;
    if (!title || !title.trim()) {
      if (req.file) require("fs").unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Record title is required." });
    }
    if (recordType && !allowedRecordTypes.includes(recordType)) {
      if (req.file) require("fs").unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Invalid recordType." });
    }

    // A doctor may create a record only when they have active consent for that patient.
    let activeConsents = [];
    if (req.user.role === "doctor") {
      activeConsents = await Consent.find({
        patientId,
        doctorId: req.user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      }).select("_id familyProfileId");
      if (!activeConsents.length) {
        if (req.file) require("fs").unlink(req.file.path, () => {});
        return res.status(403).json({ message: "Active patient consent is required before adding a record." });
      }
    }

    const record = await MedicalRecord.create({
      patientId,
      familyProfileId: req.user.role === "doctor" ? (activeConsents?.[0]?.familyProfileId || null) : familyProfileId,
      createdBy: req.user._id,
      recordType: recordType || "other",
      title: title.trim(),
      description,
      provider: req.body.provider,
      doctorName: req.body.doctorName,
      medication: req.body.medication,
      followUp: req.body.followUp,
      recordDate: recordDate || new Date(),
      filePath: req.file ? req.file.path : undefined,
      originalFileName: req.file ? req.file.originalname : undefined,
      verifiedByDoctor: req.user.role === "doctor"
    });

    if (req.user.role === "doctor" && activeConsents[0]) await AccessLog.create({ patientId, doctorId: req.user._id, consentId: activeConsents[0]._id, action: "created-record" });

    res.status(201).json({
      message: "Medical record created.",
      record: {
        id: record._id,
        patientId: record.patientId,
        createdBy: record.createdBy,
        recordType: record.recordType,
        title: record.title,
        description: record.description,
        recordDate: record.recordDate,
        originalFileName: record.originalFileName,
        verifiedByDoctor: record.verifiedByDoctor,
        createdAt: record.createdAt
      }
    });
  } catch (error) {
    if (req.file) require("fs").unlink(req.file.path, () => {});
    next(error);
  }
};

exports.getRecords = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "patient") {
      filter.patientId = req.user._id;
      const selected = selectedProfile(req);
      if (selected === undefined) return res.status(400).json({ message: "Selected family profile is invalid." });
      filter.familyProfileId = selected;
    } else {
      return res.status(403).json({
        message: "Doctors must use GET /api/records/shared with an active patient access token."
      });
    }

    const records = await MedicalRecord.find(filter)
      .select("-filePath")
      .populate("createdBy", "name role")
      .sort({ recordDate: -1 })
      .lean();

    res.json({ records });
  } catch (error) {
    next(error);
  }
};

exports.getSharedRecords = async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can use shared-record access." });
    }

    const rawToken = req.headers["x-access-token"];
    if (!rawToken || typeof rawToken !== "string") {
      return res.status(400).json({ message: "Provide the patient access token in the X-Access-Token header." });
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const consent = await Consent.findOne({
      tokenHash,
      doctorId: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).select("+tokenHash");

    if (!consent) {
      return res.status(403).json({ message: "Access token is invalid, expired, revoked, or assigned to another doctor. Verify the token again using the same doctor account." });
    }

    const recordFilter = { patientId: consent.patientId, familyProfileId: consent.familyProfileId || null };
    if (consent.recordIds && consent.recordIds.length) {
      recordFilter._id = { $in: consent.recordIds };
    }

    const [patient, records] = await Promise.all([
      require("../models/User").findById(consent.patientId).select("name email familyProfiles"),
      MedicalRecord.find(recordFilter)
        .select("-filePath")
        .populate("createdBy", "name role")
        .sort({ recordDate: -1 })
        .lean()
    ]);

    await AccessLog.create({
      patientId: consent.patientId,
      doctorId: req.user._id,
      consentId: consent._id,
      action: "view-records"
    });

    res.json({
      patient: patient ? (() => { const fp = consent.familyProfileId ? patient.familyProfiles.id(consent.familyProfileId) : null; return { id: patient._id, name: fp?.name || patient.name, email: fp?.email || patient.email, relation: fp?.relation || "Self" }; })() : null,
      records,
      consent: { expiresAt: consent.expiresAt, recordCount: records.length }
    });
  } catch (error) {
    next(error);
  }
};


exports.updateRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found." });
    if (String(record.createdBy) !== String(req.user._id)) return res.status(403).json({ message: "Only the person who added this record can edit it." });
    if (req.body.title !== undefined) { const title = String(req.body.title).trim(); if (!title) return res.status(400).json({ message: "Record title is required." }); record.title = title; }
    if (req.body.description !== undefined) record.description = String(req.body.description).slice(0, 3000);
    for (const field of ["provider", "doctorName", "medication", "followUp"]) { if (req.body[field] !== undefined) record[field] = String(req.body[field]).trim().slice(0, ({provider:200, doctorName:150, medication:500, followUp:500})[field]); }
    if (req.body.recordType !== undefined && allowedRecordTypes.includes(req.body.recordType)) record.recordType = req.body.recordType;
    if (req.body.recordDate !== undefined) record.recordDate = req.body.recordDate;
    await record.save(); if (req.user.role === "doctor") { const consent = await Consent.findOne({ patientId: record.patientId, doctorId: req.user._id, familyProfileId: record.familyProfileId || null, revokedAt: null, expiresAt: { $gt: new Date() } }); if (consent) await AccessLog.create({ patientId: record.patientId, doctorId: req.user._id, consentId: consent._id, action: "updated-record" }); } res.json({ message: "Record updated.", record });
  } catch (error) { next(error); }
};
exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id).select("+filePath");
    if (!record) return res.status(404).json({ message: "Record not found." });
    if (String(record.createdBy) !== String(req.user._id)) return res.status(403).json({ message: "Only the person who added this record can delete it." });
    if (record.filePath) require("fs").unlink(record.filePath, () => {});
    if (req.user.role === "doctor") { const consent = await Consent.findOne({ patientId: record.patientId, doctorId: req.user._id, familyProfileId: record.familyProfileId || null, revokedAt: null, expiresAt: { $gt: new Date() } }); if (consent) await AccessLog.create({ patientId: record.patientId, doctorId: req.user._id, consentId: consent._id, action: "deleted-record" }); } await record.deleteOne(); res.json({ message: "Record deleted." });
  } catch (error) { next(error); }
};
exports.openRecordFile = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id).select("+filePath patientId familyProfileId originalFileName");
    if (!record || !record.filePath) return res.status(404).json({ message: "File not found." });
    let allowed = req.user.role === "patient" && String(record.patientId) === String(req.user._id);
    if (req.user.role === "patient") {
      const selected = selectedProfile(req);
      allowed = allowed && (String(record.familyProfileId || "") === String(selected || ""));
    }
    if (!allowed && req.user.role === "doctor") {
      const rawToken = req.headers["x-access-token"];
      if (rawToken) {
        const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const consent = await Consent.findOne({
          tokenHash: hash,
          doctorId: req.user._id,
          revokedAt: null,
          expiresAt: { $gt: new Date() }
        });
        allowed = !!consent && String(consent.patientId) === String(record.patientId) && (!consent.recordIds.length || consent.recordIds.some(id => String(id) === String(record._id)));
      }
    }
    if (!allowed) return res.status(403).json({ message: "You do not have access to this file." });
    res.setHeader("Content-Disposition", `inline; filename="${String(record.originalFileName || "medical-record").replace(/[\"\r\n]/g, "_")}"`);
    res.sendFile(require("path").resolve(record.filePath));
  } catch (error) { next(error); }
};
