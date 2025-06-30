// server/routes/admin/categories.js - REPLACE ENTIRE FILE
const express = require("express");
const Category = require("../../models/Category");
const Business = require("../../models/Business"); // ADD THIS IMPORT
const { verifyAdmin } = require("../../middleware/auth");
const { validateCategory } = require("../../middleware/validation");
const router = express.Router();

// Apply auth middleware
router.use(verifyAdmin);

// Get all categories
router.get("/", async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category
router.post("/", validateCategory, async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// NEW: Get businesses count for a category (for confirmation dialog)
router.get("/:id/businesses-count", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        const businessCount = await Business.countDocuments({
            category: category.name,
        });

        res.json({
            categoryName: category.name,
            businessCount,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced Update category with CASCADE UPDATE
router.put("/:id", validateCategory, async (req, res) => {
    try {
        // Get the old category first
        const oldCategory = await Category.findById(req.params.id);
        if (!oldCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        const oldName = oldCategory.name;
        const newName = req.body.name.trim();

        // If name hasn't changed, just update normally
        if (oldName === newName) {
            const category = await Category.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            return res.json({
                category,
                migratedBusinesses: 0,
                message: "Category updated successfully",
            });
        }

        // Check if new name already exists
        const existingCategory = await Category.findOne({
            name: newName,
            _id: { $ne: req.params.id },
        });
        if (existingCategory) {
            return res.status(400).json({
                error: "A category with this name already exists",
            });
        }

        // Count businesses that will be affected
        const businessesToMigrate = await Business.countDocuments({
            category: oldName,
        });

        // Update the category
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        // CASCADE UPDATE: Update all businesses with the old category name
        const updateResult = await Business.updateMany(
            { category: oldName },
            { category: newName }
        );

        // Log the migration for debugging
        if (process.env.NODE_ENV === "development") {
            console.log(`✅ Category Migration Complete:
                Old Name: "${oldName}"
                New Name: "${newName}"  
                Businesses Updated: ${updateResult.modifiedCount}
                Expected: ${businessesToMigrate}
            `);
        }

        res.json({
            category,
            migratedBusinesses: updateResult.modifiedCount,
            expectedMigrations: businessesToMigrate,
            message: `Category updated successfully. ${updateResult.modifiedCount} businesses migrated from "${oldName}" to "${newName}".`,
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(400).json({ error: error.message });
    }
});

// Toggle category status
router.patch("/:id/toggle", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        category.isActive = !category.isActive;
        await category.save();

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
