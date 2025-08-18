// client/src/pages/ContactPage.js
import React, { useEffect } from "react";
import HeroSection from "../components/common/HeroSection";
import "../styles/contact.css";

/**
 * ContactPage Component
 *
 * Features:
 * - Uses HeroSection component for consistent header styling
 * - Mobile-first responsive design following project patterns
 * - Contact information display with clean layout
 * - Social media links with SVG icons (extracted from existing components)
 * - Scoped CSS classes to prevent conflicts
 * - Auto-scroll to top on page load
 */
const ContactPage = () => {
    // Auto-scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
    }, []);

    return (
        <div className="contact-page">
            {/* Hero Section imported */}
            <HeroSection
                title="Contact Us"
                description="Get in touch..."
                backgroundType="construction"
                overlayType="dark"
                className="contact-hero"
            />

            {/* Contact Content */}
            <div className="contact-content">
                <div className="contact-container">
                    {/* Contact Information Cards */}
                    <div className="contact-info-grid">
                        {/* Phone Contact */}
                        <div className="contact-card">
                            <div className="contact-card-header">
                                <div className="contact-icon phone-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                </div>
                                <h3>Phone</h3>
                            </div>
                            <div className="contact-card-content">
                                <p>Call us directly for immediate assistance</p>
                                <a
                                    href="tel:+995555123456"
                                    className="contact-link"
                                >
                                    +995 555 123 456
                                </a>
                            </div>
                        </div>

                        {/* Email Contact */}
                        <div className="contact-card">
                            <div className="contact-card-header">
                                <div className="contact-icon email-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                    </svg>
                                </div>
                                <h3>Email</h3>
                            </div>
                            <div className="contact-card-content">
                                <p>
                                    Send us an email and we'll get back to you
                                </p>
                                <a
                                    href="mailto:info@example.com"
                                    className="contact-link"
                                >
                                    info@example.com
                                </a>
                            </div>
                        </div>

                        {/* Address Contact */}
                        <div className="contact-card">
                            <div className="contact-card-header">
                                <div className="contact-icon location-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                </div>
                                <h3>Address</h3>
                            </div>
                            <div className="contact-card-content">
                                <p>Visit us at our office location</p>
                                <address className="contact-address">
                                    123 Business Street
                                    <br />
                                    Tbilisi, Georgia 0108
                                </address>
                            </div>
                        </div>
                    </div>

                    {/* Business Hours Section */}
                    <div className="business-hours-section">
                        <div className="business-hours-card">
                            <div className="contact-card-header">
                                <div className="contact-icon time-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                                        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                    </svg>
                                </div>
                                <h3>Business Hours</h3>
                            </div>
                            <div className="business-hours-content">
                                <div className="hours-grid">
                                    <div className="hours-row">
                                        <span className="day">
                                            Monday - Friday
                                        </span>
                                        <span className="time">
                                            9:00 AM - 6:00 PM
                                        </span>
                                    </div>
                                    <div className="hours-row">
                                        <span className="day">Saturday</span>
                                        <span className="time">
                                            10:00 AM - 4:00 PM
                                        </span>
                                    </div>
                                    <div className="hours-row">
                                        <span className="day">Sunday</span>
                                        <span className="time">Closed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Section */}
                    <div className="contact-social-section">
                        <h3>Follow Us</h3>
                        <p>
                            Stay connected with us on social media for updates
                            and news
                        </p>

                        <div className="contact-social-links">
                            <a
                                href="https://www.facebook.com/yourpage"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-social-link facebook"
                                aria-label="Facebook"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                <span>Facebook</span>
                            </a>

                            <a
                                href="https://www.instagram.com/yourpage"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-social-link instagram"
                                aria-label="Instagram"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                                <span>Instagram</span>
                            </a>

                            <a
                                href="https://www.tiktok.com/@yourpage"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-social-link tiktok"
                                aria-label="TikTok"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                </svg>
                                <span>TikTok</span>
                            </a>

                            <a
                                href="https://www.youtube.com/channel/yourchannel"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-social-link youtube"
                                aria-label="YouTube"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                <span>YouTube</span>
                            </a>

                            <a
                                href="mailto:info@example.com"
                                className="contact-social-link email"
                                aria-label="Email"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                                <span>Email</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
