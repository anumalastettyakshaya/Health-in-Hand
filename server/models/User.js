const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["patient", "doctor"], required: true },
  phone: { type: String, trim: true, maxlength: 30 },
  dateOfBirth: { type: Date },
  age: { type: Number, min: 0, max: 120 },
  gender: { type: String, trim: true },
  doctorRegistrationNumber: { type: String, trim: true },
  familyProfiles: [{
    name: { type: String, required: true, trim: true, maxlength: 100 },
    relation: { type: String, default: "Other", trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 30 },
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
