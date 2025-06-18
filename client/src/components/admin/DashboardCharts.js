// client/src/components/admin/DashboardCharts.js
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ResponsiveContainer,
} from "recharts";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";

const COLORS = [
    "#007bff",
    "#28a745",
    "#ffc107",
    "#dc3545",
    "#6c757d",
    "#17a2b8",
];

const DashboardCharts = () => {
    const { data: chartData, isLoading } = useQuery({
        queryKey: ["dashboard-charts"],
        queryFn: adminService.getChartData,
    });

    if (isLoading) return <LoadingSpinner />;

    const categoryData =
        chartData?.categoryStats?.map((item) => ({
            name: item._id,
            value: item.count,
        })) || [];

    const cityData =
        chartData?.cityStats?.map((item) => ({
            name: item._id,
            count: item.count,
        })) || [];

    const monthlyData =
        chartData?.monthlyGrowth?.map((item) => ({
            name: `${item._id.month}/${item._id.year}`,
            businesses: item.count,
        })) || [];

    return (
        <div className="dashboard-charts">
            <div className="chart-grid">
                {/* Businesses by Category */}
                <div className="chart-card">
                    <h4>Businesses by Category</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Businesses by City */}
                <div className="chart-card">
                    <h4>Businesses by City</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={cityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#007bff" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Growth */}
                <div className="chart-card full-width">
                    <h4>Monthly Growth (Last 6 Months)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="businesses"
                                stroke="#28a745"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;
