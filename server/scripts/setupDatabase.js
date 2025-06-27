// server/scripts/setupDatabase.js - CREATE NEW FILE
const mongoose = require("mongoose");
const {
    createIndexes,
    analyzeIndexes,
    dropIndexes,
} = require("../config/indexes");
const Business = require("../models/Business");
const Category = require("../models/Category");
require("dotenv").config();

const setupDatabase = async () => {
    try {
        console.log("🚀 Starting database setup...");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // Show current indexes first
        console.log("\n📋 Current indexes:");
        const currentIndexes = await Business.collection
            .listIndexes()
            .toArray();
        currentIndexes.forEach((index) => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Ask user if they want to proceed with conflicts
        const hasTextIndex = currentIndexes.some(
            (idx) =>
                idx.key &&
                idx.key._fts === "text" &&
                idx.name !== "text_search_index"
        );

        if (hasTextIndex) {
            console.log(
                "\n⚠️  NOTICE: Found existing text search index with different configuration"
            );
            console.log(
                "   The script will attempt to optimize it for your new multi-select system"
            );
        }

        console.log("\n🔧 Creating optimized indexes...");

        // Create indexes with better error handling
        await createIndexes();

        // Show final indexes
        console.log("\n📋 Final indexes:");
        const finalIndexes = await Business.collection.listIndexes().toArray();
        finalIndexes.forEach((index) => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Analyze index performance (optional)
        console.log("\n📊 Running index analysis...");
        await analyzeIndexes();

        console.log("\n🎉 Database setup completed successfully!");
        console.log("\n📋 Next steps:");
        console.log("1. Start your development server: npm run dev");
        console.log("2. Test the multi-select filters on the frontend");
        console.log("3. Monitor query performance in development");
    } catch (error) {
        console.error("❌ Database setup failed:", error.message);

        if (error.codeName === "IndexOptionsConflict") {
            console.log("\n🔧 CONFLICT RESOLUTION OPTIONS:");
            console.log(
                "1. Drop all indexes and recreate: node scripts/setupDatabase.js --force"
            );
            console.log("2. Keep existing indexes and skip conflicting ones");
            console.log("3. Manually review indexes in MongoDB Compass");
        }

        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("📴 Disconnected from MongoDB");
        process.exit(0);
    }
};

// Force mode: drop existing indexes and recreate
const forceSetup = async () => {
    try {
        console.log(
            "🚀 Starting FORCE database setup (will drop existing indexes)..."
        );

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        console.log("⚠️  Dropping existing custom indexes...");
        await dropIndexes();

        console.log("🔧 Creating fresh indexes...");
        await createIndexes();

        console.log("📊 Running index analysis...");
        await analyzeIndexes();

        console.log("🎉 Force setup completed successfully!");
    } catch (error) {
        console.error("❌ Force setup failed:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

// Check command line arguments
const args = process.argv.slice(2);
const isForce = args.includes("--force");

// Run if called directly
if (require.main === module) {
    if (isForce) {
        forceSetup();
    } else {
        setupDatabase();
    }
}

module.exports = { setupDatabase, forceSetup };
