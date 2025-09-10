// client/src/App.js
import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import PageLoadingSpinner from "./components/common/PageLoadingSpinner";
import ChunkErrorBoundary from "./components/common/ChunkErrorBoundary";
// Core pages - loaded immediately
import HomePage from "./pages/HomePage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
// Styles
import "./App.css";

// Lazy-loaded pages - high impact routes
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const FavoritesPage = React.lazy(() => import("./pages/FavoritesPage"));
// Auth flow pages - lazy loaded
const VerifyEmailPage = React.lazy(() => import("./pages/VerifyEmailPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
// Secondary pages - lazy loaded
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));

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
                <Router>
                    <div className="App">
                        <Header />
                        <main className="main-content">
                            <ChunkErrorBoundary>
                                <Suspense fallback={<PageLoadingSpinner />}>
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

                                {/* NEW: Password Reset Routes */}
                                <Route
                                    path="/forgot-password"
                                    element={<ForgotPasswordPage />}
                                />
                                <Route
                                    path="/reset-password/:token"
                                    element={<ResetPasswordPage />}
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
                                {/* PROTECTED: Favorites route requires authentication */}
                                <Route
                                    path="/favorites"
                                    element={
                                        <ProtectedRoute>
                                            <FavoritesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/*"
                                    element={<AdminPage />}
                                />
                                    </Routes>
                                </Suspense>
                            </ChunkErrorBoundary>
                        </main>
                        <Footer />
                        
                        {/* Toast notifications */}
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 3000,
                                style: {
                                    background: '#333',
                                    color: '#fff',
                                },
                                success: {
                                    iconTheme: {
                                        primary: '#4ade80',
                                        secondary: '#fff',
                                    },
                                },
                                error: {
                                    iconTheme: {
                                        primary: '#ef4444',
                                        secondary: '#fff',
                                    },
                                },
                            }}
                        />
                    </div>
                </Router>
            </UserAuthProvider>
        </QueryClientProvider>
    );
}

export default App;
