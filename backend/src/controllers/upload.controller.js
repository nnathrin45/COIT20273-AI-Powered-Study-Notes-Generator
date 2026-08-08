const path = require("path");
const db = require("../config/database");
const { extractTextFromPDF } = require("../services/pdf.service");

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                message: "No file uploaded"
            });
        }

        const filePath = path.resolve(req.file.path);

        // Extract text from PDF
        const extractedText = await extractTextFromPDF(filePath);

        console.log("Extracted PDF Text:");
        console.log(extractedText);

        // Save file information and extracted text
        await db.execute(
            `INSERT INTO uploaded_files
            (user_id, file_name, file_path, extracted_text)
            VALUES (?, ?, ?, ?)`,
            [
                req.user.user_id,
                req.file.originalname,
                req.file.path,
                extractedText
            ]
        );

        res.status(201).json({
            status: "success",
            message: "File uploaded and text extracted successfully",
            file: {
                file_name: req.file.originalname,
                file_path: req.file.path
            },
            text_length: extractedText.length
        });

    } catch (error) {
        console.error("Upload/Extraction Error:", error);

        res.status(500).json({
            status: "error",
            message: "Unable to upload or process file"
        });
    }
};

module.exports = {
    uploadFile
};