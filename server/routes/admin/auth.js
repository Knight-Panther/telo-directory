// server/routes/admin/auth.js
const express = require("express");
const { ADMIN_CREDENTIALS, generateToken } = require("../../middleware/auth");
const router = express.Router();

// Admin login
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === ADMIN_CREDENTIALS.username &&
        password === ADMIN_CREDENTIALS.password
    ) {
        const token = generateToken(username);
        res.json({
            success: true,
            token,
            message: "Login successful",
        });
    } else {
        res.status(401).json({
            success: false,
            message: "Invalid credentials",
        });
    }
});

module.exports = router;
