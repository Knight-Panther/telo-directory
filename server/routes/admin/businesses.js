// server/routes/admin/businesses.js
const express = require("express");
const Business = require("../../models/Business");
const { verifyAdmin } = require("../../middleware/auth");
const { upload, processImage } = require("../../middleware/upload");
const { validateBusiness } = require("../../middleware/validation");
const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyAdmin);

// Get all businesses for admin with full details
router.get("/", async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;

        const query = search
            ? {
                  $or: [
                      { businessName: { $regex: search, $options: "i" } },
                      { businessId: { $regex: search, $options: "i" } },
                      { mobile: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const skip = (page - 1) * limit;

        const businesses = await Business.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Business.countDocuments(query);

        res.json({
            businesses,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalBusinesses: total,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new business
router.post(
    "/",
    upload.single("profileImage"),
    validateBusiness,
    async (req, res) => {
        try {
            const businessData = { ...req.body };

            // Process social links
            if (req.body.socialLinks) {
                businessData.socialLinks = JSON.parse(req.body.socialLinks);
            }

            // Handle image upload
            if (req.file) {
                const filename = `${Date.now()}-${req.file.originalname}`;
                const imagePath = await processImage(req.file.buffer, filename);
                businessData.profileImage = imagePath;
            }

            const business = new Business(businessData);
            await business.save();

            res.status(201).json(business);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Update business
router.put(
    "/:id",
    upload.single("profileImage"),
    validateBusiness,
    async (req, res) => {
        try {
            const updateData = { ...req.body };

            // Process social links
            if (req.body.socialLinks) {
                updateData.socialLinks = JSON.parse(req.body.socialLinks);
            }

            // Handle image upload
            if (req.file) {
                const filename = `${Date.now()}-${req.file.originalname}`;
                const imagePath = await processImage(req.file.buffer, filename);
                updateData.profileImage = imagePath;
            }

            const business = await Business.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!business) {
                return res.status(404).json({ error: "Business not found" });
            }

            res.json(business);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Delete business
router.delete("/:id", async (req, res) => {
    try {
        const business = await Business.findByIdAndDelete(req.params.id);

        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }

        res.json({ message: "Business deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle business verification
router.patch("/:id/verify", async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }

        business.verified = !business.verified;
        await business.save();

        res.json(business);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
