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
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// Image processing function
const processImage = async (buffer, filename) => {
    const uploadsDir = path.join(__dirname, "../uploads/businesses");

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

    return `/uploads/businesses/${filename}`;
};

module.exports = { upload, processImage };
