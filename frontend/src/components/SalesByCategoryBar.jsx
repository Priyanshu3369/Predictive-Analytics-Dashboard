import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartCard from "./ChartCard";

export default function SalesByCategoryBar() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    axios.get("http://127.0.0.1:8000/sales_by_category")
      .then(res => {
        const parsed = res.data.map(r => ({ ...r, Sales: Number(r.Sales) }));
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
      } catch { }
    };
    return () => ws.close(1000, "unmount chart");
  }, []);

  if (loading) {
    return (
      <ChartCard title="Sales by Product Category">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading…</div>
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Sales by Product Category">
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
    <ChartCard title="Sales by Product Category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="Product_Category"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={{ stroke: "#d1d5db" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={{ stroke: "#d1d5db" }}
          />
          <Tooltip
            formatter={(value) => [value.toLocaleString(), "Sales"]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}

          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar
            dataKey="Sales"
            name="Sales"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
