// client/src/pages/AboutPage.js
import React, { useState, useEffect, useCallback } from "react";
import HeroSection from "../components/common/HeroSection"; //hero section improted
import "../styles/about.css";

const AboutPage = () => {
    const [activeSection, setActiveSection] = useState("team");
    const [isSticky, setIsSticky] = useState(false);

    // Navigation sections
    const sections = [
        { id: "team", title: "Our Team", icon: "👥" },
        { id: "mission", title: "Mission & Vision", icon: "🎯" },
        { id: "how-it-works", title: "How It Works", icon: "🔧" },
        { id: "rules", title: "Rules & Guidelines", icon: "📋" },
        { id: "key-messages", title: "Why Choose Us", icon: "⭐" },
        { id: "contact-cta", title: "Get Started", icon: "🚀" },
    ];

    // Team members data with photos
    const teamMembers = [
        {
            id: "giorgi-teliashvili",
            name: "Giorgi Teliashvili",
            title: "Founder & CEO",
            description: "15+ years in construction industry",
            photo: "/images/team/Giorgi.jpg",
            initials: "GT",
        },
        {
            id: "tina-gelashvili",
            name: "Tina Gelashvili",
            title: "Operations Director",
            description: "Business operations & quality assurance",
            photo: "/images/team/Tina.jpg",
            initials: "TG",
        },
        {
            id: "david-lee",
            name: "David Lee",
            title: "Technical Manager",
            description: "Platform development & maintenance",
            photo: "/images/team/David.jpg",
            initials: "DL",
        },
        {
            id: "sarah-rodriguez",
            name: "Sarah Rodriguez",
            title: "Financial Officer",
            description: "Finance & business development",
            photo: "/images/team/Sarah.jpg",
            initials: "SR",
        },
    ];

    // 🎯 SIMPLIFIED: Team Member Component (removed complex loading logic)
    const TeamMember = ({ member }) => {
        const [imageError, setImageError] = useState(false);

        const handleImageError = () => {
            setImageError(true);
            if (process.env.NODE_ENV === "development") {
                console.warn(
                    `Failed to load image for ${member.name}: ${member.photo}`
                );
            }
        };

        return (
            <div className="team-member">
                <div className="member-photo">
                    {!imageError ? (
                        <img
                            src={member.photo}
                            alt={`${member.name} - ${member.title}`}
                            className="member-image"
                            onError={handleImageError}
                        />
                    ) : (
                        <div
                            className="photo-placeholder error"
                            aria-label={`Photo unavailable for ${member.name}`}
                            style={{ backgroundColor: "#007bff" }}
                        >
                            {member.initials}
                        </div>
                    )}
                </div>
                <div className="member-info">
                    <h4>{member.name}</h4>
                    <p className="member-title">{member.title}</p>
                    <p className="member-description">{member.description}</p>
                </div>
            </div>
        );
    };

    // Memoized scroll handler for better performance
    const handleScroll = useCallback(() => {
        const scrollY = window.scrollY;
        const headerHeight =
            document.querySelector(".about-header")?.offsetHeight || 0;
        const shouldBeSticky = scrollY > headerHeight;

        // Only update if state actually changes
        if (shouldBeSticky !== isSticky) {
            setIsSticky(shouldBeSticky);
        }

        // Update active section based on scroll position
        const sectionElements = sections.map((section) =>
            document.getElementById(section.id)
        );

        const currentSection = sectionElements.find((element) => {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            const navHeight = 80; // Account for sticky nav
            return rect.top <= navHeight + 50 && rect.bottom > navHeight + 50;
        });

        if (currentSection && activeSection !== currentSection.id) {
            setActiveSection(currentSection.id);
        }
    }, [isSticky, activeSection, sections]);

    // Handle sticky navigation with throttling for better performance
    useEffect(() => {
        let ticking = false;

        const throttledScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", throttledScroll, { passive: true });
        return () => window.removeEventListener("scroll", throttledScroll);
    }, [handleScroll]);

    // 🎯 KEEP: Preload team images (since only 4 images)
    useEffect(() => {
        teamMembers.forEach((member) => {
            const img = new Image();
            img.src = member.photo;
        });
    }, []);

    // Smooth scroll to section
    const scrollToSection = useCallback((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const navHeight = 80; // Account for sticky nav
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition =
                elementPosition + window.pageYOffset - navHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });
        }
    }, []);

    // Auto scroll to top on page load
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="about-page">
            {/* Horizontal Sticky Navigation */}
            <nav
                className={`about-nav ${isSticky ? "sticky" : ""}`}
                role="navigation"
                aria-label="About page sections"
            >
                <div className="about-nav-container">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            className={`nav-anchor ${
                                activeSection === section.id ? "active" : ""
                            }`}
                            onClick={() => scrollToSection(section.id)}
                            title={section.title}
                            aria-label={`Go to ${section.title} section`}
                        >
                            <span className="nav-icon" aria-hidden="true">
                                {section.icon}
                            </span>
                            <span className="nav-title">{section.title}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="container">
                {/* Hero section imported */}
                <HeroSection
                    title="About Us"
                    description=""
                    backgroundType="construction"
                    overlayType="dark"
                    className="contact-hero"
                />
                {/* Team Section */}
                <section id="team" className="about-section team-section">
                    <div className="section-header">
                        <span className="section-icon" aria-hidden="true">
                            👥
                        </span>
                        <h2>Our Team</h2>
                    </div>
                    <div className="section-content">
                        <p className="team-intro">
                            Meet the dedicated professionals behind TΣLO,
                            working to connect homeowners with trusted
                            renovation experts.
                        </p>
                        <div className="team-grid">
                            {teamMembers.map((member) => (
                                <TeamMember key={member.id} member={member} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Mission & Vision Section */}
                <section id="mission" className="about-section mission-section">
                    <div className="section-header">
                        <span className="section-icon" aria-hidden="true">
                            🎯
                        </span>
                        <h2>Mission & Vision</h2>
                    </div>
                    <div className="section-content">
                        <div className="mission-grid">
                            <div className="mission-card">
                                <h3>Our Mission</h3>
                                <p>
                                    To simplify the process of finding reliable
                                    renovation contractors by creating a
                                    comprehensive, verified directory that
                                    connects homeowners with quality businesses
                                    in their area.
                                </p>
                            </div>
                            <div className="vision-card">
                                <h3>Our Vision</h3>
                                <p>
                                    To become the leading platform where every
                                    renovation project starts, fostering trust
                                    between homeowners and contractors while
                                    supporting local business growth.
                                </p>
                            </div>
                        </div>
                        <div className="values-grid">
                            <div className="value-item">
                                <div className="value-icon" aria-hidden="true">
                                    ✓
                                </div>
                                <div>
                                    <h4>Verified Quality</h4>
                                    <p>All businesses undergo verification</p>
                                </div>
                            </div>
                            <div className="value-item">
                                <div className="value-icon" aria-hidden="true">
                                    🏠
                                </div>
                                <div>
                                    <h4>Local Focus</h4>
                                    <p>Supporting neighborhood businesses</p>
                                </div>
                            </div>
                            <div className="value-item">
                                <div className="value-icon" aria-hidden="true">
                                    🤝
                                </div>
                                <div>
                                    <h4>Trust Building</h4>
                                    <p>Transparent reviews and ratings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section
                    id="how-it-works"
                    className="about-section how-works-section"
                >
                    <div className="section-header">
                        <span className="section-icon" aria-hidden="true">
                            🔧
                        </span>
                        <h2>How It Works</h2>
                    </div>
                    <div className="section-content">
                        <div className="steps-grid">
                            <div className="step-card">
                                <div className="step-number" aria-hidden="true">
                                    1
                                </div>
                                <h3>Search & Discover</h3>
                                <p>
                                    Browse renovation businesses by category,
                                    location, or specialty. Use our advanced
                                    filters to find exactly what you need.
                                </p>
                            </div>
                            <div className="step-card">
                                <div className="step-number" aria-hidden="true">
                                    2
                                </div>
                                <h3>Compare & Review</h3>
                                <p>
                                    Compare verified businesses, read authentic
                                    reviews, and check ratings from previous
                                    customers to make informed decisions.
                                </p>
                            </div>
                            <div className="step-card">
                                <div className="step-number" aria-hidden="true">
                                    3
                                </div>
                                <h3>Connect & Hire</h3>
                                <p>
                                    Contact businesses directly through phone,
                                    email, or social media. Start your
                                    renovation project with confidence.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Rules & Guidelines Section */}
                <section id="rules" className="about-section rules-section">
                    <div className="section-header">
                        <span className="section-icon" aria-hidden="true">
                            📋
                        </span>
                        <h2>Rules & Guidelines</h2>
                    </div>
                    <div className="section-content">
                        <div className="rules-grid">
                            <div className="rule-category">
                                <h3>For Businesses</h3>
                                <ul className="rules-list">
                                    <li>Must be licensed and insured</li>
                                    <li>
                                        Provide accurate business information
                                    </li>
                                    <li>Maintain professional communication</li>
                                    <li>Honor quoted prices and timelines</li>
                                    <li>
                                        Respond to customer inquiries promptly
                                    </li>
                                </ul>
                            </div>
                            <div className="rule-category">
                                <h3>For Customers</h3>
                                <ul className="rules-list">
                                    <li>Provide honest and fair reviews</li>
                                    <li>
                                        Communicate project requirements clearly
                                    </li>
                                    <li>Respect contractor expertise</li>
                                    <li>Report any issues appropriately</li>
                                    <li>Support quality local businesses</li>
                                </ul>
                            </div>
                        </div>
                        <div className="quality-badge">
                            <div className="badge-icon" aria-hidden="true">
                                🏆
                            </div>
                            <div className="badge-content">
                                <h4>Quality Assurance</h4>
                                <p>
                                    We regularly review listed businesses to
                                    ensure continued quality and reliability
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Key Messages Section */}
                <section
                    id="key-messages"
                    className="about-section key-messages-section"
                >
                    <div className="section-header">
                        <span className="section-icon" aria-hidden="true">
                            ⭐
                        </span>
                        <h2>Why Choose TΣLO</h2>
                    </div>
                    <div className="section-content">
                        <div className="benefits-grid">
                            <div className="benefit-card homeowner">
                                <div className="card-header">
                                    <h3>For Homeowners</h3>
                                    <span
                                        className="header-icon"
                                        aria-hidden="true"
                                    >
                                        🏡
                                    </span>
                                </div>
                                <ul>
                                    <li>Verified contractors only</li>
                                    <li>Transparent reviews and ratings</li>
                                    <li>Easy search and comparison</li>
                                    <li>Direct contact with businesses</li>
                                    <li>Local renovation experts</li>
                                </ul>
                            </div>
                            <div className="benefit-card business">
                                <div className="card-header">
                                    <h3>For Businesses</h3>
                                    <span
                                        className="header-icon"
                                        aria-hidden="true"
                                    >
                                        🔨
                                    </span>
                                </div>
                                <ul>
                                    <li>Increase your visibility</li>
                                    <li>Reach local customers</li>
                                    <li>Build trust through reviews</li>
                                    <li>Showcase your expertise</li>
                                    <li>Grow your business</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact CTA Section */}
                <section id="contact-cta" className="about-section cta-section">
                    <div className="section-header">
                        <span className="section-icon" aria-hidden="true">
                            🚀
                        </span>
                        <h2>Get Started Today</h2>
                    </div>
                    <div className="section-content">
                        <div className="cta-grid">
                            <div className="cta-card homeowner-cta">
                                <h3>Looking for Contractors?</h3>
                                <p>
                                    Find verified renovation businesses in your
                                    area
                                </p>
                                <a href="/" className="cta-button primary">
                                    Browse Businesses
                                </a>
                            </div>
                            <div className="cta-card business-cta">
                                <h3>Own a Renovation Business?</h3>
                                <p>
                                    Join our directory and grow your customer
                                    base
                                </p>
                                <a
                                    href="/send-listing"
                                    className="cta-button secondary"
                                >
                                    List Your Business
                                </a>
                            </div>
                        </div>
                        <div className="contact-info">
                            <h4>Need Help?</h4>
                            <p>Our team is here to assist you</p>
                            <a href="/contact" className="contact-link">
                                Contact Us
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;
