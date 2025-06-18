// client/src/components/common/Header.js
import React from "react";
import { Link } from "react-router-dom";
import "../../styles/components.css";

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <Link to="/" className="logo">
                    <h1>Business Directory</h1>
                </Link>
                <nav className="nav">
                    <Link to="/" className="nav-link">
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
