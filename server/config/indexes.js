// server/config/indexes.js - CREATE NEW FILE
const mongoose = require("mongoose");

/**
 * Strategic Database Indexes for Multi-Select Filter System
 *
 * Performance Goals:
 * - Handle multi-select filters efficiently
 * - Support homepage pagination
 * - Optimize text search
 * - Ensure fast queries for all filter combinations
 */

const createIndexes = async () => {
    try {
        const Business = mongoose.model("Business");

        console.log("Creating database indexes...");

        // 🎯 Core Compound Index - Main Multi-Select Performance
        // Handles: categories[], cities[], businessTypes[], verified, pagination
        // This is the PRIMARY index for your new multi-select system
        await Business.collection.createIndex(
            {
                category: 1,
                city: 1,
                businessType: 1,
                verified: -1,
                createdAt: -1,
            },
            {
                name: "core_multiselect_compound",
                background: true,
            }
        );

        // 🔍 Text Search Index - Handle existing index conflicts
        try {
            // First, try to drop existing conflicting text index
            const existingIndexes = await Business.collection
                .listIndexes()
                .toArray();
            const conflictingIndex = existingIndexes.find(
                (idx) =>
                    idx.key &&
                    idx.key._fts === "text" &&
                    idx.name !== "text_search_index"
            );

            if (conflictingIndex) {
                console.log(
                    `⚠️  Found conflicting text index: ${conflictingIndex.name}`
                );
                console.log(`   Dropping old index to create optimized one...`);
                await Business.collection.dropIndex(conflictingIndex.name);
                console.log(
                    `✅ Dropped old text index: ${conflictingIndex.name}`
                );
            }

            // Create new optimized text search index
            await Business.collection.createIndex(
                {
                    businessName: "text",
                    shortDescription: "text",
                },
                {
                    name: "text_search_index",
                    background: true,
                    weights: {
                        businessName: 10, // Business name more important
                        shortDescription: 5, // Description secondary
                    },
                }
            );
            console.log("✅ Created optimized text search index");
        } catch (textIndexError) {
            console.log(
                "⚠️  Text search index handling:",
                textIndexError.message
            );
            console.log("   Continuing with existing text index...");
        }

        // 📊 Sort Backup Index - Safety Net for Edge Cases
        // Ensures homepage is always fast, helps with admin queries
        await Business.collection.createIndex(
            {
                verified: -1,
                createdAt: -1,
            },
            {
                name: "sort_backup_index",
                background: true,
            }
        );

        // 🔧 Admin Management Indexes
        // For admin dashboard and business management
        try {
            await Business.collection.createIndex(
                {
                    businessId: 1,
                },
                {
                    name: "business_id_unique",
                    unique: true,
                    background: true,
                }
            );
            console.log("✅ Created business ID unique index");
        } catch (error) {
            if (
                error.code === 11000 ||
                error.codeName === "IndexOptionsConflict"
            ) {
                console.log("⚠️  Business ID index already exists");
            } else {
                throw error;
            }
        }

        // 📈 Analytics Helper Index
        // For category and city statistics
        try {
            await Business.collection.createIndex(
                {
                    category: 1,
                    createdAt: -1,
                },
                {
                    name: "category_analytics",
                    background: true,
                }
            );
            console.log("✅ Created category analytics index");
        } catch (error) {
            if (error.codeName === "IndexOptionsConflict") {
                console.log("⚠️  Category analytics index already exists");
            } else {
                throw error;
            }
        }

        try {
            await Business.collection.createIndex(
                {
                    city: 1,
                    createdAt: -1,
                },
                {
                    name: "city_analytics",
                    background: true,
                }
            );
            console.log("✅ Created city analytics index");
        } catch (error) {
            if (error.codeName === "IndexOptionsConflict") {
                console.log("⚠️  City analytics index already exists");
            } else {
                throw error;
            }
        }

        console.log("✅ All indexes created successfully!");

        // List all indexes for verification
        const indexes = await Business.collection.listIndexes().toArray();
        console.log("📋 Current indexes:");
        indexes.forEach((index) => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
    } catch (error) {
        console.error("❌ Error creating indexes:", error);
        throw error;
    }
};

/**
 * Drop all custom indexes (keeping only _id)
 * Use this if you need to rebuild indexes
 */
const dropIndexes = async () => {
    try {
        const Business = mongoose.model("Business");

        console.log("Dropping custom indexes...");

        const indexesToDrop = [
            "core_multiselect_compound",
            "text_search_index",
            "sort_backup_index",
            "business_id_unique",
            "category_analytics",
            "city_analytics",
        ];

        for (const indexName of indexesToDrop) {
            try {
                await Business.collection.dropIndex(indexName);
                console.log(`✅ Dropped index: ${indexName}`);
            } catch (err) {
                console.log(
                    `⚠️  Index ${indexName} not found (already dropped)`
                );
            }
        }
    } catch (error) {
        console.error("❌ Error dropping indexes:", error);
        throw error;
    }
};

/**
 * Check index performance and usage
 */
const analyzeIndexes = async () => {
    try {
        const Business = mongoose.model("Business");

        console.log("📊 Index Analysis:");

        // Get index stats
        const stats = await Business.collection.stats({ indexDetails: true });
        console.log("Collection stats:", {
            count: stats.count,
            avgObjSize: stats.avgObjSize,
            totalIndexSize: stats.totalIndexSize,
        });

        // Sample queries to test index usage
        const sampleQueries = [
            // Multi-select query
            {
                category: { $in: ["Painting", "Plumbing"] },
                city: { $in: ["Tbilisi", "Batumi"] },
                businessType: { $in: ["individual"] },
            },
            // Single filter query
            { category: "Painting" },
            // Text search
            { $text: { $search: "renovation" } },
            // Homepage query
            { verified: true },
        ];

        for (let i = 0; i < sampleQueries.length; i++) {
            const query = sampleQueries[i];
            const explain = await Business.find(query).explain(
                "executionStats"
            );

            console.log(`Query ${i + 1}:`, {
                query: JSON.stringify(query),
                executionTimeMillis: explain.executionStats.executionTimeMillis,
                totalDocsExamined: explain.executionStats.totalDocsExamined,
                totalDocsReturned: explain.executionStats.totalDocsReturned,
                indexUsed:
                    explain.executionStats.winningPlan.inputStage?.indexName ||
                    "No index",
            });
        }
    } catch (error) {
        console.error("❌ Error analyzing indexes:", error);
    }
};

module.exports = {
    createIndexes,
    dropIndexes,
    analyzeIndexes,
};
