const fs = require("fs");
const path = require("path");

const storageRoot =
  process.env.STUDYAI_STORAGE_DIR?.trim();

if (process.env.NODE_ENV === "production" && !storageRoot) {
  throw new Error(
    "STUDYAI_STORAGE_DIR must be set in production."
  );
}

if (storageRoot && !path.isAbsolute(storageRoot)) {
  throw new Error(
    "STUDYAI_STORAGE_DIR must be an absolute path."
  );
}

const uploadDirectory = storageRoot
  ? path.join(storageRoot, "uploads")
  : path.resolve(__dirname, "../uploads");

const profilePictureDirectory = storageRoot
  ? path.join(storageRoot, "profile-pictures")
  : path.resolve(__dirname, "../profile-pictures");

for (const directory of [
  uploadDirectory,
  profilePictureDirectory
]) {
  fs.mkdirSync(directory, { recursive: true });
}

module.exports = {
  uploadDirectory,
  profilePictureDirectory
};
