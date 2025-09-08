// client/src/pages/ResetPasswordPage.js
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import userAuthService from "../services/userAuthService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import "../styles/password-reset.css";

/**
 * ResetPasswordPage Component
 * 
 * Phase 4B: New password entry page
 * - Validates reset token from URL
 * - Password strength validation
 * - Success flow redirects to login with pre-filled email
 * - Handles expired/invalid tokens gracefully
 */
const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const { token } = useParams(); // Reset token from URL
    
    // Form state
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: ""
    });
    
    // Component state
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [validationErrors, setValidationErrors] = useState([]);
    const [tokenValid, setTokenValid] = useState(true);
    const [resetEmail, setResetEmail] = useState("");

    // Password strength indicators
    const [passwordStrength, setPasswordStrength] = useState({
        minLength: false,
        hasLowercase: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        match: false
    });

    // Check token validity on mount
    useEffect(() => {
        if (!token) {
            setTokenValid(false);
            setError("No reset token provided. Please request a new password reset.");
        }
    }, [token]);

    // Update password strength indicators
    useEffect(() => {
        const { newPassword, confirmPassword } = formData;
        
        setPasswordStrength({
            minLength: newPassword.length >= 8,
            hasLowercase: /[a-z]/.test(newPassword),
            hasUppercase: /[A-Z]/.test(newPassword),
            hasNumber: /\d/.test(newPassword),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
            match: newPassword === confirmPassword && newPassword.length > 0
        });
    }, [formData.newPassword, formData.confirmPassword]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear errors when user types
        if (error) setError("");
        if (validationErrors.length > 0) setValidationErrors([]);
    };

    const validateForm = () => {
        const errors = [];
        const { newPassword, confirmPassword } = formData;

        if (!newPassword) {
            errors.push("New password is required");
        } else {
            if (newPassword.length < 8) {
                errors.push("Password must be at least 8 characters long");
            }
            if (!/[a-z]/.test(newPassword)) {
                errors.push("Password must contain at least one lowercase letter");
            }
            if (!/[A-Z]/.test(newPassword)) {
                errors.push("Password must contain at least one uppercase letter");
            }
            if (!/\d/.test(newPassword)) {
                errors.push("Password must contain at least one number");
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
                errors.push("Password must contain at least one special character");
            }
        }

        if (!confirmPassword) {
            errors.push("Password confirmation is required");
        } else if (newPassword !== confirmPassword) {
            errors.push("Passwords do not match");
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const errors = validateForm();
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        setLoading(true);
        setError("");
        setValidationErrors([]);

        try {
            const result = await userAuthService.resetPassword(
                token,
                formData.newPassword,
                formData.confirmPassword
            );
            
            setSuccess(true);
            setResetEmail(result.email);
            setError("");

        } catch (err) {
            console.error("Password reset error:", err);
            
            if (err.expired || err.code === "INVALID_RESET_TOKEN" || err.code === "EXPIRED_RESET_TOKEN") {
                setTokenValid(false);
                setError(err.message || "This password reset link has expired or is invalid.");
            } else if (err.code === "VALIDATION_ERROR" && err.details) {
                setValidationErrors(err.details);
            } else {
                setError(err.message || "Failed to reset password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoToLogin = () => {
        navigate("/");
        // Store email for pre-filling login form
        if (resetEmail) {
            sessionStorage.setItem("loginEmail", resetEmail);
        }
        // Trigger login modal
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent("open-login-modal"));
        }, 100);
    };

    const handleRequestNewReset = () => {
        navigate("/forgot-password");
    };

    // Invalid token state
    if (!tokenValid) {
        return (
            <div className="password-reset-page">
                <div className="password-reset-container">
                    <div className="password-reset-header">
                        <div className="password-reset-icon error">
                            ⚠️
                        </div>
                        <h1>Reset Link Invalid</h1>
                        <p className="password-reset-subtitle">
                            This password reset link is invalid or has expired.
                        </p>
                    </div>

                    <div className="password-reset-content">
                        <div className="error-state">
                            <p>{error}</p>
                            <div className="error-actions">
                                <button
                                    onClick={handleRequestNewReset}
                                    className="password-reset-button"
                                >
                                    Request New Reset Link
                                </button>
                                <button
                                    onClick={handleGoToLogin}
                                    className="back-to-login-link"
                                >
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="password-reset-page">
                <div className="password-reset-container">
                    <div className="password-reset-header">
                        <div className="password-reset-icon success">
                            ✅
                        </div>
                        <h1>Password Reset Successfully!</h1>
                        <p className="password-reset-subtitle">
                            Your password has been updated. You can now sign in with your new password.
                        </p>
                    </div>

                    <div className="password-reset-content">
                        <div className="success-state">
                            <div className="success-actions">
                                <button
                                    onClick={handleGoToLogin}
                                    className="password-reset-button success"
                                >
                                    Sign In Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main form state
    return (
        <div className="password-reset-page">
            <div className="password-reset-container">
                <div className="password-reset-header">
                    <div className="password-reset-icon">
                        🔑
                    </div>
                    <h1>Create New Password</h1>
                    <p className="password-reset-subtitle">
                        Enter your new password below. Make sure it's strong and secure.
                    </p>
                </div>

                <div className="password-reset-content">
                    <form onSubmit={handleSubmit} className="password-reset-form">
                        <div className="form-group">
                            <label htmlFor="newPassword" className="form-label">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                placeholder="Enter your new password"
                                className="form-input"
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm your new password"
                                className="form-input"
                                disabled={loading}
                                required
                            />
                        </div>

                        {/* Password Strength Indicators */}
                        {formData.newPassword && (
                            <div className="password-strength">
                                <p className="strength-title">Password Requirements:</p>
                                <div className="strength-indicators">
                                    <div className={`strength-indicator ${passwordStrength.minLength ? 'valid' : 'invalid'}`}>
                                        {passwordStrength.minLength ? '✓' : '✗'} At least 8 characters
                                    </div>
                                    <div className={`strength-indicator ${passwordStrength.hasLowercase ? 'valid' : 'invalid'}`}>
                                        {passwordStrength.hasLowercase ? '✓' : '✗'} One lowercase letter
                                    </div>
                                    <div className={`strength-indicator ${passwordStrength.hasUppercase ? 'valid' : 'invalid'}`}>
                                        {passwordStrength.hasUppercase ? '✓' : '✗'} One uppercase letter
                                    </div>
                                    <div className={`strength-indicator ${passwordStrength.hasNumber ? 'valid' : 'invalid'}`}>
                                        {passwordStrength.hasNumber ? '✓' : '✗'} One number
                                    </div>
                                    <div className={`strength-indicator ${passwordStrength.hasSpecialChar ? 'valid' : 'invalid'}`}>
                                        {passwordStrength.hasSpecialChar ? '✓' : '✗'} One special character
                                    </div>
                                    {formData.confirmPassword && (
                                        <div className={`strength-indicator ${passwordStrength.match ? 'valid' : 'invalid'}`}>
                                            {passwordStrength.match ? '✓' : '✗'} Passwords match
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {(error || validationErrors.length > 0) && (
                            <div className="error-message">
                                {error && <p>{error}</p>}
                                {validationErrors.length > 0 && (
                                    <ul>
                                        {validationErrors.map((err, index) => (
                                            <li key={index}>{err}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="password-reset-button"
                            disabled={loading || !Object.values(passwordStrength).every(Boolean)}
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    <span>Updating Password...</span>
                                </>
                            ) : (
                                <>
                                    <span>🔐 Update Password</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="password-reset-footer">
                    <div className="footer-links">
                        <button
                            onClick={handleGoToLogin}
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

export default ResetPasswordPage;