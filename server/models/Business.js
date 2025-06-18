// server/models/Business.js
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const businessSchema = new mongoose.Schema(
    {
        businessId: {
            type: String,
            unique: true,
            default: () => nanoid(10),
        },
        businessName: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
        },
        businessType: {
            type: String,
            enum: ["individual", "company"],
            required: true,
        },
        socialLinks: {
            facebook: { type: String, default: "" },
            tiktok: { type: String, default: "" },
            instagram: { type: String, default: "" },
        },
        shortDescription: {
            type: String,
            maxlength: 500,
        },
        city: {
            type: String,
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        mobile: {
            type: String,
            required: true,
        },
        profileImage: {
            type: String, // File path
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Business", businessSchema);
