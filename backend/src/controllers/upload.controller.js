const path = require("path");
const db = require("../config/database");
const { extractTextFromPDF } = require("../services/pdf.service");
const { extractTextFromDOCX } = require("../services/docx.service");
const { extractTextFromTXT } = require("../services/txt.service");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded"
      });
    }

    const filePath = path.resolve(req.file.path);

    // Select the correct extraction service for the file type
    const ext = path.extname(req.file.originalname).toLowerCase();

    let extractedText;

    switch (ext) {
      case ".pdf":
        extractedText = await extractTextFromPDF(filePath);
        break;
      case ".docx":
        extractedText = await extractTextFromDOCX(filePath);
        break;
      case ".txt":
        extractedText = await extractTextFromTXT(filePath);
        break;
      default:
        return res.status(415).json({
          status: "error",
          code: "UNSUPPORTED_FILE_TYPE",
          message: "Unsupported file type"
        });
    }

    // FR8.4 - reject documents with no usable text layer
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(422).json({
        status: "error",
        message: "No readable text could be extracted from this file. " +
                 "Scanned or image-only documents are not supported. " +
                 "Please upload a text-based document."
      });
    }

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
