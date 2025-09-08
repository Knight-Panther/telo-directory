// server/services/userCleanupService.js
const User = require("../models/User");

/**
 * User Cleanup Service for Delayed Deletion System
 * 
 * This service handles the permanent deletion of user accounts that have
 * exceeded their deletion grace period. It runs as a background job and
 * ensures complete cleanup of user data while maintaining audit logs.
 * 
 * Design Principles:
 * - Safety first: Multiple checks before deletion
 * - Complete cleanup: Removes all associated user data
 * - Audit logging: Detailed logs for compliance and debugging
 * - Error resilience: Graceful handling of edge cases
 */

class UserCleanupService {
    constructor() {
        this.isRunning = false;
        this.lastRunAt = null;
        this.runCount = 0;
        this.deletionStats = {
            totalProcessed: 0,
            totalDeleted: 0,
            totalErrors: 0,
            lastRunStats: null
        };
    }

    /**
     * Main cleanup method - finds and processes expired user deletions
     * 
     * @returns {Object} - Statistics about the cleanup run
     */
    async runCleanup() {
        if (this.isRunning) {
            console.log("🔄 User cleanup already running, skipping this execution");
            return {
                skipped: true,
                reason: "Cleanup already in progress"
            };
        }

        this.isRunning = true;
        this.runCount++;
        const startTime = new Date();
        
        console.log(`🚀 Starting user cleanup job #${this.runCount} at ${startTime.toISOString()}`);

        const runStats = {
            startTime,
            endTime: null,
            usersProcessed: 0,
            usersDeleted: 0,
            errors: [],
            totalDuration: 0
        };

        try {
            // Find all users whose deletion time has expired
            const expiredUsers = await User.findExpiredDeletions();
            
            console.log(`🔍 Found ${expiredUsers.length} users scheduled for deletion`);
            runStats.usersProcessed = expiredUsers.length;

            if (expiredUsers.length === 0) {
                console.log("✅ No users to delete - cleanup completed");
                return this._finalizeRun(runStats);
            }

            // Process each expired user
            for (const user of expiredUsers) {
                try {
                    await this._deleteUserPermanently(user);
                    runStats.usersDeleted++;
                } catch (error) {
                    console.error(`❌ Failed to delete user ${user.email}:`, error);
                    runStats.errors.push({
                        userId: user._id,
                        email: user.email,
                        error: error.message
                    });
                }
            }

            // Update global statistics
            this.deletionStats.totalProcessed += runStats.usersProcessed;
            this.deletionStats.totalDeleted += runStats.usersDeleted;
            this.deletionStats.totalErrors += runStats.errors.length;

            console.log(`✅ Cleanup completed: ${runStats.usersDeleted}/${runStats.usersProcessed} users deleted successfully`);
            
            if (runStats.errors.length > 0) {
                console.warn(`⚠️ ${runStats.errors.length} deletion errors occurred`);
            }

            return this._finalizeRun(runStats);

        } catch (error) {
            console.error("💥 Critical error during user cleanup:", error);
            runStats.errors.push({
                type: "CRITICAL_ERROR",
                error: error.message
            });
            return this._finalizeRun(runStats);
        }
    }

    /**
     * Permanently delete a single user and all associated data
     * 
     * @param {Object} user - User document to delete
     */
    async _deleteUserPermanently(user) {
        const userId = user._id;
        const userEmail = user.email;
        const scheduledAt = user.deletionScheduledAt;
        const scheduledFor = user.deletionScheduledFor;

        console.log(`🗑️ Permanently deleting user: ${userEmail} (scheduled: ${scheduledFor.toISOString()})`);

        // Safety check: Ensure deletion time has actually passed
        if (scheduledFor > new Date()) {
            throw new Error(`Deletion time not yet reached: ${scheduledFor.toISOString()}`);
        }

        // Safety check: Ensure user is actually scheduled for deletion
        if (!user.deletionScheduledAt) {
            throw new Error("User is not scheduled for deletion");
        }

        try {
            // Future-proof: Clean up associated data
            // This is where you would add cleanup for:
            // - Business reviews/ratings by this user
            // - Comments or posts by this user
            // - Any other user-related data
            
            // For now, we focus on the user record itself
            // The user's favorites are embedded, so they'll be deleted with the user

            // Perform the actual deletion
            const deleteResult = await User.findByIdAndDelete(userId);
            
            if (!deleteResult) {
                throw new Error("User not found during deletion - may have been deleted already");
            }

            // Log successful deletion for audit trail
            console.log(`✅ User permanently deleted: ${userEmail} (ID: ${userId})`);
            console.log(`   - Originally scheduled: ${scheduledAt?.toISOString()}`);
            console.log(`   - Deletion deadline: ${scheduledFor.toISOString()}`);
            console.log(`   - Account age: ${this._calculateAccountAge(deleteResult.createdAt)} days`);

        } catch (error) {
            // Re-throw with additional context
            throw new Error(`Failed to delete user ${userEmail} (${userId}): ${error.message}`);
        }
    }

    /**
     * Finalize the cleanup run and update statistics
     * 
     * @param {Object} runStats - Statistics for this run
     * @returns {Object} - Final run statistics
     */
    _finalizeRun(runStats) {
        runStats.endTime = new Date();
        runStats.totalDuration = runStats.endTime - runStats.startTime;
        
        this.isRunning = false;
        this.lastRunAt = runStats.endTime;
        this.deletionStats.lastRunStats = runStats;

        console.log(`🏁 Cleanup job #${this.runCount} completed in ${runStats.totalDuration}ms`);

        return {
            success: true,
            runNumber: this.runCount,
            ...runStats
        };
    }

    /**
     * Calculate account age in days
     * 
     * @param {Date} createdAt - Account creation date
     * @returns {number} - Age in days
     */
    _calculateAccountAge(createdAt) {
        const now = new Date();
        const diffTime = now - createdAt;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Get service statistics
     * 
     * @returns {Object} - Service statistics
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            lastRunAt: this.lastRunAt,
            runCount: this.runCount,
            ...this.deletionStats
        };
    }

    /**
     * Get cleanup job status
     * 
     * @returns {Object} - Current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunAt: this.lastRunAt,
            runCount: this.runCount,
            nextRunEstimate: this.lastRunAt ? 
                new Date(this.lastRunAt.getTime() + (6 * 60 * 60 * 1000)) : // 6 hours from last run
                new Date(Date.now() + (6 * 60 * 60 * 1000)) // 6 hours from now
        };
    }

    /**
     * Manually trigger cleanup (for admin use)
     * 
     * @returns {Object} - Cleanup results
     */
    async manualCleanup() {
        console.log("🔧 Manual cleanup triggered");
        return await this.runCleanup();
    }
}

// Create singleton instance
const userCleanupService = new UserCleanupService();

module.exports = userCleanupService;