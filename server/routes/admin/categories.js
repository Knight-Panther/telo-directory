// server/routes/admin/categories.js
const express = require("express");
const Category = require("../../models/Category");
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

// Update category
router.put("/:id", validateCategory, async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json(category);
    } catch (error) {
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
