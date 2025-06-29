// client/src/components/common/Header.js - Enhanced navigation
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/components.css";

const Header = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    // Function to navigate home and reset search
    const handleHomeNavigation = (e) => {
        e.preventDefault();
        // Navigate to home with state to trigger reset
        navigate("/", { state: { resetSearch: true }, replace: true });
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
                            About Us
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
        </header>
    );
};

export default Header;
