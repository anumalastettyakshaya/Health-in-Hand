require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const recordRoutes = require("./routes/recordRoutes");
const consentRoutes = require("./routes/consentRoutes");

const app = express();

const defaultOrigins = process.env.NODE_ENV === "production"
  ? []
  : ["http://127.0.0.1:5500", "http://localhost:5500"];
const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map(origin => origin.trim()).filter(Boolean);
const corsOrigins = allowedOrigins.length ? allowedOrigins : defaultOrigins;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes("*") || corsOrigins.includes(origin)) return callback(null, true);
    // Permit local development frontends on localhost/127.0.0.1 regardless of Live Server port.
    try { const parsed = new URL(origin); if (["localhost", "127.0.0.1"].includes(parsed.hostname)) return callback(null, true); } catch (_) {}
    return callback(new Error("Origin is not allowed by CLIENT_ORIGIN."));
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    name: "Health in Hand API",
    status: "running",
    message: "Backend server is running."
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "health-in-hand-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/consents", consentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({
    message: err.status ? err.message : "Something went wrong on the server."
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }
    if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
      throw new Error("CLIENT_ORIGIN must contain the deployed frontend origin in production.");
    }
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Health in Hand API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
