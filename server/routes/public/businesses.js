// server/routes/public/businesses.js
const express = require("express");
const Business = require("../../models/Business");
const Category = require("../../models/Category");
const router = express.Router();

// Get all businesses with pagination and search
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search = "",
            category = "",
            city = "",
            verified = "",
        } = req.query;

        // Build search query
        const query = {};

        if (search) {
            query.$or = [
                { businessName: { $regex: search, $options: "i" } },
                { shortDescription: { $regex: search, $options: "i" } },
            ];
        }

        if (category) query.category = category;
        if (city) query.city = city;
        if (verified !== "") query.verified = verified === "true";

        const skip = (page - 1) * limit;

        const businesses = await Business.find(query)
            .sort({ verified: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Business.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        res.json({
            businesses,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalBusinesses: total,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single business by ID
router.get("/:id", async (req, res) => {
    try {
        const business = await Business.findOne({
            $or: [{ _id: req.params.id }, { businessId: req.params.id }],
        });

        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }

        res.json(business);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all active categories
router.get("/categories/list", async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({
            name: 1,
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unique cities
router.get("/cities/list", async (req, res) => {
    try {
        const cities = await Business.distinct("city");
        res.json(cities.sort());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
