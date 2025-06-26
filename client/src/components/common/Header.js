// client/src/components/common/Header.js - Enhanced navigation
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/components.css";

const Header = () => {
    const navigate = useNavigate();

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
                    <h1>Business Directory</h1>
                </Link>
                <nav className="nav">
                    <Link
                        to="/"
                        className="nav-link"
                        onClick={handleHomeNavigation}
                    >
                        Home
                    </Link>
                    <Link to="/admin" className="nav-link">
                        Admin
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
