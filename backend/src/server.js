require("dotenv").config();

// Fail fast rather than signing tokens with undefined
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Copy .env.example to .env and set it."
  );
}

const express = require("express");
const cors = require("cors");

const db = require("./config/database");
const authenticateUser = require("./middleware/auth.middleware");

const healthRoutes = require("./routes/health.routes");
const userRoutes = require("./routes/user.routes");
const noteRoutes = require("./routes/note.routes");
const uploadRoutes = require("./routes/upload.routes");
const uploadedRoutes = require("./routes/uploaded.routes");
const consentRoutes = require("./routes/consent.routes");
const aiRoutes = require("./routes/ai.routes");
const studyPlanRoutes = require("./routes/studyPlan.routes");
const progressRoutes = require("./routes/progress.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Allow the React frontend to communicate with the backend
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies
app.use(express.json());

// API routes
app.use("/api", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/uploaded", uploadedRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/study-plans", studyPlanRoutes);
app.use("/api/progress", progressRoutes);

// Protected profile route
app.get("/api/profile", authenticateUser, (req, res) => {
  res.json({
    status: "success",
    user: req.user,
  });
});

// Test route
app.get("/test", (req, res) => {
  res.send("Server is updated");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});