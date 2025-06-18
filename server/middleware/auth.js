// server/middleware/auth.js
const jwt = require("jsonwebtoken");

// Basic admin credentials (in production, use proper user management)
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
};

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Generate token
const generateToken = (username) => {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
};

// Verify admin token
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: "Invalid token." });
    }
};

module.exports = { ADMIN_CREDENTIALS, generateToken, verifyAdmin };
