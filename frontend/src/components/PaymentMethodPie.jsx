import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartCard from "./ChartCard";

const COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"];

export default function PaymentMethodPie({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Payment Methods">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-sm">No data available</div>
        </div>
      </ChartCard>
    );
  }

  const parsed = data.map((r) => ({ name: r.Payment_method, value: Number(r.Count) }));

  return (
    <ChartCard title="Payment Methods">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={parsed}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius="65%"
            label={false}
          >
            {parsed.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value.toLocaleString(), "Count"]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: "12px"
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={40}
            wrapperStyle={{ 
              paddingTop: "10px", 
              fontSize: "10px",
              lineHeight: "1.2"
            }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}