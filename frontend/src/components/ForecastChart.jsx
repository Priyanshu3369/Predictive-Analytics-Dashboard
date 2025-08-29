import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function ForecastChart({ data }) {
  // Prepare data for recharts
  const prepared = data.map((d) => {
    const yhat = d.yhat != null ? Number(d.yhat) : null;
    const lower = d.yhat_lower != null ? Number(d.yhat_lower) : null;
    const upper = d.yhat_upper != null ? Number(d.yhat_upper) : null;

    return {
      ds: d.ds,
      actual: d.actual != null ? Number(d.actual) : null,
      yhat,
      yhat_lower: lower,
      band: upper != null && lower != null ? upper - lower : 0,
      base: lower != null ? lower : 0,
    };
  });

  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Sales Forecast (historical + predicted)
      </h3>
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={prepared}
            margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="ds"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={{ stroke: "#d1d5db" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={{ stroke: "#d1d5db" }}
            />
            <Tooltip
              formatter={(value, name) => [
                value == null ? "—" : Number(value).toLocaleString(),
                name,
              ]}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: "20px" }}
            />

            {/* Confidence Interval */}
            <Area
              type="monotone"
              dataKey="base"
              stroke="none"
              fillOpacity={0}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill="#60A5FA"
              fillOpacity={0.25}
              stackId="1"
              name="Confidence Interval"
            />

            {/* Predicted Line (Blue) */}
            <Line
              type="monotone"
              dataKey="yhat"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="Predicted"
              connectNulls={false}
            />

            {/* Actual Line (Green) */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3, fill: "#16a34a" }}
              name="Actual"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-gray-500 text-center">
        Green line = historical sales · Blue line = forecast · Shaded area = confidence interval
      </p>
    </div>
  );
}
