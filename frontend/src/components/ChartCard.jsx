import React from "react";

export default function ChartCard({ title, children }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
      <div className="w-full h-80">
        {children}
      </div>
    </div>
  );
}