// client/src/components/common/Header.js - Enhanced navigation
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserAuth } from "../../contexts/UserAuthContext"; // ✅ NEW: Only addition needed
import LoginModal from "../modals/LoginModal";
import "../../styles/components.css";

const Header = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // ✅ NEW: Add user dropdown state (only addition)
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    // ✅ NEW: Get authentication state (only addition)
    const { isAuthenticated, user, logout, isLoading } = useUserAuth();

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        setIsUserDropdownOpen(false); // ✅ NEW: Also close user dropdown (safe addition)
    };

    const openLoginModal = (e) => {
        e.preventDefault();
        setIsLoginModalOpen(true);
        closeMenu();
    };

    const closeLoginModal = () => {
        setIsLoginModalOpen(false);
    };

    // Function to navigate home and reset search
    const handleHomeNavigation = (e) => {
        e.preventDefault();
        // Navigate to home with state to trigger reset
        navigate("/", { state: { resetSearch: true }, replace: true });
    };

    // ✅ NEW: Additional functions (only additions, no changes to existing)
    const toggleUserDropdown = (e) => {
        e.preventDefault();
        setIsUserDropdownOpen(!isUserDropdownOpen);
    };

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await logout();
            setIsUserDropdownOpen(false);
            closeMenu();
        } catch (error) {
            console.error("Logout failed:", error);
            setIsUserDropdownOpen(false);
            closeMenu();
        }
    };

    const getUserDisplayName = () => {
        if (!user) return "";
        return user.name || user.email?.split("@")[0] || "User";
    };

    const getUserInitials = () => {
        if (!user) return "?";
        const name = user.name || user.email || "User";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <header className="header">
            <div className="container">
                <Link to="/" className="logo" onClick={handleHomeNavigation}>
                    <h1>TΣLO</h1>
                </Link>

                <div className="nav-wrapper">
                    {/* Home always visible on mobile */}
                    <Link
                        to="/"
                        className="nav-link home-link"
                        onClick={handleHomeNavigation}
                    >
                        Home
                    </Link>

                    {/* Burger menu button */}
                    <button
                        className={`burger-menu ${isMenuOpen ? "open" : ""}`}
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    {/* Navigation menu */}
                    <nav className={`nav ${isMenuOpen ? "nav-open" : ""}`}>
                        <Link
                            to="/about"
                            className="nav-link"
                            onClick={closeMenu}
                        >
                            About TΣLO
                        </Link>
                        <Link
                            to="/contact"
                            className="nav-link"
                            onClick={closeMenu}
                        >
                            Contact
                        </Link>
                        <Link
                            to="/send-listing"
                            className="nav-link"
                            onClick={closeMenu}
                        >
                            Send Listing
                        </Link>

                        {/* ✅ ENHANCED: Smart Login/User Area (replaces single login link) */}
                        {isLoading ? (
                            <div
                                className="nav-link"
                                style={{ color: "#666", fontStyle: "italic" }}
                            >
                                Loading...
                            </div>
                        ) : isAuthenticated ? (
                            <div className="user-auth-area">
                                <button
                                    className="user-profile-btn"
                                    onClick={toggleUserDropdown}
                                    aria-label="User menu"
                                >
                                    <div className="user-avatar">
                                        {getUserInitials()}
                                    </div>
                                    <span className="user-name">
                                        {getUserDisplayName()}
                                    </span>
                                    <span
                                        className={`dropdown-arrow ${
                                            isUserDropdownOpen ? "open" : ""
                                        }`}
                                    >
                                        ▼
                                    </span>
                                </button>

                                {isUserDropdownOpen && (
                                    <div className="user-dropdown">
                                        <Link
                                            to="/dashboard"
                                            className="dropdown-link"
                                            onClick={closeMenu}
                                        >
                                            <span className="dropdown-icon">
                                                💻
                                            </span>
                                            Dashboard
                                            {user?.favoritesCount > 0 && (
                                                <span className="favorites-count">
                                                    {user.favoritesCount}
                                                </span>
                                            )}
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="dropdown-link"
                                            onClick={closeMenu}
                                        >
                                            <span className="dropdown-icon">
                                                👤
                                            </span>
                                            Settings
                                        </Link>

                                        <div className="dropdown-divider"></div>
                                        <button
                                            className="dropdown-link logout-btn"
                                            onClick={handleLogout}
                                        >
                                            <span className="dropdown-icon">
                                                🚪
                                            </span>
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="nav-link"
                                onClick={openLoginModal}
                            >
                                LogIn
                            </Link>
                        )}

                        <Link
                            to="/admin"
                            className="nav-link"
                            onClick={closeMenu}
                        >
                            Admin
                        </Link>
                    </nav>
                </div>
            </div>

            <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
        </header>
    );
};

export default Header;
