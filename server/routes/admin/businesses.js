// server/routes/admin/businesses.js - Complete fixed version
const express = require("express");
const Business = require("../../models/Business");
const { verifyAdmin } = require("../../middleware/auth");
const { upload, processImage } = require("../../middleware/upload");
const { validateBusiness } = require("../../middleware/validation");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Helper function to clean up image files
const cleanupImageFile = (imagePath, context = "operation") => {
    if (imagePath && imagePath.startsWith("/uploads/")) {
        const fullPath = path.join(__dirname, "../../", imagePath);
        
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (fileError) {
            console.error(`File deletion error during ${context}:`, fileError);
            // Continue anyway - main operation already completed
        }
    }
};

// Helper function to process social links
const processSocialLinks = (socialLinks) => {
    return socialLinks ? JSON.parse(socialLinks) : undefined;
};

// Helper function to handle image upload
const handleImageUpload = async (file) => {
    if (file) {
        const filename = `${Date.now()}-${file.originalname}`;
        return await processImage(file.buffer, filename);
    }
    return null;
};

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
        const totalPages = Math.ceil(total / limit);

        // 🔥 FIX: Convert page to number for proper comparison
        const currentPage = parseInt(page);

        res.json({
            businesses,
            pagination: {
                currentPage: currentPage,
                totalPages: totalPages,
                totalBusinesses: total,
                // 🎯 THE CRUCIAL FIX: Use currentPage (number) not page (string)
                hasNext: currentPage < totalPages,
                hasPrev: currentPage > 1,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single business by ID for editing (ADD THIS - IT WAS MISSING!)
router.get("/:id", async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }

        res.json(business);
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ error: "Invalid business ID format" });
        }
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
            const socialLinks = processSocialLinks(req.body.socialLinks);
            if (socialLinks) businessData.socialLinks = socialLinks;

            // Handle image upload
            const imagePath = await handleImageUpload(req.file);
            if (imagePath) businessData.profileImage = imagePath;

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
            const socialLinks = processSocialLinks(req.body.socialLinks);
            if (socialLinks) updateData.socialLinks = socialLinks;

            // Handle image upload
            const imagePath = await handleImageUpload(req.file);
            if (imagePath) updateData.profileImage = imagePath;

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
        // First find the business to get image path before deletion
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }

        const imagePath = business.profileImage;

        // Delete business from database
        await Business.findByIdAndDelete(req.params.id);

        // Clean up associated image file
        cleanupImageFile(imagePath, "business deletion");

        res.json({
            message: "Business and associated image deleted successfully",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete business image
router.delete("/:id/image", async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }

        if (!business.profileImage) {
            return res.status(400).json({ error: "No image to delete" });
        }

        const imagePath = business.profileImage;

        // Remove image reference from database
        business.profileImage = "";
        await business.save();

        // Clean up file system
        cleanupImageFile(imagePath, "image deletion");

        res.json({
            message: "Image deleted successfully",
            business: business,
        });
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
