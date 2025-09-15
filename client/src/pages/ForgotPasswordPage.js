// client/src/pages/ForgotPasswordPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import userAuthService from "../services/userAuthService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import "../styles/password-reset.css";

/**
 * ForgotPasswordPage Component
 * 
 * Phase 4B: Email input page for password reset
 * - Clean, user-friendly interface for email entry
 * - Handles rate limiting and error feedback
 * - Success state with clear next steps
 * - Follows existing design patterns from VerifyEmailPage
 */
const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    
    // Component state
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (error) setError(""); // Clear error when user types
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setError("Please enter your email address");
            return;
        }

        if (!userAuthService.isValidEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await userAuthService.requestPasswordReset(email.trim());
            
            setSubmitted(true);
            setError("");

        } catch (err) {
            console.error("Password reset request error:", err);
            
            if (err.code === "RATE_LIMIT_EXCEEDED") {
                const waitTime = Math.ceil(err.retryAfter / 60); // Convert to minutes
                setError(`Too many requests. Please wait ${waitTime} minutes before trying again.`);
            } else {
                setError(err.message || "Failed to send password reset email. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate("/");
        // Trigger login modal if needed - this will depend on your Header component implementation
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent("open-login-modal"));
        }, 100);
    };

    const handleTryAgain = () => {
        setSuccess(false);
        setSubmitted(false);
        setEmail("");
        setError("");
    };

    return (
        <div className="password-reset-page">
            <div className="password-reset-container">
                <div className="password-reset-header">
                    <div className="password-reset-icon">
                        🔐
                    </div>
                    <h1>Reset Your Password</h1>
                    {!submitted ? (
                        <p className="password-reset-subtitle">
                            Enter your email address and we'll send you instructions to reset your password.
                        </p>
                    ) : (
                        <p className="password-reset-subtitle">
                            Check your email for reset instructions.
                        </p>
                    )}
                </div>

                <div className="password-reset-content">
                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="password-reset-form">
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your email address"
                                    className={`form-input ${error ? 'form-input-error' : ''}`}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="password-reset-button"
                                disabled={loading || !email.trim()}
                            >
                                {loading ? (
                                    <>
                                        <LoadingSpinner size="small" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📧 Send Reset Instructions</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="password-reset-success">
                            <div className="success-icon">
                                ✅
                            </div>
                            <div className="success-content">
                                <h3>Instructions Sent!</h3>
                                <p>
                                    We've sent password reset instructions to <strong>{email}</strong>.
                                </p>
                                <div className="success-details">
                                    <p>What to do next:</p>
                                    <ul>
                                        <li>Check your email inbox (and spam folder)</li>
                                        <li>Click the reset link in the email</li>
                                        <li>The link expires in 30 minutes for security</li>
                                        <li>Create your new password</li>
                                    </ul>
                                </div>
                                
                                <div className="success-actions">
                                    <button
                                        onClick={handleTryAgain}
                                        className="try-again-button"
                                    >
                                        Use Different Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="password-reset-footer">
                    <div className="footer-links">
                        <button
                            onClick={handleBackToLogin}
                            className="back-to-login-link"
                        >
                            ← Back to Login
                        </button>
                        
                        <div className="footer-help">
                            <p>Need help? <Link to="/contact">Contact Support</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;