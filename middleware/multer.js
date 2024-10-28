const multer = require("multer");
const path = require("path");

// Multer config
const upload = multer({
  storage: multer.diskStorage({}),
  limits: {
    fileSize: 1024 * 1024, // 1 MB limit
  },
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (
      ext.toLowerCase() !== ".jpg" &&
      ext.toLowerCase() !== ".jpeg" &&
      ext.toLowerCase() !== ".png" &&
      ext.toLowerCase() !== ".webp" &&
      ext.toLowerCase() !== ".mp4" &&
      ext.toLowerCase() !== ".webm" &&
      ext.toLowerCase() !== ".docx" &&
      ext.toLowerCase() !== ".pdf" &&
      ext.toLowerCase() !== ".txt" 
    ) {
      const error = new Error("File type is not supported");
      error.status = 400; // Set the status code to 400 for a bad request
      return cb(error);
    }
    cb(null, true);
  },
});

// Custom middleware to handle errors and send JSON response
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer specific error
    return res.status(400).json({
      error: "File upload error",
      message: err.message,
    });
  } else if (err) {
    // Other errors
    return res.status(err.status || 500).json({
      code: err.status || 50,
      error: "Internal server error",
      message: err.message || "Something went wrong",
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError,
};
