// server/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ✅ NEW ADDITION: Environment Variable Configuration
/**
 * Security Configuration from Environment Variables
 *
 * These settings control account locking behavior for brute force protection.
 * Values can be configured via environment variables or use secure defaults.
 */

// Parse MAX_LOGIN_ATTEMPTS from environment (default: 5)
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

// Parse ACCOUNT_LOCK_TIME from environment (default: 2 hours)
const parseAccountLockTime = () => {
    const lockTimeEnv = process.env.ACCOUNT_LOCK_TIME || "2h";

    // Parse time format: "2h", "30m", "1d", etc.
    const timeMatch = lockTimeEnv.match(/^(\d+)([hmsd])$/);
    if (!timeMatch) {
        console.warn(
            `Invalid ACCOUNT_LOCK_TIME format: ${lockTimeEnv}. Using default 2h.`
        );
        return 2 * 60 * 60 * 1000; // 2 hours default
    }

    const [, value, unit] = timeMatch;
    const numValue = parseInt(value);

    switch (unit) {
        case "s":
            return numValue * 1000; // seconds
        case "m":
            return numValue * 60 * 1000; // minutes
        case "h":
            return numValue * 60 * 60 * 1000; // hours
        case "d":
            return numValue * 24 * 60 * 60 * 1000; // days
        default:
            console.warn(`Unknown time unit: ${unit}. Using default 2h.`);
            return 2 * 60 * 60 * 1000; // 2 hours default
    }
};

const ACCOUNT_LOCK_TIME = parseAccountLockTime();

// Parse BCRYPT_ROUNDS from environment (default: 12)
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Log configuration for debugging (only in development)
if (process.env.NODE_ENV === "development") {
    console.log(
        `🔒 Security Config: MAX_LOGIN_ATTEMPTS=${MAX_LOGIN_ATTEMPTS}, ACCOUNT_LOCK_TIME=${
            process.env.ACCOUNT_LOCK_TIME || "2h"
        }, BCRYPT_ROUNDS=${BCRYPT_ROUNDS}`
    );
}
// ✅ END NEW ADDITION

/**
 * User Schema for Authentication and Favorites System
 *
 * This model integrates seamlessly with your existing Business model
 * and provides the foundation for user authentication, email verification,
 * password reset, and the favorites system you'll build later.
 *
 * Key Design Principles:
 * - Security first: All passwords are automatically hashed
 * - User experience: Account locking prevents brute force while staying user-friendly
 * - Scalability: Indexed fields ensure fast queries as your user base grows
 * - Integration: Favorites array connects directly to your Business model
 */

const userSchema = new mongoose.Schema(
    {
        // === CORE IDENTIFICATION FIELDS ===

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true, // Ensures no duplicate accounts
            lowercase: true, // Automatically converts "User@Example.com" to "user@example.com"
            trim: true, // Removes extra spaces that users accidentally add
            // Email validation regex that covers 99.99% of real email addresses
            // More permissive than strict RFC compliance to avoid blocking real users
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please enter a valid email address",
            ],
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"],
            // Note: We validate password complexity in middleware, not here
            // This allows more flexible validation and better error messages
        },

        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters long"],
            maxlength: [50, "Name cannot exceed 50 characters"],
        },

        phone: {
            type: String,
            trim: true,
            // Optional field - users can add this later in their profile
            // Georgian phone number format support plus international numbers
            match: [
                /^[+]?[0-9\s\-()]{9,15}$/,
                "Please enter a valid phone number",
            ],
            // We make this optional because not all users want to provide phone numbers
        },

        // === ACCOUNT STATUS AND VERIFICATION ===

        isEmailVerified: {
            type: Boolean,
            default: false, // All new users start unverified
            // This allows you to control access to certain features
            // until users prove they own their email address
        },

        emailVerificationToken: {
            type: String,
            sparse: true, // Allows multiple null values while keeping unique constraint for actual tokens
            // This token gets generated when user registers and cleared when they verify
        },

        emailVerificationExpires: {
            type: Date,
            // Verification links expire for security (typically 24-48 hours)
            // Prevents old verification emails from being used maliciously
        },

        emailVerifiedAt: {
            type: Date,
            // NEW: Track when email was verified for analytics and security
            // Useful for understanding user engagement and verification patterns
        },

        // === EMAIL CHANGE FUNCTIONALITY (NEW) ===

        pendingEmailChange: {
            type: String,
            sparse: true,
            lowercase: true,
            trim: true,
            // NEW: Stores the new email address while waiting for verification
            // Only gets applied to main email field after verification
        },

        emailChangeToken: {
            type: String,
            sparse: true,
            // NEW: Token for verifying email changes (separate from registration verification)
            // Prevents unauthorized email changes even if someone gains account access
        },

        emailChangeTokenExpires: {
            type: Date,
            // NEW: Expiration for email change tokens (typically 24 hours)
            // Security measure to prevent old change requests from being abused
        },

        emailChangedAt: {
            type: Date,
            // NEW: Track when email was last changed for security monitoring
            // Helps detect suspicious account activity
        },

        // === PASSWORD RESET FUNCTIONALITY ===

        resetPasswordToken: {
            type: String,
            sparse: true, // Same reasoning as emailVerificationToken
            // Generated when user requests password reset
        },

        resetPasswordExpires: {
            type: Date,
            // Reset links expire quickly (typically 15-30 minutes)
            // Short expiration reduces security risk if email is compromised
        },

        // === FAVORITES SYSTEM ===

        favorites: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Business", // Creates relationship to your existing Business model
                // This array stores ObjectIds of businesses the user has favorited
                // Using ObjectIds instead of business names handles business updates gracefully
            },
        ],

        // === SECURITY AND MONITORING FIELDS ===

        lastLoginAt: {
            type: Date,
            // Track when user last logged in successfully
            // Useful for analytics and detecting inactive accounts
        },

        loginAttempts: {
            type: Number,
            default: 0,
            // Counter for failed login attempts
            // Resets to 0 on successful login
        },

        lockUntil: {
            type: Date,
            // When account lock expires
            // Prevents brute force attacks while remaining user-friendly
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields

        // Database indexes for performance optimization
        // These make common queries much faster as your user base grows
        indexes: [
            { email: 1 }, // Fast email lookups for login
            { emailVerificationToken: 1 }, // Fast verification token lookups
            { resetPasswordToken: 1 }, // Fast password reset token lookups
            { emailChangeToken: 1 }, // NEW: Fast email change token lookups
            { pendingEmailChange: 1 }, // NEW: Fast pending email lookups
            { favorites: 1 }, // Fast queries for user's favorited businesses
        ],
    }
);

// === MONGOOSE MIDDLEWARE FOR AUTOMATIC PASSWORD HASHING ===

/**
 * Pre-save middleware: Automatically hash passwords before saving to database
 *
 * This runs every time a User document is saved, but only hashes the password
 * if it has been modified. This prevents re-hashing already hashed passwords
 * and allows other user updates without affecting the password.
 */
userSchema.pre("save", async function (next) {
    // Only hash the password if it has been modified (or is new)
    // This prevents rehashing when updating other user fields
    if (!this.isModified("password")) return next();

    try {
        // ✅ CHANGED: Use environment variable instead of hardcoded 12
        // Generate a salt with cost factor from BCRYPT_ROUNDS (default: 12)
        // Cost factor 12 means 2^12 = 4,096 iterations
        // This is the current security standard (2024) - secure but not too slow
        // Higher numbers = more secure but slower login/registration
        const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);

        // Hash the password with the generated salt
        // The salt is automatically included in the final hash
        this.password = await bcrypt.hash(this.password, salt);

        next(); // Continue with saving the document
    } catch (error) {
        next(error); // Pass any errors to Mongoose error handling
    }
});

// === INSTANCE METHODS FOR PASSWORD AND SECURITY ===

/**
 * Compare a provided password with the stored hash
 *
 * This method safely compares a plain text password (from login form)
 * with the hashed password stored in the database. bcrypt handles
 * extracting the salt from the stored hash and performing the comparison.
 *
 * @param {string} candidatePassword - Plain text password to check
 * @returns {boolean} - True if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        // bcrypt.compare handles the complex process of:
        // 1. Extracting the salt from the stored hash
        // 2. Hashing the candidate password with that salt
        // 3. Comparing the results in a timing-safe manner
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        // If comparison fails for any reason, deny access
        // This fail-secure approach protects against edge cases
        return false;
    }
};

/**
 * Check if the account is currently locked due to failed login attempts
 *
 * This virtual property provides a clean way to check if an account
 * is locked without exposing the internal lockUntil logic.
 */
userSchema.virtual("isLocked").get(function () {
    // Account is locked if lockUntil exists and is in the future
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Handle failed login attempts and implement account locking
 *
 * ✅ UPDATED: Now uses environment variables for configuration:
 * - MAX_LOGIN_ATTEMPTS: How many failures before locking (default: 5)
 * - ACCOUNT_LOCK_TIME: How long to lock account (default: 2h)
 *
 * This method provides graduated security responses:
 * - First few failures: just increment counter
 * - After max failures: lock account for configured time
 * - If previous lock expired: restart counting at 1
 *
 * This balance prevents brute force attacks while not permanently
 * locking out users who genuinely forgot their password.
 */
userSchema.methods.incLoginAttempts = async function () {
    // If we have a previous lock that has expired, restart at 1
    // This gives users a fresh start after the lock period
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 }, // Remove the expired lock
            $set: { loginAttempts: 1 }, // Start counting from 1
        });
    }

    // Prepare to increment the login attempts counter
    const updates = { $inc: { loginAttempts: 1 } };

    // ✅ CHANGED: Use environment variables instead of hardcoded values
    // If we've reached the max attempts and account isn't already locked
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + ACCOUNT_LOCK_TIME,
        };

        // ✅ NEW: Log account locking for security monitoring
        if (process.env.NODE_ENV === "development") {
            console.log(
                `🔒 Account locked: ${this.email} for ${
                    process.env.ACCOUNT_LOCK_TIME || "2h"
                } after ${MAX_LOGIN_ATTEMPTS} failed attempts`
            );
        }
    }

    return this.updateOne(updates);
};

/**
 * Reset login attempts after successful authentication
 *
 * This method cleans up security tracking fields and updates
 * the last login timestamp. Called after successful login.
 */
userSchema.methods.resetLoginAttempts = async function () {
    return this.updateOne({
        $unset: {
            loginAttempts: 1, // Remove failed attempt counter
            lockUntil: 1, // Remove any active lock
        },
        $set: {
            lastLoginAt: new Date(), // Record successful login time
        },
    });
};

// === STATIC METHODS FOR USER MANAGEMENT ===

/**
 * Find user by email (case-insensitive)
 *
 * This static method provides a consistent way to find users by email
 * while handling case variations. Users often mix up capitalization
 * in email addresses, so this prevents login issues.
 *
 * @param {string} email - Email address to search for
 * @returns {Object|null} - User document or null if not found
 */
userSchema.statics.findByEmail = function (email) {
    return this.findOne({
        email: email.toLowerCase(),
    });
};

/**
 * Find user by verification token
 *
 * This method handles email verification by finding users with
 * matching verification tokens that haven't expired yet.
 *
 * @param {string} token - Verification token from email link
 * @returns {Object|null} - User document or null if token invalid/expired
 */
userSchema.statics.findByVerificationToken = function (token) {
    return this.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() }, // Token must not be expired
    });
};

/**
 * Find user by password reset token
 *
 * Similar to verification token lookup, but for password resets.
 * The short expiration time (typically 15-30 minutes) provides
 * security while still being user-friendly.
 *
 * @param {string} token - Reset token from email link
 * @returns {Object|null} - User document or null if token invalid/expired
 */
userSchema.statics.findByResetToken = function (token) {
    return this.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }, // Token must not be expired
    });
};

/**
 * NEW: Find user by email change token
 *
 * This method handles email change verification by finding users with
 * matching email change tokens that haven't expired yet.
 *
 * @param {string} token - Email change token from email link
 * @returns {Object|null} - User document or null if token invalid/expired
 */
userSchema.statics.findByEmailChangeToken = function (token) {
    return this.findOne({
        emailChangeToken: token,
        emailChangeTokenExpires: { $gt: Date.now() }, // Token must not be expired
    });
};

// ✅ NEW ADDITION: Get current security configuration
/**
 * Get current security configuration
 * Useful for admin dashboards and debugging
 */
userSchema.statics.getSecurityConfig = function () {
    return {
        maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
        accountLockTime: process.env.ACCOUNT_LOCK_TIME || "2h",
        accountLockTimeMs: ACCOUNT_LOCK_TIME,
        bcryptRounds: BCRYPT_ROUNDS,
    };
};

// === EXPORT THE MODEL ===

/**
 * Export the User model
 *
 * This creates the User collection in MongoDB with all the schema
 * validations, middleware, and methods we've defined above.
 *
 * The model will be used in your authentication routes to:
 * - Create new users during registration
 * - Authenticate users during login
 * - Manage user profiles and favorites
 * - Handle email verification and password resets
 * - Handle email changes with verification
 */
module.exports = mongoose.model("User", userSchema);
