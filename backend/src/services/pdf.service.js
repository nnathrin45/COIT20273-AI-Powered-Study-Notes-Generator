const fs = require("fs");
const { PDFParse } = require("pdf-parse");

const extractTextFromPDF = async (filePath) => {
    try {
        const pdfBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: pdfBuffer
        });

        const result = await parser.getText();

        await parser.destroy();

        return result.text;

    } catch (error) {
        console.error("PDF extraction error:", error);
        throw error;
    }
};

module.exports = {
    extractTextFromPDF
};