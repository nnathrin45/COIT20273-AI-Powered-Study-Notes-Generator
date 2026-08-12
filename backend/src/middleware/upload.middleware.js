const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "src/uploads/");
  },

  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  }

});

// Allowed document types by extension (FR6.1)
// Extension is checked rather than mimetype, since mimetype is client-supplied
// and varies between browsers and tools (curl sends application/octet-stream).
const allowedExtensions = [".pdf", ".docx", ".txt"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX and TXT files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024   // 15 MB (FR6.2)
  }
});

// Wraps Multer so rejections return clean JSON instead of an unhandled 500 (NFR5)
const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          status: "error",
          code: "FILE_TOO_LARGE",
          message: "File exceeds the maximum size of 15 MB"
        });
      }
      return res.status(400).json({
        status: "error",
        code: "UPLOAD_ERROR",
        message: err.message
      });
    }

    if (err) {
      return res.status(415).json({
        status: "error",
        code: "UNSUPPORTED_FILE_TYPE",
        message: err.message
      });
    }

    next();
  });
};

module.exports = { upload, handleUpload };
