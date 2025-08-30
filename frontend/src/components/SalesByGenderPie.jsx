import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartCard from "./ChartCard";

const COLORS = ["#3B82F6", "#EC4899", "#10B981", "#F59E0B"];

export default function SalesByGenderPie({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Sales by Gender">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">No data available</div>
        </div>
      </ChartCard>
    );
  }

  const parsed = data.map((r) => ({ name: r.Gender, value: Number(r.Sales) }));

  return (
    <ChartCard title="Sales by Gender">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={parsed} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="45%" 
            outerRadius={90} 
            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {parsed.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [value.toLocaleString(), "Sales"]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={40}
            wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
