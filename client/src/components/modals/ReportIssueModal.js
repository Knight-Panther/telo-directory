// client/src/components/modals/ReportIssueModal.js

import React, { useState } from "react";
import businessService from "../../services/businessService";
import "./../../styles/modals.css";

const ReportIssueModal = ({ isOpen, onClose, businessId, businessName }) => {
    // Form state management - tracks all user inputs and selections
    const [formData, setFormData] = useState({
        brokenImage: false,
        businessNoLongerExists: false,
        otherIssue: false,
        description: "",
        honeypot: "", // ADD: Honeypot field for spam protection
    });

    // UI state management for user feedback and interaction control
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleCheckboxChange = (field) => {
        setFormData((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
        setError("");
    };

    const handleDescriptionChange = (e) => {
        const value = e.target.value;
        if (value.length <= 50) {
            setFormData((prev) => ({
                ...prev,
                description: value,
            }));
        }
        setError("");
    };

    // ADD: Honeypot change handler
    const handleHoneypotChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            honeypot: e.target.value,
        }));
    };

    const validateForm = () => {
        const { brokenImage, businessNoLongerExists, otherIssue, description } =
            formData;

        if (!brokenImage && !businessNoLongerExists && !otherIssue) {
            setError("Please select at least one issue type");
            return false;
        }

        if (description.trim() && !otherIssue) {
            setError(
                'Please select "Other Issue" to provide a custom description'
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        setError("");

        try {
            const issueTypes = [];
            if (formData.brokenImage) issueTypes.push("Broken Image");
            if (formData.businessNoLongerExists)
                issueTypes.push("Business No Longer Exists");
            if (formData.otherIssue) issueTypes.push("Other Issue");

            // CHANGE: Use actual honeypot value instead of hardcoded ""
            const reportData = {
                businessId,
                issueTypes,
                description: formData.otherIssue
                    ? formData.description.trim()
                    : "",
                honeypot: formData.honeypot, // FIX: Use actual honeypot field value
            };

            await businessService.submitReport(reportData);
            setIsSubmitted(true);

            if (process.env.NODE_ENV === "development") {
                console.log("📊 Report submission analytics:", {
                    businessId,
                    issueTypes,
                    hasCustomDescription: !!reportData.description,
                    honeypotValue: reportData.honeypot, // For debugging
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (err) {
            setError(
                err.message || "Failed to submit report. Please try again."
            );

            if (process.env.NODE_ENV === "development") {
                console.error("Report submission error:", err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            brokenImage: false,
            businessNoLongerExists: false,
            otherIssue: false,
            description: "",
            honeypot: "", // ADD: Reset honeypot field
        });
        setIsSubmitting(false);
        setIsSubmitted(false);
        setError("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="report-modal-overlay" onClick={handleClose}>
            <div
                className="report-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {!isSubmitted ? (
                    <>
                        <div className="report-modal-header">
                            <div className="report-modal-title">
                                <h2>Report Issue</h2>
                                <p className="report-subtitle">
                                    Help us improve by reporting issues with{" "}
                                    {businessName || "this business"}
                                </p>
                            </div>
                            <button
                                className="report-modal-close"
                                onClick={handleClose}
                                type="button"
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="report-modal-body"
                        >
                            {/* ADD: HONEYPOT FIELD - Hidden from users, visible to bots */}
                            <input
                                type="text"
                                name="website"
                                value={formData.honeypot}
                                onChange={handleHoneypotChange}
                                style={{
                                    position: "absolute",
                                    left: "-9999px",
                                    top: "-9999px",
                                    opacity: 0,
                                    width: "1px",
                                    height: "1px",
                                    overflow: "hidden",
                                }}
                                tabIndex="-1"
                                autoComplete="off"
                                aria-hidden="true"
                            />

                            <div className="report-issue-types">
                                <h3>What's the issue?</h3>

                                <div className="issue-checkbox-group">
                                    <label className="issue-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.brokenImage}
                                            onChange={() =>
                                                handleCheckboxChange(
                                                    "brokenImage"
                                                )
                                            }
                                        />
                                        <span className="checkmark"></span>
                                        <span className="checkbox-label">
                                            Broken Image
                                        </span>
                                    </label>

                                    <label className="issue-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={
                                                formData.businessNoLongerExists
                                            }
                                            onChange={() =>
                                                handleCheckboxChange(
                                                    "businessNoLongerExists"
                                                )
                                            }
                                        />
                                        <span className="checkmark"></span>
                                        <span className="checkbox-label">
                                            Business No Longer Exists
                                        </span>
                                    </label>

                                    <label className="issue-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.otherIssue}
                                            onChange={() =>
                                                handleCheckboxChange(
                                                    "otherIssue"
                                                )
                                            }
                                        />
                                        <span className="checkmark"></span>
                                        <span className="checkbox-label">
                                            Other Issue
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="report-description-section">
                                <div className="description-header">
                                    <label htmlFor="description">
                                        Additional Details
                                    </label>
                                    <span className="character-counter">
                                        {formData.description.length}/50
                                    </span>
                                </div>
                                <textarea
                                    id="description"
                                    className="description-input"
                                    placeholder={
                                        formData.otherIssue
                                            ? "Please describe the issue..."
                                            : "Select 'Other Issue' to add custom details"
                                    }
                                    value={formData.description}
                                    onChange={handleDescriptionChange}
                                    disabled={!formData.otherIssue}
                                    rows="3"
                                />
                            </div>

                            {error && (
                                <div className="report-error">{error}</div>
                            )}

                            <div className="report-modal-footer">
                                <button
                                    type="submit"
                                    className="report-submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Submitting..."
                                        : "Submit Report"}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="report-success">
                        <div className="success-icon">✓</div>
                        <h2>Thank You!</h2>
                        <p>
                            Your report has been submitted successfully. We'll
                            review it and take appropriate action.
                        </p>
                        <button
                            className="success-close-btn"
                            onClick={handleClose}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportIssueModal;
