// client/src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
// NEW: Import email verification page
import VerifyEmailPage from "./pages/VerifyEmailPage";
import "./App.css";

// Create a client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <UserAuthProvider>
                {" "}
                {/* NEW: Wrap app with user authentication context */}
                <Router>
                    <div className="App">
                        <Header />
                        <main className="main-content">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/about" element={<AboutPage />} />
                                <Route
                                    path="/contact"
                                    element={<ContactPage />}
                                />
                                <Route
                                    path="/business/:id"
                                    element={<BusinessDetailPage />}
                                />

                                {/* NEW: Email Verification Routes */}
                                <Route
                                    path="/verify-email"
                                    element={<VerifyEmailPage />}
                                />
                                <Route
                                    path="/verify-email/confirm/:token"
                                    element={<VerifyEmailPage />}
                                />

                                {/* PROTECTED: Dashboard route now requires authentication AND email verification */}
                                <Route
                                    path="/dashboard"
                                    element={
                                        <ProtectedRoute>
                                            <DashboardPage />
                                        </ProtectedRoute>
                                    }
                                />
                                {/* PROTECTED: Settings route now requires authentication AND email verification */}
                                <Route
                                    path="/settings"
                                    element={
                                        <ProtectedRoute>
                                            <SettingsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/*"
                                    element={<AdminPage />}
                                />
                            </Routes>
                        </main>
                        <Footer />
                    </div>
                </Router>
            </UserAuthProvider>{" "}
            {/* NEW: Close user auth provider */}
        </QueryClientProvider>
    );
}

export default App;
