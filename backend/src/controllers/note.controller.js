const db = require("../config/database");

const createNote = async (req, res) => {
    try {

        const { title, content } = req.body;
        const user_id = req.user.user_id;

        if (!title || !content) {
            return res.status(400).json({
                status: "error",
                message: "Title and Content are required"
            });
        }

        await db.execute(
            "INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)",
            [title, content, user_id]
        );

        res.status(201).json({
            status: "success",
            message: "Note Created Successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Unable to create note"
        });

    }
};

const getAllNotes = async (req, res) => {
    try {

        const [notes] = await db.execute(
            "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.user_id]
        );

        res.json({
            status: "success",
            notes
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Unable to fetch notes"
        });

    }
};

const getNoteById = async (req, res) => {
    try {

        const { id } = req.params;

        const [notes] = await db.execute(
            "SELECT * FROM notes WHERE note_id = ? AND user_id = ?",
            [id, req.user.user_id]
        );

        if (notes.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Note not found"
            });
        }

        res.json({
            status: "success",
            note: notes[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Unable to fetch note"
        });

    }
};

const updateNote = async (req, res) => {
    try {

        const { id } = req.params;
        const { title, content } = req.body;

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                status: "error",
                message: "Title and Content are required"
            });
        }

        const [result] = await db.execute(
            `UPDATE notes
             SET title = ?, content = ?
             WHERE note_id = ? AND user_id = ?`,
            [title, content, id, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Note not found"
            });
        }

        res.json({
            status: "success",
            message: "Note Updated Successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Unable to update note"
        });

    }
};

const deleteNote = async (req, res) => {
    try {

        const { id } = req.params;

        const [result] = await db.execute(
            "DELETE FROM notes WHERE note_id = ? AND user_id = ?",
            [id, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Note not found"
            });
        }

        res.json({
            status: "success",
            message: "Note Deleted Successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Unable to delete note"
        });

    }
};

module.exports = {
    createNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteNote
};