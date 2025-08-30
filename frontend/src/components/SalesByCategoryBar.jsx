import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartCard from "./ChartCard";

export default function SalesByCategoryBar({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Sales by Product Category">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-sm">No data available</div>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Sales by Product Category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ 
            top: 20, 
            right: 10, 
            left: 10, 
            bottom: window.innerWidth < 640 ? 80 : 60 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="Product_Category"
            angle={window.innerWidth < 640 ? -90 : -45}
            textAnchor="end"
            interval={0}
            height={window.innerWidth < 640 ? 100 : 80}
            tick={{ 
              fontSize: window.innerWidth < 640 ? 9 : 11, 
              fill: "#6b7280" 
            }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={{ stroke: "#d1d5db" }}
          />
          <YAxis
            tick={{ 
              fontSize: window.innerWidth < 640 ? 10 : 12, 
              fill: "#6b7280" 
            }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={{ stroke: "#d1d5db" }}
            width={window.innerWidth < 640 ? 40 : 60}
          />
          <Tooltip
            formatter={(value) => [value.toLocaleString(), "Sales"]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: window.innerWidth < 640 ? "11px" : "12px"
            }}
          />
          <Legend 
            wrapperStyle={{ 
              paddingTop: "20px",
              fontSize: window.innerWidth < 640 ? "10px" : "12px"
            }} 
          />
          <Bar
            dataKey="Sales"
            name="Sales"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
            maxBarSize={window.innerWidth < 640 ? 40 : 60}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}