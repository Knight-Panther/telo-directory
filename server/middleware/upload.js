// server/middleware/upload.js
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Multer configuration for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // Use env or default 5MB
    },
});

// Image processing function
const processImage = async (buffer, filename) => {
    const uploadsDir = path.join(__dirname, "..", process.env.UPLOAD_PATH || "uploads", "businesses");

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);

    // Resize and compress image
    await sharp(buffer)
        .resize(400, 400, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toFile(filepath);

    return `/${process.env.UPLOAD_PATH || "uploads"}/businesses/${filename}`;
};

module.exports = { upload, processImage };
