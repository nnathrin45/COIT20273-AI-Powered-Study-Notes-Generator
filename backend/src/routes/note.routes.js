const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/auth.middleware");

const {
    createNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteNote
} = require("../controllers/note.controller");

router.post("/", authenticateUser, createNote);

router.get("/", authenticateUser, getAllNotes);

router.get("/:id", authenticateUser, getNoteById);

router.put("/:id", authenticateUser, updateNote);
router.delete("/:id", authenticateUser, deleteNote);

module.exports = router;