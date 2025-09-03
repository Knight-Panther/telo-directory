/**
 * Temporary Registration Storage Service
 * 
 * This service implements the "verify-before-save" architecture by storing
 * registration data in memory until email verification is completed.
 * 
 * Key Benefits:
 * - Zero database pollution from unverified registrations
 * - Fast in-memory operations 
 * - Automatic cleanup of expired registrations
 * - Memory-efficient storage
 * 
 * Architecture:
 * - In-memory Map for O(1) token lookup
 * - Automatic expiration handling
 * - Periodic cleanup to prevent memory leaks
 * - Thread-safe operations
 */

const bcrypt = require('bcryptjs');

/**
 * In-memory storage for temporary registrations
 * Key: verification token (string)
 * Value: registration data object
 */
const tempRegistrations = new Map();

/**
 * Configuration constants
 */
const CONFIG = {
    // How long registration data is kept before expiration
    REGISTRATION_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours

    // How often to run cleanup of expired registrations
    CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour

    // Maximum number of temporary registrations to prevent memory exhaustion
    MAX_TEMP_REGISTRATIONS: 10000,

    // Bcrypt rounds for password hashing (same as User model)
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
};

/**
 * Store registration data temporarily until email verification
 * 
 * @param {string} verificationToken - Unique token for this registration
 * @param {Object} registrationData - User registration data
 * @param {string} registrationData.email - User email
 * @param {string} registrationData.password - Plain text password (will be hashed)
 * @param {string} registrationData.name - User name
 * @param {string} [registrationData.phone] - Optional phone number
 * @returns {Promise<boolean>} - True if stored successfully
 */
async function storeTempRegistration(verificationToken, registrationData) {
    try {
        // Check if we're at maximum capacity
        if (tempRegistrations.size >= CONFIG.MAX_TEMP_REGISTRATIONS) {
            console.warn(`⚠️  Temporary registrations at maximum capacity (${CONFIG.MAX_TEMP_REGISTRATIONS}). Running cleanup...`);
            await cleanupExpiredRegistrations();
            
            // If still at capacity after cleanup, reject new registration
            if (tempRegistrations.size >= CONFIG.MAX_TEMP_REGISTRATIONS) {
                console.error('🚨 Cannot store temporary registration - memory limit reached');
                return false;
            }
        }
        
        // Hash the password before storing
        const salt = await bcrypt.genSalt(CONFIG.BCRYPT_ROUNDS);
        const hashedPassword = await bcrypt.hash(registrationData.password, salt);
        
        // Create registration record
        const registrationRecord = {
            email: registrationData.email.toLowerCase().trim(),
            password: hashedPassword, // Store hashed password
            name: registrationData.name.trim(),
            phone: registrationData.phone ? registrationData.phone.trim() : undefined,
            
            // Metadata
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + CONFIG.REGISTRATION_EXPIRY_MS),
            verificationToken: verificationToken,
            
            // Security tracking
            ipAddress: registrationData.ipAddress || 'unknown',
            userAgent: registrationData.userAgent || 'unknown'
        };
        
        // Store in memory
        tempRegistrations.set(verificationToken, registrationRecord);
        
        console.log(`📝 Temporary registration stored for ${registrationData.email} (expires in 24h)`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to store temporary registration:', error);
        return false;
    }
}

/**
 * Retrieve and remove temporary registration data
 * 
 * @param {string} verificationToken - Token to look up
 * @returns {Object|null} - Registration data or null if not found/expired
 */
function retrieveAndRemoveTempRegistration(verificationToken) {
    if (!verificationToken || typeof verificationToken !== 'string') {
        return null;
    }
    
    const registration = tempRegistrations.get(verificationToken);
    
    if (!registration) {
        return null;
    }
    
    // Check if registration has expired
    if (registration.expiresAt < new Date()) {
        tempRegistrations.delete(verificationToken);
        console.log(`🕐 Expired temporary registration removed: ${registration.email}`);
        return null;
    }
    
    // Remove from temporary storage (consume the token)
    tempRegistrations.delete(verificationToken);
    
    console.log(`✅ Retrieved temporary registration: ${registration.email}`);
    
    return registration;
}

/**
 * Check if a temporary registration exists for a token
 * Does not consume/remove the registration
 * 
 * @param {string} verificationToken - Token to check
 * @returns {boolean} - True if valid registration exists
 */
function hasTempRegistration(verificationToken) {
    if (!verificationToken) return false;
    
    const registration = tempRegistrations.get(verificationToken);
    
    if (!registration) return false;
    
    // Check expiration
    if (registration.expiresAt < new Date()) {
        tempRegistrations.delete(verificationToken);
        return false;
    }
    
    return true;
}

/**
 * Check if an email has a pending registration
 * Useful for preventing duplicate registrations
 * 
 * @param {string} email - Email to check
 * @returns {boolean} - True if email has pending registration
 */
function hasEmailPendingRegistration(email) {
    if (!email) return false;
    
    const normalizedEmail = email.toLowerCase().trim();
    
    for (const [token, registration] of tempRegistrations) {
        if (registration.email === normalizedEmail) {
            // Check if still valid
            if (registration.expiresAt >= new Date()) {
                return true;
            } else {
                // Clean up expired registration
                tempRegistrations.delete(token);
            }
        }
    }
    
    return false;
}

/**
 * Clean up expired temporary registrations
 * Prevents memory leaks by removing old data
 *
 * @returns {Promise<number>} - Number of registrations cleaned up
 */
async function cleanupExpiredRegistrations() {
    const currentTime = new Date();
    let cleanedCount = 0;

    for (const [token, registration] of tempRegistrations) {
        if (registration.expiresAt < currentTime) {
            tempRegistrations.delete(token);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(
            `🧹 Cleaned up ${cleanedCount} expired temporary registrations`
        );
    }

    return cleanedCount;
}

/**
 * Get service statistics
 * Useful for monitoring and debugging
 *
 * @returns {Object} - Service statistics
 */
function getServiceStats() {
    const now = new Date();
    let expiredCount = 0;
    let validCount = 0;

    for (const registration of tempRegistrations.values()) {
        if (registration.expiresAt < now) {
            expiredCount++;
        } else {
            validCount++;
        }
    }

    return {
        totalRegistrations: tempRegistrations.size,
        validRegistrations: validCount,
        expiredRegistrations: expiredCount,
        maxCapacity: CONFIG.MAX_TEMP_REGISTRATIONS,
        memoryUsagePercent: Math.round(
            (tempRegistrations.size / CONFIG.MAX_TEMP_REGISTRATIONS) * 100
        ),
        expiryTimeHours: CONFIG.REGISTRATION_EXPIRY_MS / (60 * 60 * 1000),
        cleanupIntervalHours: CONFIG.CLEANUP_INTERVAL_MS / (60 * 60 * 1000),
    };
}

/**
 * Clear all temporary registrations
 * Used for testing and emergency cleanup
 *
 * @returns {number} - Number of registrations cleared
 */
function clearAllTempRegistrations() {
    const count = tempRegistrations.size;
    tempRegistrations.clear();
    console.log(`🗑️  Cleared all ${count} temporary registrations`);
    return count;
}

/**
 * Get pending registration data by email (for resending verification)
 * Returns the registration data if found and not expired
 *
 * @param {string} email - Email to look up
 * @returns {Object|null} - Registration data or null if not found/expired
 */
function getPendingRegistrationByEmail(email) {
    if (!email) return null;
    
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();
    
    for (const [token, registration] of tempRegistrations) {
        if (registration.email === normalizedEmail) {
            // Check if still valid
            if (registration.expiresAt >= now) {
                return {
                    ...registration,
                    verificationToken: token // Include the token for resending
                };
            } else {
                // Clean up expired registration
                tempRegistrations.delete(token);
            }
        }
    }
    
    return null;
}

/**
 * Get all pending emails (for admin monitoring)
 * Returns only email addresses, not full registration data for privacy
 *
 * @returns {Array<Object>} - Array of pending registration info
 */
function getPendingRegistrations() {
    const pending = [];
    const now = new Date();

    for (const registration of tempRegistrations.values()) {
        if (registration.expiresAt >= now) {
            pending.push({
                email: registration.email,
                createdAt: registration.createdAt,
                expiresAt: registration.expiresAt,
                timeRemaining: Math.round(
                    (registration.expiresAt - now) / (60 * 1000)
                ), // minutes
            });
        }
    }

    return pending.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Start automatic cleanup interval
 * Called once when server starts
 */
function startCleanupInterval() {
    setInterval(async () => {
        await cleanupExpiredRegistrations();
    }, CONFIG.CLEANUP_INTERVAL_MS);

    console.log(
        `🔄 Started temporary registration cleanup (every ${
            CONFIG.CLEANUP_INTERVAL_MS / (60 * 1000)
        } minutes)`
    );
}

/**
 * Initialize the service
 * Called once when server starts
 */
function initService() {
    console.log(`🚀 Temporary Registration Service initialized`);
    console.log(`   - Max capacity: ${CONFIG.MAX_TEMP_REGISTRATIONS} registrations`);
    console.log(`   - Registration expiry: ${CONFIG.REGISTRATION_EXPIRY_MS / (60 * 60 * 1000)} hours`);
    console.log(`   - Cleanup interval: ${CONFIG.CLEANUP_INTERVAL_MS / (60 * 1000)} minutes`);
    
    startCleanupInterval();
}

// Initialize service if not in test environment
if (process.env.NODE_ENV !== 'test') {
    initService();
}

module.exports = {
    // Core functionality
    storeTempRegistration,
    retrieveAndRemoveTempRegistration,
    hasTempRegistration,
    hasEmailPendingRegistration,
    getPendingRegistrationByEmail,

    // Management functions
    cleanupExpiredRegistrations,
    clearAllTempRegistrations,

    // Monitoring functions
    getServiceStats,
    getPendingRegistrations,

    // Service lifecycle
    initService,

    // Configuration (read-only)
    CONFIG: { ...CONFIG },
};
