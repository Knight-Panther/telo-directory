// server/config/seedData.js
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Business = require("../models/Business");
require("dotenv").config();

const seedCategories = [
    { name: "General Construction" },
    { name: "Kitchen Renovation" },
    { name: "Bathroom Renovation" },
    { name: "Painting" },
    { name: "Electrical Work" },
    { name: "Plumbing" },
    { name: "Flooring" },
    { name: "Roofing" },
    { name: "Windows & Doors" },
    { name: "Interior Design" },
    { name: "Landscaping" },
    { name: "Cleaning Services" },
];

const seedBusinesses = [
    {
        businessName: "Premium Construction Ltd",
        category: "General Construction",
        businessType: "company",
        city: "Tbilisi",
        mobile: "+995 555 123 456",
        shortDescription:
            "Professional construction services with 10+ years experience",
        verified: true,
        socialLinks: {
            facebook: "https://facebook.com/premiumconstruction",
            instagram: "https://instagram.com/premiumconstruction",
        },
    },
    {
        businessName: "Kitchen Masters",
        category: "Kitchen Renovation",
        businessType: "company",
        city: "Batumi",
        mobile: "+995 555 234 567",
        shortDescription: "Expert kitchen renovations and custom designs",
        verified: false,
    },
    {
        businessName: "Giorgi Painter",
        category: "Painting",
        businessType: "individual",
        city: "Kutaisi",
        mobile: "+995 555 345 678",
        shortDescription: "Quality painting services for homes and offices",
        verified: true,
    },
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for seeding");

        // Clear existing data
        await Category.deleteMany({});
        await Business.deleteMany({});
        console.log("Cleared existing data");

        // Seed categories
        await Category.insertMany(seedCategories);
        console.log("Categories seeded successfully");

        // Seed businesses
        await Business.insertMany(seedBusinesses);
        console.log("Businesses seeded successfully");

        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
