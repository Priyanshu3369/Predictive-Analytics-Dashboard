// import React from "react";
// import {
//   ResponsiveContainer,
//   ComposedChart,
//   Area,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";

// export default function ForecastChart({ data }) {
//   // Prepare data for recharts
//   const prepared = data.map((d) => {
//     const yhat = d.yhat != null ? Number(d.yhat) : null;
//     const lower = d.yhat_lower != null ? Number(d.yhat_lower) : null;
//     const upper = d.yhat_upper != null ? Number(d.yhat_upper) : null;

//     return {
//       ds: d.ds,
//       actual: d.actual != null ? Number(d.actual) : null,
//       yhat,
//       yhat_lower: lower,
//       band: upper != null && lower != null ? upper - lower : 0,
//       base: lower != null ? lower : 0,
//     };
//   });

//   const isSmallScreen = window.innerWidth < 640;
//   const isMediumScreen = window.innerWidth < 1024;

//   return (
//     <div className="p-3 sm:p-4 bg-white rounded-xl shadow-md">
//       <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-800">
//         Sales Forecast (historical + predicted)
//       </h3>
//       <div className="w-full h-64 sm:h-80 lg:h-96">
//         <ResponsiveContainer width="100%" height="100%">
//           <ComposedChart
//             data={prepared}
//             margin={{ 
//               top: 10, 
//               right: isSmallScreen ? 10 : 30, 
//               left: isSmallScreen ? 10 : 20, 
//               bottom: isSmallScreen ? 20 : 30 
//             }}
//           >
//             <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//             <XAxis
//               dataKey="ds"
//               tick={{ 
//                 fontSize: isSmallScreen ? 10 : 12, 
//                 fill: "#6b7280" 
//               }}
//               axisLine={{ stroke: "#d1d5db" }}
//               tickLine={{ stroke: "#d1d5db" }}
//               angle={isSmallScreen ? -45 : 0}
//               textAnchor={isSmallScreen ? "end" : "middle"}
//               height={isSmallScreen ? 50 : 30}
//               interval={isSmallScreen ? "preserveStartEnd" : 0}
//             />
//             <YAxis
//               tick={{ 
//                 fontSize: isSmallScreen ? 10 : 12, 
//                 fill: "#6b7280" 
//               }}
//               axisLine={{ stroke: "#d1d5db" }}
//               tickLine={{ stroke: "#d1d5db" }}
//               width={isSmallScreen ? 40 : 60}
//             />
//             <Tooltip
//               formatter={(value, name) => [
//                 value == null ? "–" : Number(value).toLocaleString(),
//                 name,
//               ]}
//               labelFormatter={(label) => `Date: ${label}`}
//               contentStyle={{
//                 backgroundColor: "#ffffff",
//                 border: "1px solid #d1d5db",
//                 borderRadius: "8px",
//                 boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
//                 fontSize: isSmallScreen ? "11px" : "12px",
//                 maxWidth: isSmallScreen ? "200px" : "300px"
//               }}
//             />
//             <Legend
//               verticalAlign={isSmallScreen ? "bottom" : "top"}
//               height={isSmallScreen ? 30 : 36}
//               wrapperStyle={{ 
//                 paddingBottom: isSmallScreen ? "10px" : "20px",
//                 fontSize: isSmallScreen ? "10px" : "12px"
//               }}
//               iconSize={isSmallScreen ? 12 : 14}
//             />

//             {/* Confidence Interval */}
//             <Area
//               type="monotone"
//               dataKey="base"
//               stroke="none"
//               fillOpacity={0}
//               stackId="1"
//             />
//             <Area
//               type="monotone"
//               dataKey="band"
//               stroke="none"
//               fill="#60A5FA"
//               fillOpacity={0.25}
//               stackId="1"
//               name="Confidence Interval"
//             />

//             {/* Predicted Line (Blue) */}
//             <Line
//               type="monotone"
//               dataKey="yhat"
//               stroke="#2563eb"
//               strokeWidth={isSmallScreen ? 1.5 : 2}
//               dot={false}
//               name="Predicted"
//               connectNulls={false}
//             />

//             {/* Actual Line (Green) */}
//             <Line
//               type="monotone"
//               dataKey="actual"
//               stroke="#16a34a"
//               strokeWidth={isSmallScreen ? 1.5 : 2}
//               dot={{ r: isSmallScreen ? 2 : 3, fill: "#16a34a" }}
//               name="Actual"
//               connectNulls={false}
//             />
//           </ComposedChart>
//         </ResponsiveContainer>
//       </div>
//       <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500 text-center leading-relaxed">
//         Green line = historical sales · Blue line = forecast · Shaded area = confidence interval
//       </p>
//     </div>
//   );
// }


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
  // Helper function to format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: '2-digit', 
      month: 'short' 
    });
  };

  // Prepare data for recharts
  const prepared = data.map((d) => {
    const yhat = d.yhat != null ? Number(d.yhat) : null;
    const lower = d.yhat_lower != null ? Number(d.yhat_lower) : null;
    const upper = d.yhat_upper != null ? Number(d.yhat_upper) : null;

    return {
      ds: d.ds,
      dsFormatted: formatDate(d.ds),
      actual: d.actual != null ? Number(d.actual) : null,
      yhat,
      yhat_lower: lower,
      band: upper != null && lower != null ? upper - lower : 0,
      base: lower != null ? lower : 0,
    };
  });

  const isSmallScreen = window.innerWidth < 640;
  const isMediumScreen = window.innerWidth < 1024;
  
  // Calculate interval based on data length and screen size
  const calculateInterval = () => {
    const dataLength = prepared.length;
    if (isSmallScreen) {
      if (dataLength > 24) return Math.floor(dataLength / 6);
      if (dataLength > 12) return Math.floor(dataLength / 4);
      return Math.floor(dataLength / 3);
    } else if (isMediumScreen) {
      if (dataLength > 24) return Math.floor(dataLength / 8);
      if (dataLength > 12) return Math.floor(dataLength / 6);
      return Math.floor(dataLength / 4);
    } else {
      if (dataLength > 36) return Math.floor(dataLength / 12);
      if (dataLength > 24) return Math.floor(dataLength / 8);
      return Math.floor(dataLength / 6);
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-white rounded-xl shadow-md">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-800">
        Sales Forecast (historical + predicted)
      </h3>
      <div className="w-full h-64 sm:h-80 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={prepared}
            margin={{ 
              top: 10, 
              right: isSmallScreen ? 10 : 30, 
              left: isSmallScreen ? 10 : 20, 
              bottom: isSmallScreen ? 20 : 30 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dsFormatted"
              tick={{ 
                fontSize: isSmallScreen ? 9 : 11, 
                fill: "#6b7280" 
              }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={{ stroke: "#d1d5db" }}
              angle={isSmallScreen ? -45 : -30}
              textAnchor="end"
              height={isSmallScreen ? 60 : 50}
              interval={calculateInterval()}
              minTickGap={isSmallScreen ? 20 : 30}
            />
            <YAxis
              tick={{ 
                fontSize: isSmallScreen ? 10 : 12, 
                fill: "#6b7280" 
              }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={{ stroke: "#d1d5db" }}
              width={isSmallScreen ? 40 : 60}
            />
            <Tooltip
              formatter={(value, name) => [
                value == null ? "–" : Number(value).toLocaleString(),
                name,
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0] && payload[0].payload) {
                  const fullDate = new Date(payload[0].payload.ds);
                  return `Date: ${fullDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`;
                }
                return `Date: ${label}`;
              }}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                fontSize: isSmallScreen ? "11px" : "12px",
                maxWidth: isSmallScreen ? "220px" : "300px"
              }}
            />
            <Legend
              verticalAlign={isSmallScreen ? "bottom" : "top"}
              height={isSmallScreen ? 30 : 36}
              wrapperStyle={{ 
                paddingBottom: isSmallScreen ? "10px" : "20px",
                fontSize: isSmallScreen ? "10px" : "12px"
              }}
              iconSize={isSmallScreen ? 12 : 14}
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
              strokeWidth={isSmallScreen ? 1.5 : 2}
              dot={false}
              name="Predicted"
              connectNulls={false}
            />

            {/* Actual Line (Green) */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#16a34a"
              strokeWidth={isSmallScreen ? 1.5 : 2}
              dot={{ r: isSmallScreen ? 2 : 3, fill: "#16a34a" }}
              name="Actual"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500 text-center leading-relaxed">
        Green line = historical sales · Blue line = forecast · Shaded area = confidence interval
      </p>
    </div>
  );
}