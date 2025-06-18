// client/src/components/admin/AdminLogin.js
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import authService from "../../services/authService";
import "../../styles/admin.css";

const AdminLogin = ({ onLoginSuccess }) => {
    const [credentials, setCredentials] = useState({
        username: "",
        password: "",
    });

    const loginMutation = useMutation({
        mutationFn: authService.login,
        onSuccess: () => {
            onLoginSuccess();
        },
        onError: (error) => {
            alert(error.response?.data?.message || "Login failed");
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        loginMutation.mutate(credentials);
    };

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="admin-login">
            <div className="login-container">
                <h2>Admin Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username:</label>
                        <input
                            type="text"
                            name="username"
                            value={credentials.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password:</label>
                        <input
                            type="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loginMutation.isPending}
                    >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
