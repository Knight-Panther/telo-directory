// client/src/pages/VerifyEmailPage.js
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useUserAuth } from "../contexts/UserAuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import emailVerificationService from "../services/emailVerificationService";
import "../styles/verify-email.css";

/**
 * VerifyEmailPage Component
 *
 * Handles two main scenarios:
 * 1. /verify-email - Shows "check your email" message with resend option
 * 2. /verify-email/confirm/:token - Processes email verification from link
 *
 * Features:
 * - Auto-redirect when user becomes verified
 * - Resend functionality with rate limiting
 * - Error handling and user feedback
 * - Responsive design
 * - Toast notifications for better UX
 */
const VerifyEmailPage = () => {
    const navigate = useNavigate();
    const { token } = useParams(); // For /verify-email/confirm/:token route
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, isEmailVerified, handleEmailVerified } = useUserAuth();

    // Component state
    const [loading, setLoading] = useState(false);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [emailSent, setEmailSent] = useState(false);

    // Get email from URL params or user context
    const emailFromParams = searchParams.get("email");
    const userEmail = user?.email || emailFromParams;

    /**
     * Auto-redirect effect when user becomes verified
     * Polls every 2 seconds to check verification status
     */
    useEffect(() => {
        if (isAuthenticated && isEmailVerified()) {
            // User is verified, redirect to dashboard
            const returnUrl =
                sessionStorage.getItem("returnUrl") || "/dashboard";
            sessionStorage.removeItem("returnUrl");
            navigate(returnUrl, { replace: true });
            return;
        }

        // Set up polling interval to check verification status
        const interval = setInterval(() => {
            if (isAuthenticated && isEmailVerified()) {
                const returnUrl =
                    sessionStorage.getItem("returnUrl") || "/dashboard";
                sessionStorage.removeItem("returnUrl");
                navigate(returnUrl, { replace: true });
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isAuthenticated, isEmailVerified, navigate]);

    /**
     * Handle email verification from token (when user clicks email link)
     */
    useEffect(() => {
        if (token) {
            handleTokenVerification(token);
        }
    }, [token]);

    /**
     * Countdown effect for resend cooldown
     */
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    /**
     * Process email verification token from email link
     */
    const handleTokenVerification = async (verificationToken) => {
        setVerificationLoading(true);
        setError(null);

        try {
            // Use the email verification service instead of direct fetch
            const result = await emailVerificationService.verifyEmail(verificationToken);

            if (result.success) {
                // Update auth context with verified user and tokens
                handleEmailVerified(result.user, {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                });

                setSuccess(result.message);

                // Wait a moment for user to see success message, then redirect
                setTimeout(() => {
                    const returnUrl =
                        sessionStorage.getItem("returnUrl") || "/dashboard";
                    sessionStorage.removeItem("returnUrl");
                    navigate(returnUrl, { replace: true });
                }, 2000);
            } else {
                setError(result.message || "Email verification failed");
            }
        } catch (error) {
            console.error("Email verification error:", error);
            setError(error.message || "Network error. Please check your connection and try again.");
        } finally {
            setVerificationLoading(false);
        }
    };

    /**
     * Handle resend verification email
     */
    const handleResendEmail = async () => {
        if (!userEmail) {
            setError("Email address not found. Please try registering again.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await emailVerificationService.resendVerification(userEmail);
            
            setSuccess(result.message);
            setEmailSent(true);
            
            // Set cooldown period (60 seconds)
            setResendCooldown(60);
        } catch (error) {
            console.error("Resend email error:", error);
            
            if (error.rateLimited) {
                setError(error.message);
                setResendCooldown(error.remainingSeconds || 60);
            } else {
                setError(error.message || "Failed to resend verification email");
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle manual email input for resend
     */
    const handleEmailChange = (e) => {
        // This could be used if we want to allow users to change their email
        // For now, we'll keep it simple and use the registered email
    };

    /**
     * Format email for display (partially masked)
     */
    const formatEmailForDisplay = (email) => {
        if (!email) return "";
        const [local, domain] = email.split("@");
        if (local.length <= 3) return email;
        const maskedLocal =
            local.substring(0, 2) + "***" + local.substring(local.length - 1);
        return `${maskedLocal}@${domain}`;
    };

    // If this is a token verification route and we're processing
    if (token && verificationLoading) {
        return (
            <div className="verify-email-page">
                <div className="verify-email-container">
                    <div className="verify-email-card">
                        <div className="verify-email-icon processing">
                            <LoadingSpinner size="large" />
                        </div>
                        <h1>Verifying Your Email...</h1>
                        <p>Please wait while we verify your email address.</p>
                    </div>
                </div>
            </div>
        );
    }

    // If verification was successful
    if (success && token) {
        return (
            <div className="verify-email-page">
                <div className="verify-email-container">
                    <div className="verify-email-card success">
                        <div className="verify-email-icon success">✅</div>
                        <h1>Email Verified Successfully!</h1>
                        <p>{success}</p>
                        <p className="redirect-message">
                            Redirecting to your dashboard...
                        </p>
                        <LoadingSpinner size="small" />
                    </div>
                </div>
            </div>
        );
    }

    // Main verification page (waiting for email verification)
    return (
        <div className="verify-email-page">
            <div className="verify-email-container">
                <div className="verify-email-card">
                    {/* Header */}
                    <div className="verify-email-icon">📧</div>
                    <h1>Check Your Email</h1>
                    <p className="verify-email-subtitle">
                        We've sent a verification link to your email address
                    </p>

                    {/* Email display */}
                    {userEmail && (
                        <div className="email-display">
                            <strong>{formatEmailForDisplay(userEmail)}</strong>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="verification-instructions">
                        <h3>What to do next:</h3>
                        <ol>
                            <li>
                                Check your email inbox (and spam/junk folder)
                            </li>
                            <li>
                                Click the "Verify Email" button in the email
                            </li>
                            <li>
                                You'll be automatically logged in and redirected
                            </li>
                        </ol>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Success display */}
                    {success && !token && (
                        <div className="success-message">
                            <span className="success-icon">✅</span>
                            <p>{success}</p>
                        </div>
                    )}

                    {/* Resend section */}
                    <div className="resend-section">
                        <p className="resend-text">Didn't receive the email?</p>

                        <button
                            onClick={handleResendEmail}
                            disabled={loading || resendCooldown > 0}
                            className={`resend-button ${
                                loading ? "loading" : ""
                            } ${resendCooldown > 0 ? "disabled" : ""}`}
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    <span>Sending...</span>
                                </>
                            ) : resendCooldown > 0 ? (
                                `Resend in ${resendCooldown}s`
                            ) : (
                                "Resend Verification Email"
                            )}
                        </button>

                        {emailSent && (
                            <p className="email-sent-note">
                                ✅ Email sent! Please check your inbox.
                            </p>
                        )}
                    </div>

                    {/* Help section */}
                    <div className="help-section">
                        <p className="help-text">
                            Still having trouble?
                            <a href="/contact" className="help-link">
                                Contact Support
                            </a>
                        </p>

                        <div className="help-tips">
                            <h4>Not seeing the email?</h4>
                            <ul>
                                <li>Check your spam/junk folder</li>
                                <li>
                                    Make sure{" "}
                                    {userEmail
                                        ? formatEmailForDisplay(userEmail)
                                        : "your email"}{" "}
                                    is correct
                                </li>
                                <li>
                                    Wait a few minutes - emails can sometimes be
                                    delayed
                                </li>
                                <li>Try resending after 1 minute</li>
                            </ul>
                        </div>
                    </div>

                    {/* Back to home option */}
                    <div className="back-section">
                        <button
                            onClick={() => navigate("/")}
                            className="back-button"
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
