// client/src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import AdminPage from "./pages/AdminPage";
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
            <Router>
                <div className="App">
                    <Header />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/about" element={<AboutPage />} />
                            <Route
                                path="/business/:id"
                                element={<BusinessDetailPage />}
                            />
                            <Route path="/admin/*" element={<AdminPage />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
