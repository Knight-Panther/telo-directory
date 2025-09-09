// client/src/pages/SettingsPage.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUserAuth } from "../contexts/UserAuthContext";
import userAuthService from "../services/userAuthService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmailChangeModal from "../components/modals/EmailChangeModal";
import "../styles/settings.css"; // UPDATED: Using dedicated settings.css file

/**
 * SettingsPage Component - Safe Implementation
 *
 * Modern, single-page settings layout for user account management.
 * Features:
 * - Profile information editing (name, email, phone)
 * - Password change functionality
 * - Email verification status display
 * - Account deletion with confirmation
 * - Mobile-first responsive design
 * - Real-time form validation
 * - Success/error toast notifications
 *
 * SAFETY: All CSS classes prefixed with 'user-settings-' to avoid conflicts
 */
const SettingsPage = () => {
    const { user, updateProfile, isLoading } = useUserAuth();

    // Form states for different sections
    const [profileForm, setProfileForm] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // UI state management
    const [activeSection, setActiveSection] = useState("profile");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [notification, setNotification] = useState(null);
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Form validation states
    const [profileErrors, setProfileErrors] = useState({});
    const [passwordErrors, setPasswordErrors] = useState({});

    // Auto-scroll to top on page load
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
    }, []);

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
            });
        }
    }, [user]);

    // Auto-hide notifications after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    /**
     * Profile form validation
     */
    const validateProfileForm = () => {
        const errors = {};

        if (!profileForm.name.trim()) {
            errors.name = "Name is required";
        } else if (profileForm.name.trim().length < 2) {
            errors.name = "Name must be at least 2 characters";
        }

        if (!profileForm.email.trim()) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
            errors.email = "Please enter a valid email address";
        }

        if (
            profileForm.phone &&
            !/^[+]?[\d\s\-()]{10,}$/.test(profileForm.phone)
        ) {
            errors.phone = "Please enter a valid phone number";
        }

        setProfileErrors(errors);
        return Object.keys(errors).length === 0;
    };

    /**
     * Password form validation
     */
    const validatePasswordForm = () => {
        const errors = {};

        if (!passwordForm.currentPassword) {
            errors.currentPassword = "Current password is required";
        }

        if (!passwordForm.newPassword) {
            errors.newPassword = "New password is required";
        } else if (passwordForm.newPassword.length < 8) {
            errors.newPassword = "Password must be at least 8 characters";
        } else if (
            !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)
        ) {
            errors.newPassword =
                "Password must contain uppercase, lowercase and number";
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        if (passwordForm.currentPassword === passwordForm.newPassword) {
            errors.newPassword =
                "New password must be different from current password";
        }

        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    /**
     * Handle email change completion from modal
     */
    const handleEmailChange = (newEmail) => {
        setProfileForm(prev => ({ ...prev, email: newEmail }));
        showNotification("Email address changed successfully!");
        // Update user context with new email
        updateProfile({ email: newEmail });
    };

    /**
     * Show notification helper
     */
    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
    };

    /**
     * Handle profile form submission
     */
    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        if (!validateProfileForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Update name and phone only (email changes through modal)
            await updateProfile({
                name: profileForm.name.trim(),
                phone: profileForm.phone.trim() || undefined,
            });

            showNotification("Profile updated successfully!");
            setProfileErrors({});
        } catch (error) {
            showNotification(
                error.message || "Failed to update profile",
                "error"
            );

            // Handle specific validation errors from backend
            if (error.details) {
                const backendErrors = {};
                error.details.forEach((detail) => {
                    if (detail.includes("name")) backendErrors.name = detail;
                    if (detail.includes("phone")) backendErrors.phone = detail;
                });
                setProfileErrors(backendErrors);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle password change submission
     */
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!validatePasswordForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await userAuthService.changePassword(passwordForm);

            alert("✅ Password Changed Successfully!\n\nYour password has been updated and is now active.");
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setPasswordErrors({});
        } catch (error) {
            alert("❌ Password Change Failed\n\n" + (error.message || "Failed to change password"));

            // Handle specific field errors from backend
            if (error.field) {
                setPasswordErrors(prev => ({
                    ...prev,
                    [error.field]: error.message
                }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle account deletion scheduling
     */
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            showNotification("Please type 'DELETE' to confirm", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await userAuthService.deleteAccount(deleteConfirmText);
            
            // Clear confirmation modal first
            setShowDeleteConfirm(false);
            setDeleteConfirmText("");
            
            if (result.scheduledDeletion) {
                // Show comprehensive deletion scheduling confirmation modal
                const delayDays = result.delayDays || 5;
                const scheduledDate = new Date(result.scheduledFor).toLocaleDateString();
                
                const confirmed = window.confirm(
                    `✅ Account Deletion Scheduled\n\n` +
                    `Your account has been scheduled for deletion in ${delayDays} days (${scheduledDate}).\n\n` +
                    `Important:\n` +
                    `• You will be logged out immediately\n` +
                    `• You can CANCEL this deletion by logging in again before ${scheduledDate}\n` +
                    `• After ${scheduledDate}, your account will be permanently deleted\n\n` +
                    `Click OK to proceed with logout, or Cancel to stay logged in.`
                );
                
                if (confirmed) {
                    // Show success notification briefly before logout
                    showNotification("Account deletion scheduled. You will be logged out.", "success");
                    
                    // Logout after short delay to let user see the message
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 1500);
                }
            } else {
                // Handle already scheduled deletion
                if (result.alreadyScheduled) {
                    showNotification(result.message, "info");
                } else {
                    showNotification(result.message, "success");
                    // Redirect to home page after a brief delay
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 2000);
                }
            }
            
        } catch (error) {
            console.error("Account deletion error:", error);
            showNotification(
                error.message || "Failed to delete account",
                "error"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle input changes with real-time validation
     */
    const handleProfileChange = (field, value) => {
        setProfileForm((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Clear specific field error when user starts typing
        if (profileErrors[field]) {
            setProfileErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    const handlePasswordChange = (field, value) => {
        setPasswordForm((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Clear specific field error when user starts typing
        if (passwordErrors[field]) {
            setPasswordErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    if (isLoading) {
        return (
            <div className="user-settings-page">
                <div className="container">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-settings-page">
                <div className="container">
                    <div className="user-settings-error">
                        <h2>Access Denied</h2>
                        <p>
                            Please <Link to="/">return to home</Link> and log
                            in.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-settings-page">
            <div className="container">
                {/* Header */}
                <div className="user-settings-header">
                    <h1>Account Settings</h1>
                    <p>Manage your account information and preferences</p>
                </div>

                {/* Notification Toast */}
                {notification && (
                    <div
                        className={`user-settings-notification ${notification.type}`}
                    >
                        <span>{notification.message}</span>
                        <button
                            onClick={() => setNotification(null)}
                            className="user-settings-notification-close"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Settings Content */}
                <div className="user-settings-content">
                    {/* Navigation Tabs */}
                    <nav className="user-settings-nav">
                        <button
                            className={`user-settings-nav-btn ${
                                activeSection === "profile" ? "active" : ""
                            }`}
                            onClick={() => setActiveSection("profile")}
                        >
                            <span className="user-settings-nav-icon">👤</span>
                            Profile
                        </button>
                        <button
                            className={`user-settings-nav-btn ${
                                activeSection === "security" ? "active" : ""
                            }`}
                            onClick={() => setActiveSection("security")}
                        >
                            <span className="user-settings-nav-icon">🔒</span>
                            Security
                        </button>
                        <button
                            className={`user-settings-nav-btn ${
                                activeSection === "account" ? "active" : ""
                            }`}
                            onClick={() => setActiveSection("account")}
                        >
                            <span className="user-settings-nav-icon">⚙️</span>
                            Account
                        </button>
                    </nav>

                    {/* Profile Section */}
                    {activeSection === "profile" && (
                        <div className="user-settings-section">
                            <div className="user-settings-section-header">
                                <h2>Profile Information</h2>
                                <p>Update your personal information</p>
                            </div>

                            <form
                                onSubmit={handleProfileSubmit}
                                className="user-settings-form"
                            >
                                <div className="user-settings-form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={profileForm.name}
                                        onChange={(e) =>
                                            handleProfileChange(
                                                "name",
                                                e.target.value
                                            )
                                        }
                                        className={
                                            profileErrors.name ? "error" : ""
                                        }
                                        placeholder="Enter your full name"
                                    />
                                    {profileErrors.name && (
                                        <span className="user-settings-error-message">
                                            {profileErrors.name}
                                        </span>
                                    )}
                                </div>

                                <div className="user-settings-form-group">
                                    <label>Email Address</label>
                                    <div className="user-settings-email-display">
                                        <span className="user-settings-email-value">{user?.email}</span>
                                        <button
                                            type="button"
                                            className="user-settings-change-email-btn"
                                            onClick={() => setShowEmailModal(true)}
                                        >
                                            Change
                                        </button>
                                    </div>
                                    <small className="user-settings-field-note">
                                        To change your email, we'll send a verification code to your current email for security.
                                    </small>
                                </div>

                                <div className="user-settings-form-group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        value={profileForm.phone}
                                        onChange={(e) =>
                                            handleProfileChange(
                                                "phone",
                                                e.target.value
                                            )
                                        }
                                        className={
                                            profileErrors.phone ? "error" : ""
                                        }
                                        placeholder="Enter your phone number (optional)"
                                    />
                                    {profileErrors.phone && (
                                        <span className="user-settings-error-message">
                                            {profileErrors.phone}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="user-settings-btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Updating..."
                                        : "Update Profile"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Security Section */}
                    {activeSection === "security" && (
                        <div className="user-settings-section">
                            <div className="user-settings-section-header">
                                <h2>Security Settings</h2>
                                <p>Manage your password and account security</p>
                            </div>

                            {/* Email Verification Status */}
                            <div className="user-settings-verification-status">
                                <h3>Email Verification</h3>
                                <div
                                    className={`user-settings-verification-badge ${
                                        user.isEmailVerified
                                            ? "verified"
                                            : "unverified"
                                    }`}
                                >
                                    <span className="user-settings-verification-icon">
                                        {user.isEmailVerified ? "✅" : "⚠️"}
                                    </span>
                                    <span className="user-settings-verification-text">
                                        {user.isEmailVerified
                                            ? "Email Verified"
                                            : "Email Not Verified"}
                                    </span>
                                </div>
                                {!user.isEmailVerified && (
                                    <button className="user-settings-btn-secondary">
                                        Resend Verification Email
                                    </button>
                                )}
                            </div>

                            {/* Password Change Form */}
                            <form
                                onSubmit={handlePasswordSubmit}
                                className="user-settings-form"
                            >
                                <h3>Change Password</h3>

                                <div className="user-settings-form-group">
                                    <label htmlFor="currentPassword">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        id="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) =>
                                            handlePasswordChange(
                                                "currentPassword",
                                                e.target.value
                                            )
                                        }
                                        className={
                                            passwordErrors.currentPassword
                                                ? "error"
                                                : ""
                                        }
                                        placeholder="Enter current password"
                                    />
                                    {passwordErrors.currentPassword && (
                                        <span className="user-settings-error-message">
                                            {passwordErrors.currentPassword}
                                        </span>
                                    )}
                                </div>

                                <div className="user-settings-form-group">
                                    <label htmlFor="newPassword">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={(e) =>
                                            handlePasswordChange(
                                                "newPassword",
                                                e.target.value
                                            )
                                        }
                                        className={
                                            passwordErrors.newPassword
                                                ? "error"
                                                : ""
                                        }
                                        placeholder="Enter new password"
                                    />
                                    {passwordErrors.newPassword && (
                                        <span className="user-settings-error-message">
                                            {passwordErrors.newPassword}
                                        </span>
                                    )}
                                    <small className="user-settings-field-note">
                                        Must be 8+ characters with uppercase,
                                        lowercase, and number
                                    </small>
                                </div>

                                <div className="user-settings-form-group">
                                    <label htmlFor="confirmPassword">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) =>
                                            handlePasswordChange(
                                                "confirmPassword",
                                                e.target.value
                                            )
                                        }
                                        className={
                                            passwordErrors.confirmPassword
                                                ? "error"
                                                : ""
                                        }
                                        placeholder="Confirm new password"
                                    />
                                    {passwordErrors.confirmPassword && (
                                        <span className="user-settings-error-message">
                                            {passwordErrors.confirmPassword}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="user-settings-btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Changing..."
                                        : "Change Password"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Account Section */}
                    {activeSection === "account" && (
                        <div className="user-settings-section">
                            <div className="user-settings-section-header">
                                <h2>Account Management</h2>
                                <p>Manage your account status and data</p>
                            </div>

                            {/* Account Information */}
                            <div className="user-settings-account-info">
                                <h3>Account Details</h3>
                                <div className="user-settings-info-grid">
                                    <div className="user-settings-info-item">
                                        <label>Member Since</label>
                                        <span>
                                            {new Date(
                                                user.createdAt
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="user-settings-info-item">
                                        <label>Last Login</label>
                                        <span>
                                            {user.lastLoginAt
                                                ? new Date(
                                                      user.lastLoginAt
                                                  ).toLocaleDateString()
                                                : "Not available"}
                                        </span>
                                    </div>
                                    <div className="user-settings-info-item">
                                        <label>Account Status</label>
                                        <span className="user-settings-status-active">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Account Deletion */}
                            <div className="user-settings-danger-zone">
                                <h3>Danger Zone</h3>
                                <p>
                                    Once you delete your account, there is no
                                    going back. Please be certain.
                                </p>

                                {!showDeleteConfirm ? (
                                    <button
                                        className="user-settings-btn-danger"
                                        onClick={() =>
                                            setShowDeleteConfirm(true)
                                        }
                                    >
                                        Delete Account
                                    </button>
                                ) : (
                                    <div className="user-settings-delete-confirmation">
                                        <p>
                                            Are you sure? This action cannot be
                                            undone.
                                        </p>
                                        <p>
                                            Type <strong>DELETE</strong> to
                                            confirm:
                                        </p>
                                        <input
                                            type="text"
                                            value={deleteConfirmText}
                                            onChange={(e) =>
                                                setDeleteConfirmText(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Type DELETE here"
                                            className="user-settings-delete-confirm-input"
                                        />
                                        <div className="user-settings-delete-actions">
                                            <button
                                                className="user-settings-btn-secondary"
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setDeleteConfirmText("");
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="user-settings-btn-danger"
                                                onClick={handleDeleteAccount}
                                                disabled={
                                                    isSubmitting ||
                                                    deleteConfirmText !==
                                                        "DELETE"
                                                }
                                            >
                                                {isSubmitting
                                                    ? "Deleting..."
                                                    : "Delete Account"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Change Modal */}
            <EmailChangeModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onEmailChange={handleEmailChange}
                currentEmail={user?.email}
            />
        </div>
    );
};

export default SettingsPage;
