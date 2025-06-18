// client/src/components/admin/CategoryManager.js
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";

const CategoryManager = () => {
    const [newCategory, setNewCategory] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const queryClient = useQueryClient();

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ["admin-categories"],
        queryFn: adminService.getCategories,
    });

    const createMutation = useMutation({
        mutationFn: adminService.createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-categories"]);
            setNewCategory("");
            alert("Category created successfully");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => adminService.updateCategory(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-categories"]);
            setEditingId(null);
            alert("Category updated successfully");
        },
    });

    const toggleMutation = useMutation({
        mutationFn: adminService.toggleCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-categories"]);
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

    const handleUpdate = (e) => {
        e.preventDefault();
        updateMutation.mutate({
            id: editingId,
            data: { name: editName.trim() },
        });
    };

    if (isLoading) return <LoadingSpinner size="large" />;

    return (
        <div className="category-manager">
            <h2>Manage Categories</h2>

            <div className="add-category">
                <h3>Add New Category</h3>
                <form onSubmit={handleCreate} className="category-form">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Category name"
                        required
                    />
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="btn btn-primary"
                    >
                        Add
                    </button>
                </form>
            </div>

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
                                            />
                                            <button
                                                type="submit"
                                                className="btn btn-small btn-primary"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditingId(null)
                                                }
                                                className="btn btn-small btn-secondary"
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
                                        disabled={editingId === category._id}
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
                                        disabled={toggleMutation.isPending}
                                    >
                                        {category.isActive
                                            ? "Deactivate"
                                            : "Activate"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CategoryManager;
