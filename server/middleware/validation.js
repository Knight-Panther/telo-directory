// server/middleware/validation.js (this replaces express-validator.checks http request before mongoose schema)
const validateBusiness = (req, res, next) => {
    const { businessName, category, businessType, city, mobile } = req.body;

    const errors = [];

    if (!businessName?.trim()) errors.push("Business name is required");
    if (!category?.trim()) errors.push("Category is required");
    if (!businessType) errors.push("Business type is required");
    if (!city?.trim()) errors.push("City is required");
    if (!mobile?.trim()) errors.push("Mobile is required");

    if (!["individual", "company"].includes(businessType)) {
        errors.push("Business type must be individual or company");
    }

    // Mobile validation (basic Georgian format)
    if (mobile && !/^[+]?[0-9\s\-()]{9,15}$/.test(mobile.trim())) {
        errors.push("Invalid mobile number format");
    }

    if (errors.length > 0) {
        return res
            .status(400)
            .json({ error: "Validation failed", details: errors });
    }

    next();
};

const validateCategory = (req, res, next) => {
    const { name } = req.body;

    if (!name?.trim()) {
        return res.status(400).json({ error: "Category name is required" });
    }

    next();
};

module.exports = { validateBusiness, validateCategory };
