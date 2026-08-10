const mammoth = require("mammoth");

const extractTextFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw error;
  }
};

module.exports = {
  extractTextFromDOCX
};
