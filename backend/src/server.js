require("dotenv").config();

// Fail fast rather than signing tokens with undefined
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.");
}

const express = require("express");
const db = require("./config/database");
const authenticateUser = require("./middleware/auth.middleware");

const app = express();

const PORT = process.env.PORT || 5000;

const healthRoutes = require("./routes/health.routes");
const userRoutes = require("./routes/user.routes");
const noteRoutes = require("./routes/note.routes");
const uploadRoutes = require("./routes/upload.routes");
const uploadedRoutes = require("./routes/uploaded.routes");
const consentRoutes = require("./routes/consent.routes"); 

app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/uploaded", uploadedRoutes);
app.use("/api/consent", consentRoutes);  

app.get("/api/profile", authenticateUser, (req, res) => {
    res.json({
        status: "success",
        user: req.user
    });
});

app.get("/test", (req, res) => {
    res.send("Server is updated");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});