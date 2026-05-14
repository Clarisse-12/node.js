import multer from "multer";

// memoryStorage keeps the file in memory as req.file.buffer
// This is what we need to stream the file directly to Cloudinary
// DiskStorage would save to disk first — unnecessary extra step
const storage = multer.memoryStorage();

// File filter — only allow image files
// This runs before the file is stored, rejecting non-image uploads early
function fileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
}

const upload = multer({
  storage,
  fileFilter,

  // Limit file size to 5MB
  // Without this, users could upload huge files and crash your server
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
