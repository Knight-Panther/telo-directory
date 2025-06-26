// server/config/database.js
const mongoose = require("mongoose");
require("dotenv").config();

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
        this.healthCheckInterval = null;

        // Environment-specific configurations
        this.environments = {
            development: {
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                heartbeatFrequencyMS: 10000,
                maxIdleTimeMS: 30000,
            },
            staging: {
                maxPoolSize: 8,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                heartbeatFrequencyMS: 10000,
                maxIdleTimeMS: 60000,
            },
            production: {
                maxPoolSize: 15,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                heartbeatFrequencyMS: 10000,
                maxIdleTimeMS: 120000,
                retryWrites: true,
                w: "majority",
            },
        };
    }

    getConnectionOptions() {
        const env = process.env.NODE_ENV || "development";
        const baseOptions = {
            // Note: bufferMaxEntries is deprecated in newer Mongoose versions
            // Use bufferCommands: false instead for similar behavior
            bufferCommands: false, // Fail fast instead of buffering
            autoIndex: env === "development", // Only auto-index in development
            ...this.environments[env],
        };

        return baseOptions;
    }

    async connect() {
        try {
            if (!process.env.MONGODB_URI) {
                throw new Error(
                    "MONGODB_URI environment variable is not defined"
                );
            }

            const options = this.getConnectionOptions();

            console.log(
                `🔄 Attempting to connect to MongoDB (${
                    process.env.NODE_ENV || "development"
                })...`
            );

            await mongoose.connect(process.env.MONGODB_URI, options);

            this.isConnected = true;
            this.connectionAttempts = 0;

            console.log("✅ MongoDB connected successfully");
            console.log(
                `📊 Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log(`🔗 Database: ${mongoose.connection.name}`);

            this.setupEventListeners();
            this.startHealthCheck();
        } catch (error) {
            console.error(
                "❌ Initial MongoDB connection failed:",
                error.message
            );
            await this.handleConnectionError(error);
        }
    }

    async handleConnectionError(error) {
        this.isConnected = false;
        this.connectionAttempts++;

        if (this.connectionAttempts <= this.maxRetries) {
            console.log(
                `🔄 Retrying connection (${this.connectionAttempts}/${
                    this.maxRetries
                }) in ${this.retryDelay / 1000}s...`
            );

            setTimeout(() => {
                this.connect();
            }, this.retryDelay);

            // Exponential backoff for retries
            this.retryDelay = Math.min(this.retryDelay * 1.5, 30000);
        } else {
            console.error(
                "💥 Max connection retries exceeded. Database connection failed permanently."
            );

            // In production, you might want to trigger alerts here
            if (process.env.NODE_ENV === "production") {
                // TODO: Integrate with your monitoring/alerting system
                console.error(
                    "🚨 CRITICAL: Database connection failed in production!"
                );
            }

            // Don't exit the process - let the app handle gracefully
            throw new Error("Database connection failed after maximum retries");
        }
    }

    setupEventListeners() {
        const connection = mongoose.connection;

        // Connection successful
        connection.on("connected", () => {
            console.log("🟢 MongoDB connection established");
            this.isConnected = true;
        });

        // Connection disconnected
        connection.on("disconnected", () => {
            console.log("🔴 MongoDB disconnected");
            this.isConnected = false;

            // Attempt to reconnect
            if (!connection.readyState) {
                console.log("🔄 Attempting to reconnect...");
                this.connect();
            }
        });

        // Connection error
        connection.on("error", (err) => {
            console.error("⚠️ MongoDB connection error:", err.message);
            this.isConnected = false;
        });

        // Connection reconnected
        connection.on("reconnected", () => {
            console.log("🟡 MongoDB reconnected");
            this.isConnected = true;
            this.connectionAttempts = 0;
            this.retryDelay = 5000; // Reset retry delay
        });

        // Close connection on app termination
        process.on("SIGINT", this.gracefulShutdown.bind(this));
        process.on("SIGTERM", this.gracefulShutdown.bind(this));
        process.on("SIGUSR2", this.gracefulShutdown.bind(this)); // Nodemon restart
    }

    startHealthCheck() {
        // Health check every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkHealth();
            } catch (error) {
                console.error("Health check failed:", error.message);
            }
        }, 30000);
    }

    async checkHealth() {
        try {
            const adminDB = mongoose.connection.db.admin();
            const result = await adminDB.ping();

            if (result.ok === 1) {
                this.isConnected = true;
            } else {
                throw new Error("Database ping failed");
            }
        } catch (error) {
            this.isConnected = false;
            throw error;
        }
    }

    // Health check endpoint data
    async getHealthStatus() {
        const connection = mongoose.connection;

        try {
            // Test database responsiveness
            await this.checkHealth();

            return {
                status: "healthy",
                database: {
                    connected: this.isConnected,
                    readyState: connection.readyState,
                    readyStateText: this.getReadyStateText(
                        connection.readyState
                    ),
                    host: connection.host,
                    port: connection.port,
                    name: connection.name,
                },
                stats: {
                    connectionAttempts: this.connectionAttempts,
                    maxRetries: this.maxRetries,
                    uptime: process.uptime(),
                },
                environment: process.env.NODE_ENV || "development",
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: "unhealthy",
                error: error.message,
                database: {
                    connected: false,
                    readyState: connection.readyState,
                    readyStateText: this.getReadyStateText(
                        connection.readyState
                    ),
                },
                stats: {
                    connectionAttempts: this.connectionAttempts,
                    maxRetries: this.maxRetries,
                },
                environment: process.env.NODE_ENV || "development",
                timestamp: new Date().toISOString(),
            };
        }
    }

    getReadyStateText(state) {
        const states = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting",
        };
        return states[state] || "unknown";
    }

    async gracefulShutdown(signal) {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

        try {
            // Clear health check interval
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }

            // Close database connection
            await mongoose.connection.close();
            console.log("✅ Database connection closed gracefully");

            console.log("🏁 Graceful shutdown completed");
            process.exit(0);
        } catch (error) {
            console.error("❌ Error during graceful shutdown:", error);
            process.exit(1);
        }
    }

    // Simple connection status check
    isHealthy() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Export the connect function for backwards compatibility
const connectDB = () => dbManager.connect();

// Export additional utilities
module.exports = {
    connectDB,
    dbManager,
    getHealthStatus: () => dbManager.getHealthStatus(),
    isHealthy: () => dbManager.isHealthy(),
};
