const fs = require("fs").promises;

const extractTextFromTXT = async (filePath) => {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return text;
  } catch (error) {
    console.error("TXT extraction error:", error);
    throw error;
  }
};

module.exports = {
  extractTextFromTXT
};
