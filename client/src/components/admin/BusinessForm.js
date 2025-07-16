// client/src/components/admin/BusinessForm.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import businessService from "../../services/businessService";
import LoadingSpinner from "../common/LoadingSpinner";

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
            setFormData((prev) => ({ ...prev, [name]: value }));
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
                    <label>Profile Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />
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
