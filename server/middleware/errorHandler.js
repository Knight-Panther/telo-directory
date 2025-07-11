// server/middleware/errorHandler.js
const multer = require("multer");

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ error: "File upload error" });
    }

    // MongoDB validation errors
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map((e) => e.message);
        return res
            .status(400)
            .json({ error: "Validation failed", details: errors });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ error: `${field} already exists` });
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
    }

    // Default error
    res.status(500).json({
        error:
            process.env.NODE_ENV === "production"
                ? "Internal server error"
                : err.message,
    });
};

module.exports = errorHandler;
