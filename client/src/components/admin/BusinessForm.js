// client/src/components/admin/BusinessForm.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import businessService from "../../services/businessService";
import LoadingSpinner from "../common/LoadingSpinner";
import { getImageUrl, getPlaceholderData } from "../../utils/imageHelper";

const BusinessForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        businessName: "",
        category: "",
        businessType: "individual",
        city: "",
        mobile: "",
        shortDescription: "",
        socialLinks: {
            facebook: "",
            instagram: "",
            tiktok: "",
        },
    });
    const [imageFile, setImageFile] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: businessService.getCategories,
    });

    // Fetch business for editing
    const { data: business, isLoading } = useQuery({
        queryKey: ["admin-business", id],
        queryFn: () => adminService.getBusiness(id),
        enabled: isEdit,
    });

    useEffect(() => {
        if (business) {
            setFormData({
                businessName: business.businessName || "",
                category: business.category || "",
                businessType: business.businessType || "individual",
                city: business.city || "",
                mobile: business.mobile || "",
                shortDescription: business.shortDescription || "",
                socialLinks: {
                    facebook: business.socialLinks?.facebook || "",
                    instagram: business.socialLinks?.instagram || "",
                    tiktok: business.socialLinks?.tiktok || "",
                },
            });
        }
    }, [business]);

    const mutation = useMutation({
        mutationFn: (data) =>
            isEdit
                ? adminService.updateBusiness(id, data)
                : adminService.createBusiness(data),
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-businesses"]);
            navigate("/admin/businesses");
            alert(`Business ${isEdit ? "updated" : "created"} successfully`);
        },
        onError: (error) => {
            alert(
                `Error: ${
                    error.response?.data?.error || "Something went wrong"
                }`
            );
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const submitData = new FormData();
        Object.keys(formData).forEach((key) => {
            if (key === "socialLinks") {
                submitData.append(key, JSON.stringify(formData[key]));
            } else {
                submitData.append(key, formData[key]);
            }
        });

        if (imageFile) {
            submitData.append("profileImage", imageFile);
        }

        mutation.mutate(submitData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("social.")) {
            const socialField = name.split(".")[1];
            setFormData((prev) => ({
                ...prev,
                socialLinks: {
                    ...prev.socialLinks,
                    [socialField]: value,
                },
            }));
        } else {
            // Handle mobile field specifically - remove all spaces
            const processedValue =
                name === "mobile" ? value.replace(/\s/g, "") : value;
            setFormData((prev) => ({ ...prev, [name]: processedValue }));
        }
    };

    // 1. ADD this function after handleChange (around line 108):
    const handleRemoveImage = async () => {
        if (!window.confirm("Are you sure you want to delete this image?")) {
            return;
        }
        try {
            console.log("🗑️ Would delete:", business.profileImage);
            alert("Image deleted! (Frontend mock - backend coming next)");
            queryClient.invalidateQueries(["admin-business", id]);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    if (isEdit && isLoading) return <LoadingSpinner size="large" />;

    return (
        <div className="business-form">
            <h2>{isEdit ? "Edit Business" : "Add New Business"}</h2>

            <form onSubmit={handleSubmit} className="form">
                <div className="form-row">
                    <div className="form-group">
                        <label>Business Name *</label>
                        <input
                            type="text"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Category *</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat.name}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Business Type *</label>
                        <select
                            name="businessType"
                            value={formData.businessType}
                            onChange={handleChange}
                            required
                        >
                            <option value="individual">Individual</option>
                            <option value="company">Company</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>City *</label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Mobile *</label>
                    <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Short Description</label>
                    <textarea
                        name="shortDescription"
                        value={formData.shortDescription}
                        onChange={handleChange}
                        rows="3"
                    />
                </div>

                <div className="form-group">
                    <label>Profile Image *</label>

                    {/* ENHANCED: Added delete button overlay */}
                    {isEdit && business?.profileImage && (
                        <div className="current-image-preview">
                            <div className="image-container">
                                <img
                                    src={getImageUrl(
                                        business.profileImage,
                                        "thumbnail"
                                    )}
                                    alt={`${formData.businessName} current profile`}
                                    className="image-thumbnail"
                                    onClick={() => setShowImageModal(true)}
                                    style={{ cursor: "pointer" }}
                                />
                                {/* NEW: Delete button overlay */}
                                <button
                                    type="button"
                                    className="delete-overlay-btn"
                                    onClick={handleRemoveImage}
                                    title="Delete this image"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="image-info">
                                <span className="image-filename">
                                    Current:{" "}
                                    {business.profileImage.split("/").pop()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* UNCHANGED: Your existing placeholder */}
                    {isEdit && !business?.profileImage && (
                        <div className="no-image-placeholder">
                            <div
                                className="image-thumbnail placeholder"
                                style={{
                                    backgroundColor: getPlaceholderData(
                                        formData.businessName
                                    ).backgroundColor,
                                }}
                            >
                                {
                                    getPlaceholderData(formData.businessName)
                                        .letter
                                }
                            </div>
                            <span className="image-filename">
                                No image uploaded
                            </span>
                        </div>
                    )}

                    {/* ENHANCED: Disabled when image exists */}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                        disabled={isEdit && business?.profileImage}
                        required={!isEdit || !business?.profileImage}
                    />

                    {/*Required message for new businesses */}
                    {!isEdit && (
                        <div className="required-message">
                            📷 Profile image is required for new business
                            listings
                        </div>
                    )}

                    {/* NEW: Warning message when disabled */}
                    {isEdit && business?.profileImage && (
                        <div className="upload-blocked-message">
                            ⚠️ Please delete current image first to upload a new
                            one
                        </div>
                    )}

                    {/* UNCHANGED: Your existing modal */}
                    {showImageModal && (
                        <div
                            className="image-modal"
                            onClick={() => setShowImageModal(false)}
                        >
                            <div className="modal-content">
                                <img
                                    src={getImageUrl(
                                        business.profileImage,
                                        "detail"
                                    )}
                                    alt={`${formData.businessName} full profile`}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    className="close-modal"
                                    onClick={() => setShowImageModal(false)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Social Links</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Facebook</label>
                            <input
                                type="url"
                                name="social.facebook"
                                value={formData.socialLinks.facebook}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Instagram</label>
                            <input
                                type="url"
                                name="social.instagram"
                                value={formData.socialLinks.instagram}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>TikTok</label>
                            <input
                                type="url"
                                name="social.tiktok"
                                value={formData.socialLinks.tiktok}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/businesses")}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="btn btn-primary"
                    >
                        {mutation.isPending
                            ? "Saving..."
                            : isEdit
                            ? "Update"
                            : "Create"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BusinessForm;
