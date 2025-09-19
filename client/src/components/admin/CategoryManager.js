// client/src/components/admin/CategoryManager.js - REPLACE ENTIRE FILE
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";

const CategoryManager = () => {
    const [newCategory, setNewCategory] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");

    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmationData, setConfirmationData] = useState(null);

    // Delete confirmation dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmationData, setDeleteConfirmationData] = useState(null);

    const queryClient = useQueryClient();

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ["admin-categories"],
        queryFn: adminService.getCategories,
    });

    // Get business count for confirmation
    const businessCountQuery = useMutation({
        mutationFn: adminService.getCategoryBusinessCount,
    });

    const createMutation = useMutation({
        mutationFn: adminService.createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-categories"]);
            queryClient.invalidateQueries(["categories"]); // Also invalidate public categories
            setNewCategory("");
            alert("Category created successfully");
        },
        onError: (error) => {
            alert(
                `Error creating category: ${
                    error.response?.data?.error || error.message
                }`
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => adminService.updateCategory(id, data),
        onSuccess: (response) => {
            queryClient.invalidateQueries(["admin-categories"]);
            queryClient.invalidateQueries(["categories"]); // Also invalidate public categories
            queryClient.invalidateQueries(["businesses"]); // Invalidate businesses to refresh filters
            setEditingId(null);
            setShowConfirmDialog(false);

            // Show success message with migration info
            if (response.migratedBusinesses > 0) {
                alert(`✅ ${response.message}`);
            } else {
                alert("Category updated successfully");
            }
        },
        onError: (error) => {
            alert(
                `Error updating category: ${
                    error.response?.data?.error || error.message
                }`
            );
            setShowConfirmDialog(false);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: adminService.toggleCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-categories"]);
            queryClient.invalidateQueries(["categories"]); // Also invalidate public categories
        },
        onError: (error) => {
            alert(
                `Error toggling category: ${
                    error.response?.data?.error || error.message
                }`
            );
        },
    });

    // NEW: Delete category mutation
    const deleteMutation = useMutation({
        mutationFn: adminService.deleteCategory,
        onSuccess: (response) => {
            queryClient.invalidateQueries(["admin-categories"]);
            queryClient.invalidateQueries(["categories"]); // Also invalidate public categories
            queryClient.invalidateQueries(["businesses"]); // Invalidate businesses to refresh filters
            setShowDeleteDialog(false);
            setDeleteConfirmationData(null);
            alert(response.message || "Category deleted successfully");
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.error || error.message;
            const businessCount = error.response?.data?.details?.businessCount;

            if (businessCount > 0) {
                alert(
                    `Cannot delete category: ${businessCount} business${businessCount === 1 ? '' : 'es'} still use this category. Please reassign them first.`
                );
            } else {
                alert(`Error deleting category: ${errorMessage}`);
            }
            setShowDeleteDialog(false);
        },
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (newCategory.trim()) {
            createMutation.mutate({ name: newCategory.trim() });
        }
    };

    const handleEdit = (category) => {
        setEditingId(category._id);
        setEditName(category.name);
    };

    // Enhanced update with confirmation
    const handleUpdate = async (e) => {
        e.preventDefault();

        const trimmedName = editName.trim();
        if (!trimmedName) return;

        // Find the original category
        const originalCategory = categories.find(
            (cat) => cat._id === editingId
        );
        if (!originalCategory) return;

        // If name hasn't changed, update without confirmation
        if (originalCategory.name === trimmedName) {
            updateMutation.mutate({
                id: editingId,
                data: { name: trimmedName },
            });
            return;
        }

        try {
            // Get business count for confirmation
            const countData = await businessCountQuery.mutateAsync(editingId);

            if (countData.businessCount === 0) {
                // No businesses affected, update directly
                updateMutation.mutate({
                    id: editingId,
                    data: { name: trimmedName },
                });
            } else {
                // Show confirmation dialog
                setConfirmationData({
                    categoryId: editingId,
                    oldName: originalCategory.name,
                    newName: trimmedName,
                    businessCount: countData.businessCount,
                });
                setShowConfirmDialog(true);
            }
        } catch (error) {
            alert(
                `Error checking businesses: ${
                    error.response?.data?.error || error.message
                }`
            );
        }
    };

    // Confirm the update
    const confirmUpdate = () => {
        if (confirmationData) {
            updateMutation.mutate({
                id: confirmationData.categoryId,
                data: { name: confirmationData.newName },
            });
        }
    };

    // Cancel confirmation
    const cancelUpdate = () => {
        setShowConfirmDialog(false);
        setConfirmationData(null);
    };

    // NEW: Handle category deletion
    const handleDelete = async (category) => {
        try {
            // Get business count for confirmation
            const countData = await businessCountQuery.mutateAsync(category._id);

            setDeleteConfirmationData({
                categoryId: category._id,
                categoryName: category.name,
                businessCount: countData.businessCount,
            });
            setShowDeleteDialog(true);
        } catch (error) {
            alert(
                `Error checking businesses: ${
                    error.response?.data?.error || error.message
                }`
            );
        }
    };

    // Confirm deletion
    const confirmDelete = () => {
        if (deleteConfirmationData) {
            deleteMutation.mutate(deleteConfirmationData.categoryId);
        }
    };

    // Cancel deletion
    const cancelDelete = () => {
        setShowDeleteDialog(false);
        setDeleteConfirmationData(null);
    };

    if (isLoading) return <LoadingSpinner size="large" />;

    return (
        <div className="category-manager">
            <div className="category-manager-header">
                <h2>📂 Manage Categories</h2>
                <p>Control business categories and their availability for user submissions</p>
            </div>

            {/* Information Panel */}
            <div className="category-info-panel">
                <div className="info-card">
                    <h4>📋 Category Control</h4>
                    <ul>
                        <li><strong>Active:</strong> Available for user submissions and business listings</li>
                        <li><strong>Inactive:</strong> Hidden from user submissions (existing businesses keep their category)</li>
                        <li><strong>Delete:</strong> Only possible when no businesses use this category</li>
                    </ul>
                </div>
                <div className="info-card">
                    <h4>📊 Quick Stats</h4>
                    <div className="stat-grid">
                        <span className="stat-item">
                            <strong>{categories.filter(cat => cat.isActive).length}</strong> Active
                        </span>
                        <span className="stat-item">
                            <strong>{categories.filter(cat => !cat.isActive).length}</strong> Inactive
                        </span>
                        <span className="stat-item">
                            <strong>{categories.length}</strong> Total
                        </span>
                    </div>
                </div>
            </div>

            {/* Add New Category */}
            <div className="add-category">
                <h3>Add New Category</h3>
                <form onSubmit={handleCreate} className="category-form">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Category name"
                        required
                        disabled={createMutation.isPending}
                    />
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="btn btn-primary"
                    >
                        {createMutation.isPending ? "Adding..." : "Add"}
                    </button>
                </form>
            </div>

            {/* Existing Categories */}
            <div className="categories-list">
                <h3>Existing Categories</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category._id}>
                                <td>
                                    {editingId === category._id ? (
                                        <form
                                            onSubmit={handleUpdate}
                                            className="inline-form"
                                        >
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) =>
                                                    setEditName(e.target.value)
                                                }
                                                required
                                                disabled={
                                                    updateMutation.isPending ||
                                                    businessCountQuery.isPending
                                                }
                                            />
                                            <button
                                                type="submit"
                                                className="btn btn-small btn-primary"
                                                disabled={
                                                    updateMutation.isPending ||
                                                    businessCountQuery.isPending
                                                }
                                            >
                                                {updateMutation.isPending ||
                                                businessCountQuery.isPending
                                                    ? "..."
                                                    : "Save"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditName("");
                                                }}
                                                className="btn btn-small btn-secondary"
                                                disabled={
                                                    updateMutation.isPending ||
                                                    businessCountQuery.isPending
                                                }
                                            >
                                                Cancel
                                            </button>
                                        </form>
                                    ) : (
                                        category.name
                                    )}
                                </td>
                                <td>
                                    <span
                                        className={`status ${
                                            category.isActive
                                                ? "active"
                                                : "inactive"
                                        }`}
                                    >
                                        {category.isActive
                                            ? "Active"
                                            : "Inactive"}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button
                                        onClick={() => handleEdit(category)}
                                        className="btn btn-small btn-secondary"
                                        disabled={
                                            editingId === category._id ||
                                            updateMutation.isPending
                                        }
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() =>
                                            toggleMutation.mutate(category._id)
                                        }
                                        className={`btn btn-small ${
                                            category.isActive
                                                ? "btn-warning"
                                                : "btn-success"
                                        }`}
                                        disabled={
                                            toggleMutation.isPending ||
                                            editingId === category._id
                                        }
                                    >
                                        {category.isActive
                                            ? "Deactivate"
                                            : "Activate"}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category)}
                                        className="btn btn-small btn-danger"
                                        disabled={
                                            editingId === category._id ||
                                            deleteMutation.isPending ||
                                            businessCountQuery.isPending
                                        }
                                    >
                                        {businessCountQuery.isPending ? "..." : "Delete"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && confirmationData && (
                <div className="confirmation-overlay">
                    <div className="confirmation-dialog">
                        <div className="confirmation-header">
                            <h3>⚠️ Confirm Category Update</h3>
                        </div>
                        <div className="confirmation-content">
                            <p>
                                This will update{" "}
                                <strong>
                                    {confirmationData.businessCount}
                                </strong>{" "}
                                business
                                {confirmationData.businessCount === 1
                                    ? ""
                                    : "es"}{" "}
                                from
                                <strong>
                                    {" "}
                                    "{confirmationData.oldName}"
                                </strong>{" "}
                                to
                                <strong> "{confirmationData.newName}"</strong>.
                            </p>
                            <p>
                                All affected businesses will automatically use
                                the new category name.
                            </p>
                            <p>
                                <strong>Continue?</strong>
                            </p>
                        </div>
                        <div className="confirmation-actions">
                            <button
                                onClick={confirmUpdate}
                                className="btn btn-primary"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending
                                    ? "Updating..."
                                    : "Yes, Update"}
                            </button>
                            <button
                                onClick={cancelUpdate}
                                className="btn btn-secondary"
                                disabled={updateMutation.isPending}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && deleteConfirmationData && (
                <div className="confirmation-overlay">
                    <div className="confirmation-dialog">
                        <div className="confirmation-header">
                            <h3>🗑️ Confirm Category Deletion</h3>
                        </div>
                        <div className="confirmation-content">
                            {deleteConfirmationData.businessCount > 0 ? (
                                <>
                                    <p>
                                        <strong>⚠️ Cannot delete category "{deleteConfirmationData.categoryName}"</strong>
                                    </p>
                                    <p>
                                        This category is currently being used by{" "}
                                        <strong>{deleteConfirmationData.businessCount}</strong>{" "}
                                        business{deleteConfirmationData.businessCount === 1 ? '' : 'es'}.
                                    </p>
                                    <p>
                                        To delete this category, you must first reassign all businesses
                                        to a different category from the "Manage Businesses" section.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Are you sure you want to delete the category{" "}
                                        <strong>"{deleteConfirmationData.categoryName}"</strong>?
                                    </p>
                                    <p>
                                        This action cannot be undone.
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="confirmation-actions">
                            {deleteConfirmationData.businessCount > 0 ? (
                                <button
                                    onClick={cancelDelete}
                                    className="btn btn-primary"
                                >
                                    Close
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={confirmDelete}
                                        className="btn btn-danger"
                                        disabled={deleteMutation.isPending}
                                    >
                                        {deleteMutation.isPending
                                            ? "Deleting..."
                                            : "Yes, Delete"}
                                    </button>
                                    <button
                                        onClick={cancelDelete}
                                        className="btn btn-secondary"
                                        disabled={deleteMutation.isPending}
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManager;
