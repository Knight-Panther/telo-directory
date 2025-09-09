// server/services/emailService.js
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Load environment variables
require("dotenv").config();

/**
 * Email Service for TELO Directory
 *
 * Handles all email communications including:
 * - Email verification for new registrations
 * - Email change verification for existing users
 * - Password reset emails (future enhancement)
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Rate limiting helpers
 * - HTML email templates with personalization
 * - Secure token generation
 * - Environment-based configuration
 */

// Email configuration from environment variables
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || "gmail",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    fromName: process.env.EMAIL_FROM_NAME || "TELO Directory",
    fromAddress: process.env.EMAIL_FROM_ADDRESS,
    baseUrl: process.env.EMAIL_BASE_URL || "http://localhost:3001",
    verificationExpiry: process.env.EMAIL_VERIFICATION_EXPIRY || "24h",
    tokenLength: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_LENGTH) || 32,
};

// Rate limiting storage (in production, use Redis)
const emailRateLimit = new Map();

// IP-based rate limiting for additional security (in production, use Redis)
const ipRateLimit = new Map();

/**
 * Create and configure nodemailer transporter
 * Supports Gmail and SMTP configurations
 */
const createTransporter = () => {
    console.log("📧 Creating email transporter with config:", {
        service: EMAIL_CONFIG.service,
        user: EMAIL_CONFIG.user
            ? `${EMAIL_CONFIG.user.substring(0, 3)}***@${
                  EMAIL_CONFIG.user.split("@")[1]
              }`
            : "undefined",
        fromAddress: EMAIL_CONFIG.fromAddress,
    });

    const config = {
        service: EMAIL_CONFIG.service,
        auth: {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.pass,
        },
        // Security options for Gmail
        secure: EMAIL_CONFIG.service === "gmail",
        tls: {
            rejectUnauthorized: false, // For development only
        },
    };

    // For non-Gmail services, use SMTP configuration
    if (EMAIL_CONFIG.service !== "gmail") {
        delete config.service;
        config.host = process.env.SMTP_HOST;
        config.port = parseInt(process.env.SMTP_PORT) || 587;
        config.secure = false; // Use STARTTLS for port 587
    }

    const transporter = nodemailer.createTransport(config);

    // Verify transporter configuration
    transporter.verify((error, success) => {
        if (error) {
            console.error("❌ Email transporter verification failed:", error);
        } else {
            console.log("✅ Email transporter verified and ready");
        }
    });

    return transporter;
};

/**
 * Generate secure random token for email verification
 * Uses crypto.randomBytes for cryptographically secure tokens
 */
const generateVerificationToken = () => {
    return crypto.randomBytes(EMAIL_CONFIG.tokenLength).toString("hex");
};

/**
 * Calculate token expiration time
 * Converts string format (24h, 15m) to Date object
 */
const getTokenExpiration = () => {
    const expiry = EMAIL_CONFIG.verificationExpiry;
    const now = new Date();

    if (expiry.endsWith("h")) {
        const hours = parseInt(expiry);
        return new Date(now.getTime() + hours * 60 * 60 * 1000);
    } else if (expiry.endsWith("m")) {
        const minutes = parseInt(expiry);
        return new Date(now.getTime() + minutes * 60 * 1000);
    }

    // Default to 24 hours if format not recognized
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
};

/**
 * HTML Email Template for Email Verification
 * Professional, mobile-responsive design
 */
const createVerificationEmailTemplate = (userName, verificationUrl) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - TELO Directory</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6; 
                color: #333;
                background-color: #f8f9fa;
            }
            .container { 
                max-width: 600px; 
                margin: 40px auto; 
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 { 
                font-size: 28px; 
                margin-bottom: 10px;
                font-weight: 600;
            }
            .content { 
                padding: 40px 30px;
            }
            .greeting { 
                font-size: 18px; 
                margin-bottom: 20px;
                color: #2d3748;
            }
            .message { 
                margin-bottom: 30px; 
                line-height: 1.7;
                color: #4a5568;
            }
            .verify-button { 
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .verify-button:hover { 
                transform: translateY(-2px);
            }
            .footer { 
                background: #f7fafc;
                padding: 30px;
                text-align: center;
                color: #718096;
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
            }
            .security-note {
                background: #fef5e7;
                border-left: 4px solid #f6ad55;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 14px;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; }
                .header, .content { padding: 30px 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 TELO Directory</h1>
                <p>Welcome to Georgia's Business Network</p>
            </div>
            
            <div class="content">
                <div class="greeting">Hello ${userName}! 👋</div>
                
                <div class="message">
                    <p>Thank you for registering with TELO Directory! We're excited to have you join Georgia's premier business networking platform.</p>
                    
                    <p>To complete your registration and access your account, please verify your email address by clicking the button below:</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="verify-button">
                        ✅ Verify My Email Address
                    </a>
                </div>
                
                <div class="security-note">
                    <strong>🔒 Security Note:</strong> This verification link will expire in 24 hours for your security. If you didn't create an account with TELO Directory, please ignore this email.
                </div>
                
                <div class="message">
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea; font-size: 14px;">${verificationUrl}</p>
                </div>
                
                <div class="message">
                    <p>After verification, you'll be able to:</p>
                    <ul style="margin: 10px 0 0 20px; color: #4a5568;">
                        <li>Access your personalized dashboard</li>
                        <li>Save and manage your favorite businesses</li>
                        <li>Connect with other business professionals</li>
                        <li>List your own business (coming soon)</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>TELO Directory Team</strong></p>
                <p>Connecting businesses across Georgia 🇬🇪</p>
                <p style="margin-top: 15px; font-size: 12px;">
                    If you have any questions, reply to this email or contact our support team.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Check rate limiting for email sending
 * Prevents spam and abuse with both email and IP-based limits
 */
const checkRateLimit = (email, ipAddress = null) => {
    const now = Date.now();
    const rateLimitKey = `email_${email}`;
    const lastSent = emailRateLimit.get(rateLimitKey);

    // Email-based rate limit: 1 minute between emails to same address
    if (lastSent && now - lastSent < 60000) {
        const remainingTime = Math.ceil((60000 - (now - lastSent)) / 1000);
        return {
            allowed: false,
            remainingSeconds: remainingTime,
            reason: "email_rate_limit",
        };
    }

    // IP-based rate limit: 10 emails per hour from same IP (prevents bulk abuse)
    if (ipAddress) {
        const ipKey = `ip_${ipAddress}`;
        const ipRequests = ipRateLimit.get(ipKey) || [];

        // Clean up requests older than 1 hour
        const hourAgo = now - 3600000;
        const recentRequests = ipRequests.filter(
            (timestamp) => timestamp > hourAgo
        );

        if (recentRequests.length >= 10) {
            return {
                allowed: false,
                remainingSeconds: Math.ceil(
                    (recentRequests[0] + 3600000 - now) / 1000
                ),
                reason: "ip_rate_limit",
            };
        }

        // Update IP request log
        recentRequests.push(now);
        ipRateLimit.set(ipKey, recentRequests);
    }

    return { allowed: true };
};

/**
 * Update rate limit record
 */
const updateRateLimit = (email) => {
    const rateLimitKey = `email_${email}`;
    emailRateLimit.set(rateLimitKey, Date.now());
};

/**
 * Send email with retry logic
 * Implements exponential backoff for failed attempts
 */
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
    const transporter = createTransporter();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(
                `Email send attempt ${attempt}/${maxRetries} to ${mailOptions.to}`
            );

            const result = await transporter.sendMail(mailOptions);

            console.log(
                `✅ Email sent successfully to ${mailOptions.to}:`,
                result.messageId
            );
            return {
                success: true,
                messageId: result.messageId,
                attempt,
            };
        } catch (error) {
            console.error(
                `❌ Email send attempt ${attempt} failed:`,
                error.message
            );

            // If this is the last attempt, throw the error
            if (attempt === maxRetries) {
                throw {
                    success: false,
                    error: error.message,
                    attempts: maxRetries,
                };
            }

            // Exponential backoff: wait longer between retries
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }
};

/**
 * Main function: Send email verification
 * Public API for sending verification emails
 */
const sendVerificationEmail = async (
    userEmail,
    userName,
    verificationToken,
    ipAddress = null
) => {
    // Check rate limiting (both email and IP-based)
    const rateCheck = checkRateLimit(userEmail, ipAddress);
    if (!rateCheck.allowed) {
        const errorMessage =
            rateCheck.reason === "ip_rate_limit"
                ? "Too many verification emails sent from your location"
                : "Rate limit exceeded";

        throw {
            success: false,
            error: errorMessage,
            code: "RATE_LIMIT_EXCEEDED",
            remainingSeconds: rateCheck.remainingSeconds,
            reason: rateCheck.reason,
        };
    }

    // Create verification URL - pointing to the frontend route that will handle API call
    const verificationUrl = `${EMAIL_CONFIG.baseUrl}/verify-email/confirm/${verificationToken}`;

    // Create email content
    const mailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
        to: userEmail,
        subject: `🎯 Verify your TELO Directory account - Welcome ${userName}!`,
        html: createVerificationEmailTemplate(userName, verificationUrl),
        // Fallback text version
        text: `
            Hello ${userName}!
            
            Welcome to TELO Directory! Please verify your email address by visiting:
            ${verificationUrl}
            
            This link will expire in 24 hours.
            
            If you didn't create this account, please ignore this email.
            
            Best regards,
            TELO Directory Team
        `,
    };

    try {
        const result = await sendEmailWithRetry(mailOptions);

        // Update rate limit on successful send
        updateRateLimit(userEmail);

        return result;
    } catch (error) {
        // Log error for debugging
        console.error(
            "Failed to send verification email after all retries:",
            error
        );
        throw error;
    }
};

/**
 * Send email change verification
 * For when users update their email address
 */
const sendEmailChangeVerification = async (
    newEmail,
    userName,
    verificationToken,
    ipAddress = null
) => {
    // Similar to main verification but different template
    const rateCheck = checkRateLimit(newEmail, ipAddress);
    if (!rateCheck.allowed) {
        const errorMessage =
            rateCheck.reason === "ip_rate_limit"
                ? "Too many verification emails sent from your location"
                : "Rate limit exceeded";

        throw {
            success: false,
            error: errorMessage,
            code: "RATE_LIMIT_EXCEEDED",
            remainingSeconds: rateCheck.remainingSeconds,
            reason: rateCheck.reason,
        };
    }

    const verificationUrl = `${EMAIL_CONFIG.baseUrl}/verify-email/confirm/${verificationToken}`;

    const mailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
        to: newEmail,
        subject: `🔄 Verify your new email address - TELO Directory`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Email Change Verification</h2>
                <p>Hello ${userName},</p>
                <p>You requested to change your email address for your TELO Directory account.</p>
                <p>Please click the button below to verify your new email address:</p>
                <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Verify New Email
                </a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request this change, please ignore this email.</p>
            </div>
        `,
        text: `Hello ${userName}, please verify your new email: ${verificationUrl}`,
    };

    try {
        const result = await sendEmailWithRetry(mailOptions);
        updateRateLimit(newEmail);
        return result;
    } catch (error) {
        console.error("Failed to send email change verification:", error);
        throw error;
    }
};

/**
 * Send 6-digit verification code for email change (simplified approach)
 * Sends code to current email for security
 */
const sendEmailChangeCode = async (currentEmail, userName, code, newEmail) => {
    const mailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
        to: currentEmail,
        subject: `🔑 Email Change Verification Code - TELO Directory`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h2 style="color: #333; text-align: center;">Email Change Request</h2>
                <p>Hello ${userName},</p>
                <p>You requested to change your email address to:</p>
                <p style="background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">${newEmail}</p>
                <p>Please enter this verification code to complete the change:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="background: #007bff; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 6px; font-family: monospace; letter-spacing: 2px;">${code}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This code expires in 10 minutes for security.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this change, please ignore this email.</p>
            </div>
        `,
        text: `Email change verification code: ${code}. New email: ${newEmail}. Code expires in 10 minutes.`,
    };

    try {
        return await sendEmailWithRetry(mailOptions);
    } catch (error) {
        console.error("Failed to send email change code:", error);
        throw error;
    }
};

/**
 * HTML Email Template for Password Reset
 * Professional, mobile-responsive design matching verification template
 */
const createPasswordResetEmailTemplate = (userName, resetUrl) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - TELO Directory</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6; 
                color: #333;
                background-color: #f8f9fa;
            }
            .container { 
                max-width: 600px; 
                margin: 40px auto; 
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header { 
                background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 { 
                font-size: 28px; 
                margin-bottom: 10px;
                font-weight: 600;
            }
            .content { 
                padding: 40px 30px;
            }
            .greeting { 
                font-size: 18px; 
                margin-bottom: 20px;
                color: #2d3748;
            }
            .message { 
                margin-bottom: 30px; 
                line-height: 1.7;
                color: #4a5568;
            }
            .reset-button { 
                display: inline-block;
                background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .reset-button:hover { 
                transform: translateY(-2px);
            }
            .footer { 
                background: #f7fafc;
                padding: 30px;
                text-align: center;
                color: #718096;
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
            }
            .security-note {
                background: #fed7e2;
                border-left: 4px solid #e53e3e;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 14px;
            }
            .warning-note {
                background: #fef5e7;
                border-left: 4px solid #f6ad55;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 14px;
            }
            @media (max-width: 600px) {
                .container { margin: 20px; }
                .header, .content { padding: 30px 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset</h1>
                <p>TELO Directory Security</p>
            </div>
            
            <div class="content">
                <div class="greeting">Hello ${userName}! 👋</div>
                
                <div class="message">
                    <p>We received a request to reset your password for your TELO Directory account.</p>
                    
                    <p>If you requested this password reset, please click the button below to create a new password:</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="reset-button">
                        🔄 Reset My Password
                    </a>
                </div>
                
                <div class="security-note">
                    <strong>🔒 Security Note:</strong> This password reset link will expire in 30 minutes for your security. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </div>
                
                <div class="warning-note">
                    <strong>⚠️ Important:</strong> If you continue to receive password reset emails that you didn't request, please contact our support team immediately.
                </div>
                
                <div class="message">
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #e53e3e; font-size: 14px;">${resetUrl}</p>
                </div>
                
                <div class="message">
                    <p>For your security, please:</p>
                    <ul style="margin: 10px 0 0 20px; color: #4a5568;">
                        <li>Choose a strong, unique password</li>
                        <li>Don't share this reset link with anyone</li>
                        <li>Complete the reset within 30 minutes</li>
                        <li>Log out of other devices if you suspect unauthorized access</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>TELO Directory Security Team</strong></p>
                <p>Protecting businesses across Georgia 🇬🇪</p>
                <p style="margin-top: 15px; font-size: 12px;">
                    If you have any questions or concerns, please contact our support team immediately.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Send password reset email
 * Follows same patterns as verification email with security focus
 */
const sendPasswordResetEmail = async (
    userEmail,
    userName,
    resetToken,
    ipAddress = null
) => {
    // Check rate limiting (stricter for password resets)
    const rateCheck = checkRateLimit(userEmail, ipAddress);
    if (!rateCheck.allowed) {
        const errorMessage =
            rateCheck.reason === "ip_rate_limit"
                ? "Too many password reset emails sent from your location"
                : "Rate limit exceeded for password reset";

        throw {
            success: false,
            error: errorMessage,
            code: "RATE_LIMIT_EXCEEDED",
            remainingSeconds: rateCheck.remainingSeconds,
            reason: rateCheck.reason,
        };
    }

    // Create password reset URL - pointing to frontend reset page
    const resetUrl = `${EMAIL_CONFIG.baseUrl}/reset-password/${resetToken}`;

    // Create email content
    const mailOptions = {
        from: `"${EMAIL_CONFIG.fromName} Security" <${EMAIL_CONFIG.fromAddress}>`,
        to: userEmail,
        subject: `🔐 Password Reset Request - TELO Directory`,
        html: createPasswordResetEmailTemplate(userName, resetUrl),
        // Fallback text version
        text: `
            Hello ${userName}!
            
            We received a request to reset your password for your TELO Directory account.
            
            To reset your password, visit: ${resetUrl}
            
            This link will expire in 30 minutes for security.
            
            If you didn't request this reset, please ignore this email.
            
            For security questions, contact our support team.
            
            Best regards,
            TELO Directory Security Team
        `,
    };

    try {
        const result = await sendEmailWithRetry(mailOptions);

        // Update rate limit on successful send
        updateRateLimit(userEmail);

        return result;
    } catch (error) {
        // Log error for debugging
        console.error(
            "Failed to send password reset email after all retries:",
            error
        );
        throw error;
    }
};

/**
 * Utility function to validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Export all functions
module.exports = {
    sendVerificationEmail,
    sendEmailChangeVerification,
    sendEmailChangeCode,
    sendPasswordResetEmail,
    generateVerificationToken,
    getTokenExpiration,
    isValidEmail,
    checkRateLimit,
    // Export for testing
    createVerificationEmailTemplate,
    createPasswordResetEmailTemplate,
    EMAIL_CONFIG,
};
