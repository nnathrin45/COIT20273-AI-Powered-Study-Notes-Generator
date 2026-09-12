const fs = require("fs");
const { PDFParse } = require("pdf-parse");

const extractTextFromPDF = async (filePath) => {
    try {
        const pdfBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: pdfBuffer
        });

        // pdf-parse appends a page boundary marker to every page by default
        // ("-- 1 of 3 --"). Two problems follow from keeping it, both found by
        // T-26 on 10 Sep 2026:
        //
        //   1. A scanned, image-only PDF still returns those markers, so the
        //      extracted text is never empty and the FR8.4 no-readable-text
        //      guard in the upload controller never fires.
        //   2. The markers are stored in extracted_text and sent to Gemini as
        //      part of the study material.
        //
        // An empty pageJoiner disables them; pages remain separated by a blank
        // line, which is what the guard and the prompt both expect.
        const result = await parser.getText({ pageJoiner: "" });

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