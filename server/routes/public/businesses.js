// server/routes/public/businesses.js - CORRECTED VERSION WITH MOBILE SEARCH FIX
const express = require("express");
const Business = require("../../models/Business");
const Category = require("../../models/Category");
const router = express.Router();

// Get all businesses with pagination and multi-select filters
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search = "",
            categories = "", // Now supports arrays: ?categories[]=Painting&categories[]=Plumbing
            cities = "", // Now supports arrays: ?cities[]=Tbilisi&cities[]=Batumi
            businessTypes = "", // Now supports arrays: ?businessTypes[]=individual&businessTypes[]=company
            verified = "", // Single select (unchanged)
        } = req.query;

        // Build search query
        const query = {};

        // FIXED: Text search now includes mobile and businessId
        if (search) {
            query.$or = [
                { businessName: { $regex: search, $options: "i" } },
                { shortDescription: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { businessId: { $regex: search, $options: "i" } },
            ];
        }

        // Multi-select category filter
        if (categories) {
            const categoryArray = Array.isArray(categories)
                ? categories
                : [categories];
            const validCategories = categoryArray.filter(
                (cat) => cat && cat.trim()
            );
            if (validCategories.length > 0) {
                query.category = { $in: validCategories };
            }
        }

        // Multi-select city filter
        if (cities) {
            const cityArray = Array.isArray(cities) ? cities : [cities];
            const validCities = cityArray.filter((city) => city && city.trim());
            if (validCities.length > 0) {
                query.city = { $in: validCities };
            }
        }

        // Multi-select business type filter
        if (businessTypes) {
            const typeArray = Array.isArray(businessTypes)
                ? businessTypes
                : [businessTypes];
            const validTypes = typeArray.filter(
                (type) =>
                    type &&
                    type.trim() &&
                    ["individual", "company"].includes(type.trim())
            );
            if (validTypes.length > 0) {
                query.businessType = { $in: validTypes };
            }
        }

        // Single select verified filter (unchanged)
        if (verified !== "") {
            query.verified = verified === "true";
        }

        const skip = (page - 1) * limit;

        // Use the optimized sorting strategy
        // Text search: sort by verified and date
        // Regular filters: sort by verified and date
        let sortQuery = {
            verified: -1,
            createdAt: -1,
        };

        const businesses = await Business.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Business.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        // Debug logging for development
        if (process.env.NODE_ENV === "development") {
            console.log("Filter Query:", {
                originalQuery: req.query,
                mongoQuery: query,
                resultCount: businesses.length,
                totalResults: total,
            });
        }

        res.json({
            businesses,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalBusinesses: total,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            // Include applied filters in response for debugging
            appliedFilters: {
                search: search || null,
                categories: categories
                    ? Array.isArray(categories)
                        ? categories
                        : [categories]
                    : [],
                cities: cities
                    ? Array.isArray(cities)
                        ? cities
                        : [cities]
                    : [],
                businessTypes: businessTypes
                    ? Array.isArray(businessTypes)
                        ? businessTypes
                        : [businessTypes]
                    : [],
                verified: verified || null,
            },
        });
    } catch (error) {
        console.error("Error fetching businesses:", error);
        res.status(500).json({
            error: error.message,
            details:
                process.env.NODE_ENV === "development"
                    ? error.stack
                    : undefined,
        });
    }
});

// Get single business by ID (unchanged)
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

// Get all active categories (unchanged)
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

// Get unique cities (unchanged)
router.get("/cities/list", async (req, res) => {
    try {
        const cities = await Business.distinct("city");
        res.json(cities.sort());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint: Get filter statistics
router.get("/filters/stats", async (req, res) => {
    try {
        // Get category counts
        const categoryStats = await Business.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Get city counts
        const cityStats = await Business.aggregate([
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Get business type counts
        const businessTypeStats = await Business.aggregate([
            { $group: { _id: "$businessType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Get verified status counts
        const verifiedStats = await Business.aggregate([
            { $group: { _id: "$verified", count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
        ]);

        res.json({
            categories: categoryStats,
            cities: cityStats,
            businessTypes: businessTypeStats,
            verified: verifiedStats,
            totalBusinesses: await Business.countDocuments(),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
