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
 * - Business submission notifications (admin + user confirmations)
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

/**
 * HTML Email Template for Business Submission (Admin Notification)
 */
const createBusinessSubmissionEmailTemplate = (submission) => {
    const citiesTags = submission.cities.map(city =>
        `<span class="city-tag">${city}</span>`
    ).join('');

    const categoriesTags = submission.categories.map(category =>
        `<span class="city-tag">${category}</span>`
    ).join('');

    const socialLinksHtml = Object.entries(submission.socialLinks || {})
        .filter(([key, value]) => value && value.trim())
        .map(([platform, url]) =>
            `<div><strong>${platform.charAt(0).toUpperCase() + platform.slice(1)}:</strong> ${url}</div>`
        ).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Business Submission - TELO Directory</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { font-size: 28px; margin: 0 0 10px 0; font-weight: 600; }
            .content { padding: 30px; }
            .field { margin-bottom: 20px; }
            .field label { font-weight: bold; color: #495057; display: block; margin-bottom: 5px; }
            .field-value { padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007bff; }
            .cities-list { display: flex; flex-wrap: wrap; gap: 8px; }
            .city-tag { background: #007bff; color: white; padding: 6px 12px; border-radius: 15px; font-size: 14px; font-weight: 500; }
            .certificate-yes { color: #28a745; font-weight: bold; }
            .certificate-no { color: #6c757d; }
            .copy-section { background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 30px; }
            .copy-title { font-weight: bold; margin-bottom: 15px; color: #495057; font-size: 16px; }
            .copy-content { background: white; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 14px; line-height: 1.4; white-space: pre-line; border: 1px solid #dee2e6; }
            .submission-id { background: #fff3cd; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-weight: bold; display: inline-block; }
            @media (max-width: 600px) {
                .container { margin: 10px; border-radius: 8px; }
                .header, .content { padding: 20px; }
                .cities-list { gap: 6px; }
                .city-tag { padding: 4px 8px; font-size: 12px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 New Business Submission</h1>
                <p>Submission ID: <span class="submission-id">${submission.submissionId}</span></p>
                <p>Submitted: ${new Date(submission.submittedAt).toLocaleString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })}</p>
            </div>

            <div class="content">
                <div class="field">
                    <label>Business Name:</label>
                    <div class="field-value">${submission.businessName}</div>
                </div>

                <div class="field">
                    <label>Categories (${submission.categories.length}):</label>
                    <div class="field-value">
                        <div class="cities-list">${categoriesTags}</div>
                    </div>
                </div>

                <div class="field">
                    <label>Business Type:</label>
                    <div class="field-value">${submission.businessType}</div>
                </div>

                <div class="field">
                    <label>Cities (${submission.cities.length}):</label>
                    <div class="field-value">
                        <div class="cities-list">${citiesTags}</div>
                    </div>
                </div>

                <div class="field">
                    <label>Mobile:</label>
                    <div class="field-value">${submission.mobile}</div>
                </div>

                ${submission.shortDescription ? `
                <div class="field">
                    <label>Description:</label>
                    <div class="field-value">${submission.shortDescription}</div>
                </div>
                ` : ''}

                <div class="field">
                    <label>Certificate:</label>
                    <div class="field-value">
                        <span class="${submission.hasCertificate ? 'certificate-yes' : 'certificate-no'}">
                            ${submission.hasCertificate ? 'YES' : 'NO'}
                        </span>
                        ${submission.hasCertificate && submission.certificateDescription ?
                            `<br><small><em>${submission.certificateDescription}</em></small>` : ''}
                    </div>
                </div>

                ${socialLinksHtml ? `
                <div class="field">
                    <label>Social Links:</label>
                    <div class="field-value">${socialLinksHtml}</div>
                </div>
                ` : ''}

                <div class="field">
                    <label>Submitter:</label>
                    <div class="field-value">
                        <strong>${submission.submitterName}</strong><br>
                        <a href="mailto:${submission.submitterEmail}">${submission.submitterEmail}</a>
                    </div>
                </div>

                ${submission.profileImageWebp || submission.profileImageAvif ? `
                <div class="field">
                    <label>📷 Business Profile Images:</label>
                    <div class="field-value">
                        ${submission.profileImageWebp ? `
                            <div style="margin-bottom: 8px;">
                                <strong>WebP:</strong>
                                <a href="${EMAIL_CONFIG.baseUrl}/uploads/${submission.profileImageWebp}"
                                   target="_blank"
                                   style="color: #007bff; text-decoration: none;">
                                    📸 View WebP Image
                                </a>
                            </div>
                        ` : ''}
                        ${submission.profileImageAvif ? `
                            <div style="margin-bottom: 8px;">
                                <strong>AVIF:</strong>
                                <a href="${EMAIL_CONFIG.baseUrl}/uploads/${submission.profileImageAvif}"
                                   target="_blank"
                                   style="color: #007bff; text-decoration: none;">
                                    📸 View AVIF Image
                                </a>
                            </div>
                        ` : ''}
                        <div style="font-size: 12px; color: #6c757d; margin-top: 8px;">
                            Original: ${submission.originalImage || 'Unknown'}
                            ${submission.imageProcessedAt ? ` | Processed: ${new Date(submission.imageProcessedAt).toLocaleString()}` : ''}
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="copy-section">
                    <div class="copy-title">📋 Quick Copy for Admin Panel</div>
                    <div class="copy-content">Business Name: ${submission.businessName}
Categories: ${submission.categories.join(', ')}
Business Type: ${submission.businessType}
City: ${submission.cities[0]}${submission.cities.length > 1 ? ` (+ ${submission.cities.length - 1} more)` : ''}
Mobile: ${submission.mobile}
Description: ${submission.shortDescription || ''}${submission.socialLinks?.facebook ? `
Facebook: ${submission.socialLinks.facebook}` : ''}${submission.socialLinks?.instagram ? `
Instagram: ${submission.socialLinks.instagram}` : ''}${submission.socialLinks?.tiktok ? `
TikTok: ${submission.socialLinks.tiktok}` : ''}${submission.socialLinks?.youtube ? `
YouTube: ${submission.socialLinks.youtube}` : ''}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * HTML Email Template for Business Submission Confirmation (User)
 */
const createSubmissionConfirmationTemplate = (submission) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Submission Received - TELO Directory</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { font-size: 28px; margin: 0 0 10px 0; font-weight: 600; }
            .content { padding: 40px 30px; }
            .submission-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .next-steps { background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8; }
            .next-steps h3 { margin: 0 0 15px 0; color: #0c5460; }
            .next-steps ol { margin: 10px 0; padding-left: 20px; }
            .next-steps li { margin-bottom: 8px; color: #0c5460; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
            @media (max-width: 600px) {
                .container { margin: 10px; border-radius: 8px; }
                .header, .content { padding: 30px 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Submission Received!</h1>
                <p>Thank you, ${submission.submitterName}</p>
            </div>

            <div class="content">
                <p>Your business listing submission has been successfully received and is now under review by our team.</p>

                <div class="submission-details">
                    <h3>📋 Submission Details</h3>
                    <p><strong>Submission ID:</strong> ${submission.submissionId}</p>
                    <p><strong>Business Name:</strong> ${submission.businessName}</p>
                    <p><strong>Categories:</strong> ${submission.categories.join(', ')}</p>
                    <p><strong>Cities:</strong> ${submission.cities.join(', ')}</p>
                    <p><strong>Status:</strong> <span style="color: #ffc107; font-weight: bold;">Pending Review</span></p>
                </div>

                <div class="next-steps">
                    <h3>🔄 What happens next?</h3>
                    <ol>
                        <li>Our team will review your submission within <strong>2-3 business days</strong></li>
                        <li>We may contact you if additional information is needed</li>
                        <li>Once approved, your business will appear in our directory</li>
                        <li>You'll receive a confirmation email when your listing goes live</li>
                    </ol>
                </div>

                <p><strong>Important:</strong> Please save this email for your records. Your submission ID is <code>${submission.submissionId}</code>.</p>

                <p>If you have any questions about your submission, please reply to this email and include your submission ID.</p>
            </div>

            <div class="footer">
                <p><strong>TELO Directory Team</strong></p>
                <p>Connecting businesses across Georgia 🇬🇪</p>
                <p style="margin-top: 15px; font-size: 12px;">
                    This is an automated confirmation. Please do not reply unless you have questions.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Send business submission notification to admin
 */
const sendBusinessSubmissionNotification = async (submission, ipAddress = null) => {
    console.log(`📧 Sending business submission notification for: ${submission.submissionId}`);

    // Admin notification email
    const adminMailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
        to: EMAIL_CONFIG.fromAddress, // Send to admin email
        subject: `🎯 New Business Submission - ${submission.businessName} (${submission.submissionId})`,
        html: createBusinessSubmissionEmailTemplate(submission),
        // Text fallback
        text: `
New Business Submission Received

Submission ID: ${submission.submissionId}
Business Name: ${submission.businessName}
Categories: ${submission.categories.join(', ')}
Business Type: ${submission.businessType}
Cities: ${submission.cities.join(', ')}
Mobile: ${submission.mobile}
${submission.shortDescription ? `Description: ${submission.shortDescription}` : ''}
Certificate: ${submission.hasCertificate ? 'YES' : 'NO'}${submission.certificateDescription ? ` (${submission.certificateDescription})` : ''}

Submitter: ${submission.submitterName} (${submission.submitterEmail})
Submitted: ${new Date(submission.submittedAt).toLocaleString()}

Review at: ${EMAIL_CONFIG.baseUrl}/admin/submissions
        `.trim(),
    };

    try {
        const result = await sendEmailWithRetry(adminMailOptions);
        console.log(`✅ Admin notification sent successfully for submission: ${submission.submissionId}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to send admin notification for submission ${submission.submissionId}:`, error);
        throw error;
    }
};

/**
 * Send submission confirmation to user
 */
const sendSubmissionConfirmation = async (submission) => {
    console.log(`📧 Sending submission confirmation to: ${submission.submitterEmail}`);

    const userMailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
        to: submission.submitterEmail,
        subject: `✅ Business Submission Received - ${submission.businessName}`,
        html: createSubmissionConfirmationTemplate(submission),
        // Text fallback
        text: `
Hello ${submission.submitterName},

Your business listing submission has been received!

Submission Details:
- Submission ID: ${submission.submissionId}
- Business Name: ${submission.businessName}
- Categories: ${submission.categories.join(', ')}
- Cities: ${submission.cities.join(', ')}
- Status: Pending Review

What happens next:
1. Our team will review your submission within 2-3 business days
2. We may contact you if additional information is needed
3. Once approved, your business will appear in our directory
4. You'll receive a confirmation email when your listing goes live

Please save this email for your records.

If you have questions, reply to this email and include your submission ID: ${submission.submissionId}

Best regards,
TELO Directory Team
        `.trim(),
    };

    try {
        const result = await sendEmailWithRetry(userMailOptions);
        console.log(`✅ Confirmation sent successfully to: ${submission.submitterEmail}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to send confirmation to ${submission.submitterEmail}:`, error);
        throw error;
    }
};

// Export all functions
module.exports = {
    sendVerificationEmail,
    sendEmailChangeVerification,
    sendEmailChangeCode,
    sendPasswordResetEmail,
    sendBusinessSubmissionNotification,
    sendSubmissionConfirmation,
    generateVerificationToken,
    getTokenExpiration,
    isValidEmail,
    checkRateLimit,
    // Export for testing
    createVerificationEmailTemplate,
    createPasswordResetEmailTemplate,
    createBusinessSubmissionEmailTemplate,
    createSubmissionConfirmationTemplate,
    EMAIL_CONFIG,
};
