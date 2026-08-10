require("dotenv").config();
const express = require("express");
const db = require("./config/database");
const authenticateUser = require("./middleware/auth.middleware");

const app = express();

const PORT = 5000;

const healthRoutes = require("./routes/health.routes");
const userRoutes = require("./routes/user.routes");
const noteRoutes = require("./routes/note.routes");
const uploadRoutes = require("./routes/upload.routes");
const uploadedRoutes = require("./routes/uploaded.routes");

app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/uploaded", uploadedRoutes);

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