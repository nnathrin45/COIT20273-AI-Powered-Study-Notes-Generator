const db = require("../config/database");

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
    getUploadedFile
};