// server/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const publicBusinessesRoutes = require("./routes/public/businesses");
const adminBusinessesRoutes = require("./routes/admin/businesses");
const adminAuthRoutes = require("./routes/admin/auth");
const adminCategoriesRoutes = require("./routes/admin/categories");
//aded below for dashboard
const adminDashboardRoutes = require("./routes/admin/dashboard");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Public routes
app.use("/api/businesses", publicBusinessesRoutes);

// Admin routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/businesses", adminBusinessesRoutes);
app.use("/api/admin/categories", adminCategoriesRoutes);
//aded below for dashboard
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Test route
app.get("/api/test", (req, res) => {
    res.json({ message: "Server running successfully!" });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
