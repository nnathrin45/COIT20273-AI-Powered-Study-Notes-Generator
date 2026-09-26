const multer = require("multer");
const path = require("path");
const fs = require("fs");

const profilePictureDirectory =
  path.join(__dirname, "../profile-pictures");

// Make sure the folder exists
if (!fs.existsSync(profilePictureDirectory)) {
  fs.mkdirSync(profilePictureDirectory, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePictureDirectory);
  },

  filename: (req, file, cb) => {
    const extension =
      path.extname(file.originalname).toLowerCase();

    const uniqueName =
      `${req.user.user_id}-${Date.now()}${extension}`;

    cb(null, uniqueName);
  }
});

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
];

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const fileFilter = (req, file, cb) => {
  const extension =
    path.extname(file.originalname).toLowerCase();

  if (
    allowedExtensions.includes(extension) &&
    allowedMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WebP images are allowed"
      ),
      false
    );
  }
};

const profilePictureUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

const handleProfilePictureUpload = (
  req,
  res,
  next
) => {
  profilePictureUpload.single("profile_picture")(
    req,
    res,
    (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            status: "error",
            code: "PROFILE_PICTURE_TOO_LARGE",
            message:
              "Profile picture must not exceed 2 MB"
          });
        }

        return res.status(400).json({
          status: "error",
          code: "PROFILE_PICTURE_UPLOAD_ERROR",
          message: err.message
        });
      }

      if (err) {
        return res.status(415).json({
          status: "error",
          code: "UNSUPPORTED_PROFILE_PICTURE",
          message: err.message
        });
      }

      next();
    }
  );
};

module.exports = {
  handleProfilePictureUpload,
  profilePictureDirectory
};