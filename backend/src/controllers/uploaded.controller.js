const db = require("../config/database");

// Retrieve all uploaded files belonging to the authenticated user
const getUploadedFiles = async (req, res) => {
    try {
        const [files] = await db.execute(
            `SELECT file_id, file_name, uploaded_at
             FROM uploaded_files
             WHERE user_id = ?
             ORDER BY uploaded_at DESC, file_id DESC`,
            [req.user.user_id]
        );

        res.json({
            status: "success",
            files
        });

    } catch (error) {
        console.error("Fetch uploaded files error:", error);

        res.status(500).json({
            status: "error",
            code: "UPLOADED_FILES_FETCH_ERROR",
            message: "Unable to fetch uploaded files"
        });
    }
};


// Retrieve one uploaded file belonging to the authenticated user
const getUploadedFile = async (req, res) => {
    try {
        const { id } = req.params;

        const [files] = await db.execute(
            `SELECT file_id, file_name, extracted_text, uploaded_at
             FROM uploaded_files
             WHERE file_id = ? AND user_id = ?`,
            [id, req.user.user_id]
        );

        if (files.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "File not found"
            });
        }

        res.json({
            status: "success",
            file: files[0]
        });

    } catch (error) {
        console.error("Fetch uploaded file error:", error);

        res.status(500).json({
            status: "error",
            message: "Unable to fetch uploaded file"
        });
    }
};


module.exports = {
    getUploadedFiles,
    getUploadedFile
};