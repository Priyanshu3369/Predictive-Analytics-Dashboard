import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartCard from "./ChartCard";

const COLORS = ["#3B82F6", "#EC4899", "#10B981", "#F59E0B"];

export default function SalesByGenderPie() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    axios.get("http://127.0.0.1:8000/sales_by_gender")
      .then(res => {
        const parsed = res.data.map((r) => ({ name: r.Gender, value: Number(r.Sales) }));
        setData(parsed);
      })
      .catch(err => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 Listen for live updates
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "data_updated") {
          fetchData();
        }
      } catch {}
    };
    return () => ws.close(1000, "unmount chart");
  }, []);

  if (loading) {
    return (
      <ChartCard title="Sales by Gender">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading…</div>
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Sales by Gender">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500 text-center">
            <div className="text-red-600 mb-2">⚠️ Error</div>
            <div>{error}</div>
          </div>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Sales by Gender">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="45%" 
            outerRadius={90} 
            innerRadius={0}
            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {data.map((_, idx) => (
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
