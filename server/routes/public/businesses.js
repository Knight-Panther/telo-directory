// server/routes/public/businesses.js

const express = require("express");
const mongoose = require("mongoose");
const Business = require("../../models/Business");
const Category = require("../../models/Category");
const router = express.Router();

// Get all businesses with pagination and multi-select filters
router.get("/", async (req, res) => {
    try {
        const { page = 1, limit = 12, search = "", verified = "" } = req.query;

        const categories =
            req.query["categories[]"] || req.query.categories || "";
        const cities = req.query["cities[]"] || req.query.cities || "";
        const businessTypes =
            req.query["businessTypes[]"] || req.query.businessTypes || "";

        const query = {};

        if (search) {
            query.$or = [
                { businessName: { $regex: search, $options: "i" } },
                { shortDescription: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
                { businessId: { $regex: search, $options: "i" } },
            ];
        }

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

        if (cities) {
            const cityArray = Array.isArray(cities) ? cities : [cities];
            const validCities = cityArray.filter((city) => city && city.trim());
            if (validCities.length > 0) {
                query.city = { $in: validCities };
            }
        }

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

        if (verified !== "") {
            query.verified = verified === "true";
        }

        const skip = (page - 1) * limit;
        const sortQuery = { verified: -1, createdAt: -1 };

        const businesses = await Business.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(parseInt(limit));
        const total = await Business.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        if (process.env.NODE_ENV === "development") {
            console.log("Filter Query:", {
                originalQuery: req.query,
                mongoQuery: query,
                resultCount: businesses.length,
                totalResults: total,
            });
        }

        // Set cache headers for business listings (shorter cache for dynamic data)
        res.set({
            'Cache-Control': 'public, max-age=120, s-maxage=300', // 2min browser, 5min CDN
            'ETag': `"businesses-${total}-${page}-${Date.now()}"`,
            'Vary': 'Accept-Encoding'
        });

        res.json({
            businesses,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalBusinesses: total,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
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

// Enhanced GET /:id route with validation and formatting
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid business ID format",
                code: "INVALID_ID",
            });
        }

        const business = await Business.findById(id);

        if (!business) {
            return res.status(404).json({
                error: "Business not found",
                code: "BUSINESS_NOT_FOUND",
            });
        }

        const businessData = {
            _id: business._id,
            businessId: business.businessId,
            businessName: business.businessName,
            category: business.category,
            businessType: business.businessType,
            city: business.city,
            mobile: business.mobile,
            shortDescription: business.shortDescription || "",
            verified: business.verified,
            profileImage: business.profileImage || "",
            socialLinks: {
                facebook: business.socialLinks?.facebook || "",
                instagram: business.socialLinks?.instagram || "",
                tiktok: business.socialLinks?.tiktok || "",
            },
            createdAt: business.createdAt,
            updatedAt: business.updatedAt,
            registrationInfo: {
                daysActive: Math.floor(
                    (Date.now() - business.createdAt) / (1000 * 60 * 60 * 24)
                ),
                memberSince: formatRegistrationDate(business.createdAt),
                isNewBusiness: isNewBusiness(business.createdAt),
            },
        };

        if (process.env.NODE_ENV === "development") {
            console.log(
                `📊 Business viewed: ${business.businessName} (ID: ${id})`
            );
        }

        res.json(businessData);
    } catch (error) {
        console.error("Error fetching business detail:", error);
        res.status(500).json({
            error: "Unable to fetch business details",
            code: "SERVER_ERROR",
        });
    }
});

// Helper function: Format registration date
function formatRegistrationDate(createdAt) {
    const date = new Date(createdAt);
    const options = { year: "numeric", month: "long" };
    const formatted = date.toLocaleDateString("en-US", options);
    return `Member since ${formatted}`;
}

// Helper function: Check if business is new (created in last 30 days)
function isNewBusiness(createdAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt >= thirtyDaysAgo;
}

// Get all active categories
router.get("/categories/list", async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({
            name: 1,
        });

        // Cache categories for longer (they change less frequently)
        res.set({
            'Cache-Control': 'public, max-age=900', // 15 minutes
            'ETag': `"categories-${categories.length}"`,
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

        // Cache cities for moderate duration
        res.set({
            'Cache-Control': 'public, max-age=600', // 10 minutes
            'ETag': `"cities-${cities.length}"`,
        });

        res.json(cities.sort());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get filter statistics
router.get("/filters/stats", async (req, res) => {
    try {
        const categoryStats = await Business.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        const cityStats = await Business.aggregate([
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        const businessTypeStats = await Business.aggregate([
            { $group: { _id: "$businessType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

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
