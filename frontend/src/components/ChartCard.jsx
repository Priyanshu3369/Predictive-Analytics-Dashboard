import React from "react";

export default function ChartCard({ title, children }) {
  return (
    <div className="p-3 sm:p-4 bg-white rounded-xl shadow-md">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-800 truncate">{title}</h3>
      <div className="w-full h-64 sm:h-72 md:h-80">
        {children}
      </div>
    </div>
  );
}