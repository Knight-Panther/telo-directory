// server/middleware/auth.js
const jwt = require("jsonwebtoken");

// Admin credentials - MUST be set in environment variables
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
};

const JWT_SECRET = process.env.JWT_SECRET;

// Validate required environment variables at startup
if (!ADMIN_CREDENTIALS.username || !ADMIN_CREDENTIALS.password) {
    console.error('❌ SECURITY ERROR: ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables');
    process.exit(1);
}

if (!JWT_SECRET) {
    console.error('❌ SECURITY ERROR: JWT_SECRET must be set in environment variables');
    process.exit(1);
}

// Generate token
const generateToken = (username) => {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" }); // Change to "24h" for production
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
        // Pass JWT errors to centralized error handler for proper 401 responses
        // This ensures TokenExpiredError and JsonWebTokenError are handled consistently
        next(error);
    }
};

module.exports = { ADMIN_CREDENTIALS, generateToken, verifyAdmin };
