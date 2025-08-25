// client/src/components/modals/LoginModal.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW: Added useNavigate import
import { useUserAuth } from "../../contexts/UserAuthContext";
import "./../../styles/loginModal.css";

const LoginModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate(); // NEW: For post-login navigation
    const [activeTab, setActiveTab] = useState("login");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
        phone: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(true);

    const { login, register } = useUserAuth();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // ✅ ENHANCEMENT: Clear error when user starts typing (was just setError(""))
        if (error) setError("");
    };

    const handleRememberMeChange = (e) => {
        setRememberMe(e.target.checked);
    };

    // NEW: Handle post-login navigation with return URL support
    const handleLoginSuccess = () => {
        // Check if there's a return URL stored from ProtectedRoute
        const returnUrl = sessionStorage.getItem("returnUrl");

        if (returnUrl) {
            // Clear the stored return URL
            sessionStorage.removeItem("returnUrl");
            // Navigate to the original destination
            navigate(returnUrl);
        } else {
            // Default behavior: go to dashboard or stay on current page
            navigate("/dashboard");
        }

        // Close the modal
        onClose();
    };

    // ✅ ENHANCEMENT: Only the error handling part is enhanced
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            if (activeTab === "login") {
                if (!formData.email || !formData.password) {
                    throw new Error("Please fill in all fields");
                }

                await login(
                    {
                        email: formData.email,
                        password: formData.password,
                    },
                    rememberMe
                );

                // NEW: Handle post-login navigation instead of just handleClose()
                handleLoginSuccess();
            } else {
                if (
                    !formData.name ||
                    !formData.email ||
                    !formData.password ||
                    !formData.confirmPassword
                ) {
                    throw new Error("Please fill in all fields");
                }
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Passwords don't match");
                }

                await register({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone || undefined,
                });

                // NEW: Handle post-registration navigation instead of just handleClose()
                handleLoginSuccess();
            }
        } catch (err) {
            console.error("Authentication error:", err);

            // ✅ ENHANCEMENT: Better error handling with specific messages (ONLY THIS PART CHANGED)
            let errorMessage = "";

            // Handle specific error codes from backend
            if (err.code === "INVALID_CREDENTIALS") {
                errorMessage =
                    "❌ Invalid email or password. Please check your credentials and try again.";
            } else if (err.code === "EMAIL_ALREADY_EXISTS") {
                errorMessage =
                    "📧 An account with this email already exists. Please try logging in instead.";
            } else if (err.code === "ACCOUNT_LOCKED") {
                errorMessage =
                    "🔒 Account temporarily locked due to too many failed attempts. Please try again later.";
            } else if (
                err.code === "VALIDATION_ERROR" &&
                err.details &&
                Array.isArray(err.details)
            ) {
                errorMessage = `⚠️ ${err.details.join(", ")}`;
            } else if (err.details && Array.isArray(err.details)) {
                // Fallback for validation errors with details array
                errorMessage = err.details.join(", ");
            } else if (err.message) {
                // Simple error message
                errorMessage = err.message;
            } else {
                // Final fallback
                errorMessage =
                    activeTab === "login"
                        ? "Login failed. Please try again."
                        : "Registration failed. Please try again.";
            }

            setError(errorMessage);
            setIsSubmitting(false);
        }
    };

    const handleSocialLogin = (provider) => {
        console.log(`${provider} login clicked`);
        setError(`${provider} login coming soon!`);
    };

    const handleClose = () => {
        setFormData({
            email: "",
            password: "",
            confirmPassword: "",
            name: "",
            phone: "",
        });
        setActiveTab("login");
        setError("");
        setIsSubmitting(false);
        setRememberMe(true);
        onClose();
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setError("");
        setFormData({
            email: "",
            password: "",
            confirmPassword: "",
            name: "",
            phone: "",
        });
    };

    if (!isOpen) return null;

    return (
        <div className="login-modal-overlay" onClick={handleClose}>
            <div
                className="login-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="login-modal-header">
                    <div className="login-modal-title">
                        <h2>Welcome to TΣLO</h2>
                        <p className="login-subtitle">
                            {activeTab === "login"
                                ? "Sign in to your account"
                                : "Create your new account"}
                        </p>
                    </div>
                    <button
                        className="login-modal-close"
                        onClick={handleClose}
                        type="button"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <div className="login-tabs">
                    <button
                        className={`login-tab ${
                            activeTab === "login" ? "active" : ""
                        }`}
                        onClick={() => switchTab("login")}
                    >
                        Log In
                    </button>
                    <button
                        className={`login-tab ${
                            activeTab === "register" ? "active" : ""
                        }`}
                        onClick={() => switchTab("register")}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="login-modal-body">
                    {/* Your existing social login section - NO CHANGES */}
                    <div className="social-login-section">
                        <button
                            type="button"
                            className="social-login-btn google"
                            onClick={() => handleSocialLogin("Google")}
                        >
                            <div className="social-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path
                                        fill="#4285f4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34a853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            </div>
                            Continue with Google
                        </button>

                        <button
                            type="button"
                            className="social-login-btn facebook"
                            onClick={() => handleSocialLogin("Facebook")}
                        >
                            <div className="social-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path
                                        fill="#1877f2"
                                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                                    />
                                </svg>
                            </div>
                            Continue with Facebook
                        </button>

                        <button
                            type="button"
                            className="social-login-btn phone"
                            onClick={() => handleSocialLogin("Phone")}
                        >
                            <div className="social-icon">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path
                                        fill="#10B981"
                                        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                                    />
                                </svg>
                            </div>
                            Continue with Phone
                        </button>
                    </div>

                    <div className="login-divider">
                        <span>or</span>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {activeTab === "register" && (
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        {activeTab === "register" && (
                            <div className="form-group">
                                <label htmlFor="phone">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {activeTab === "register" && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm your password"
                                    required
                                />
                            </div>
                        )}

                        {activeTab === "login" && (
                            <div className="form-group remember-me-group">
                                <label className="remember-me-label">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={handleRememberMeChange}
                                        className="remember-me-checkbox"
                                    />
                                    <span className="remember-me-text">
                                        Remember Me!
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* ✅ ENHANCEMENT: Enhanced error display with better formatting */}
                        {error && (
                            <div className="login-error enhanced-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? activeTab === "login"
                                    ? "Signing in..."
                                    : "Creating account..."
                                : activeTab === "login"
                                ? "Sign In"
                                : "Create Account"}
                        </button>
                    </form>

                    {activeTab === "login" && (
                        <div className="login-footer-links">
                            <button
                                type="button"
                                className="forgot-password-link"
                                onClick={() =>
                                    setError("Password reset coming soon!")
                                }
                            >
                                Forgot your password?
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
