// client/src/components/common/Header.js - Enhanced navigation
import React, { useState, useEffect, useRef, Suspense } from "react"; // UPDATED: Added useEffect and useRef imports
import { Link, useNavigate, useSearchParams } from "react-router-dom"; // UPDATED: Added useSearchParams import
import { useUserAuth } from "../../contexts/UserAuthContext";
import LoadingSpinner from "./LoadingSpinner";
import "../../styles/components-core.css";
import "../../styles/components-user.css";

// Lazy load the LoginModal
const LoginModal = React.lazy(() => import("../modals/LoginModal"));

const Header = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams(); // NEW: For URL parameter detection
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // ✅ NEW: Add user dropdown state (only addition)
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    // ✅ NEW: Get authentication state (only addition)
    const { isAuthenticated, user, logout, isLoading } = useUserAuth();

    // ✅ NEW: Refs for outside click detection
    const userDropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);

    // NEW: Auto-trigger login modal if redirected from protected route
    useEffect(() => {
        const shouldShowLogin = searchParams.get("showLogin");
        if (shouldShowLogin === "true") {
            setIsLoginModalOpen(true);
            // Clean up URL parameter after triggering modal
            setSearchParams((params) => {
                params.delete("showLogin");
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    // NEW: Listen for custom login modal events (for password reset flow)
    useEffect(() => {
        const handleOpenLoginModal = () => {
            setIsLoginModalOpen(true);
        };

        window.addEventListener("open-login-modal", handleOpenLoginModal);
        
        return () => {
            window.removeEventListener("open-login-modal", handleOpenLoginModal);
        };
    }, []);

    // ✅ NEW: Handle outside clicks to close dropdowns (optimized)
    useEffect(() => {
        // Early return if no dropdowns are open
        if (!isUserDropdownOpen && !isMenuOpen) {
            return;
        }

        const handleOutsideClick = (event) => {
            // Close user dropdown if clicked outside
            if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
            }
            
            // Close mobile menu if clicked outside
            if (isMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                // Only close if menu is open and click is not on burger button
                const burgerButton = event.target.closest('.burger-menu');
                if (!burgerButton) {
                    setIsMenuOpen(false);
                }
            }
        };

        // Use passive listeners for better performance
        document.addEventListener('mousedown', handleOutsideClick, { passive: true });
        document.addEventListener('touchstart', handleOutsideClick, { passive: true });

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        };
    }, [isUserDropdownOpen, isMenuOpen]);

    // ✅ NEW: Handle keyboard events for accessibility (optimized)
    useEffect(() => {
        // Early return if no dropdowns are open
        if (!isUserDropdownOpen && !isMenuOpen) {
            return;
        }

        const handleKeyDown = (event) => {
            // Close dropdowns on Escape key
            if (event.key === 'Escape') {
                if (isUserDropdownOpen) {
                    setIsUserDropdownOpen(false);
                }
                if (isMenuOpen) {
                    setIsMenuOpen(false);
                }
                return;
            }

            // Handle dropdown navigation with Arrow keys (only if user dropdown is open)
            if (isUserDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                event.preventDefault();
                const dropdownLinks = userDropdownRef.current?.querySelectorAll('.dropdown-link');
                if (!dropdownLinks?.length) return;
                
                const currentFocus = document.activeElement;
                const currentIndex = Array.from(dropdownLinks).indexOf(currentFocus);

                let nextIndex;
                if (event.key === 'ArrowDown') {
                    nextIndex = currentIndex < dropdownLinks.length - 1 ? currentIndex + 1 : 0;
                } else {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : dropdownLinks.length - 1;
                }
                
                dropdownLinks[nextIndex]?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isUserDropdownOpen, isMenuOpen]);

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
        const newState = !isUserDropdownOpen;
        setIsUserDropdownOpen(newState);
        
        // Focus first dropdown item when opening
        if (newState) {
            setTimeout(() => {
                const firstDropdownLink = userDropdownRef.current?.querySelector('.dropdown-link');
                firstDropdownLink?.focus();
            }, 100);
        }
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
                    <nav className={`nav ${isMenuOpen ? "nav-open" : ""}`} ref={mobileMenuRef}>
                        {/* Home link now inside nav for proper alignment */}
                        <Link
                            to="/"
                            className="nav-link home-link"
                            onClick={handleHomeNavigation}
                        >
                            Home
                        </Link>
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
                            <div className="user-auth-area" ref={userDropdownRef}>
                                <button
                                    className="user-profile-btn"
                                    onClick={toggleUserDropdown}
                                    aria-label="User menu"
                                    aria-expanded={isUserDropdownOpen}
                                    aria-haspopup="true"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleUserDropdown(e);
                                        }
                                    }}
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
                                    <div 
                                        className="user-dropdown"
                                        role="menu"
                                        aria-labelledby="user-profile-btn"
                                    >
                                        <Link
                                            to="/dashboard"
                                            className="dropdown-link"
                                            onClick={closeMenu}
                                            role="menuitem"
                                        >
                                            <span className="dropdown-icon">
                                                💻
                                            </span>
                                            Dashboard
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="dropdown-link"
                                            onClick={closeMenu}
                                            role="menuitem"
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
                                            role="menuitem"
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

            {isLoginModalOpen && (
                <Suspense fallback={<div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}><LoadingSpinner /></div>}>
                    <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
                </Suspense>
            )}
        </header>
    );
};

export default Header;
