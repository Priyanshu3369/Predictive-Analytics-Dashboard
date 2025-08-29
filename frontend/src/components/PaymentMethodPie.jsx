import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartCard from "./ChartCard";

const COLORS = ["#60A5FA", "#F472B6", "#34D399", "#FBBF24", "#A78BFA", "#F87171"];

export default function PaymentMethodPie() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    axios.get("http://127.0.0.1:8000/payment_methods")
      .then(res => {
        const parsed = res.data.map(r => ({ name: r.Payment_method, value: Number(r.Count) }));
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

  if (loading) return <ChartCard title="Payment Method Distribution"><div className="flex items-center justify-center h-full">Loading…</div></ChartCard>;
  if (error) return <ChartCard title="Payment Method Distribution"><div className="text-red-500">{error}</div></ChartCard>;

  return (
    <ChartCard title="Payment Method Distribution">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
            {data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
