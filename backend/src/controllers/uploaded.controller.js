const fs = require("fs");
const path = require("path");
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

    return res.json({
      status: "success",
      files
    });
  } catch (error) {
    console.error("Fetch uploaded files error:", error);

    return res.status(500).json({
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

    const fileId = Number(id);

    if (!Number.isInteger(fileId) || fileId <= 0) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_FILE_ID",
        message: "A valid file ID is required"
      });
    }

    const [files] = await db.execute(
      `SELECT file_id, file_name, extracted_text, uploaded_at
       FROM uploaded_files
       WHERE file_id = ? AND user_id = ?`,
      [fileId, req.user.user_id]
    );

    if (files.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found"
      });
    }

    return res.json({
      status: "success",
      file: files[0]
    });
  } catch (error) {
    console.error("Fetch uploaded file error:", error);

    return res.status(500).json({
      status: "error",
      code: "UPLOADED_FILE_FETCH_ERROR",
      message: "Unable to fetch uploaded file"
    });
  }
};


// Delete one uploaded file belonging to the authenticated user
const deleteUploadedFile = async (req, res) => {
  try {
    const { id } = req.params;

    const fileId = Number(id);

    if (!Number.isInteger(fileId) || fileId <= 0) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_FILE_ID",
        message: "A valid file ID is required"
      });
    }

    // Retrieve the file first so ownership is verified and the physical
    // file path is available before deleting the database record.
    const [files] = await db.execute(
      `SELECT file_id, file_name, file_path
       FROM uploaded_files
       WHERE file_id = ? AND user_id = ?`,
      [fileId, req.user.user_id]
    );

    if (files.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found"
      });
    }

    const file = files[0];

    // Delete the database record.
    // Related ai_outputs are removed by the database foreign-key cascade.
    // Related quiz_attempts then cascade through ai_outputs.
    const [result] = await db.execute(
      `DELETE FROM uploaded_files
       WHERE file_id = ? AND user_id = ?`,
      [fileId, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found"
      });
    }

    /*
     * Multer stores uploads in backend/src/uploads.
     *
     * Use only the basename stored in the database and rebuild the path
     * inside the known uploads directory. This prevents a stored path from
     * being used to delete a file outside the application's upload folder.
     */
    const uploadDirectory = path.resolve(
      __dirname,
      "../uploads"
    );

    const storedFileName = path.basename(file.file_path);

    const physicalFilePath = path.resolve(
      uploadDirectory,
      storedFileName
    );

    try {
      await fs.promises.unlink(physicalFilePath);
    } catch (fileError) {
      /*
       * If the physical file is already missing, the database deletion
       * is still considered successful.
       *
       * Other filesystem failures are logged for maintenance. The database
       * row has already been deleted, so returning a deletion failure here
       * would incorrectly suggest that retrying the API can restore it.
       */
      if (fileError.code !== "ENOENT") {
        console.error(
          "Physical uploaded file cleanup error:",
          fileError
        );
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Uploaded file deleted successfully",
      file: {
        file_id: file.file_id,
        file_name: file.file_name
      }
    });
  } catch (error) {
    console.error("Delete uploaded file error:", error);

    return res.status(500).json({
      status: "error",
      code: "UPLOADED_FILE_DELETE_ERROR",
      message: "Unable to delete uploaded file"
    });
  }
};


module.exports = {
  getUploadedFiles,
  getUploadedFile,
  deleteUploadedFile
};