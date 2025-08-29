// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import SalesByCategoryBar from "../components/SalesByCategoryBar";
// import SalesByGenderPie from "../components/SalesByGenderPie";
// import PaymentMethodPie from "../components/PaymentMethodPie";
// import ForecastControls from "../components/ForecastControls";
// import ForecastChart from "../components/ForecastChart";

// export default function Dashboard() {
//   const [summary, setSummary] = useState({});
//   const [timeseries, setTimeseries] = useState([]);
//   const [category, setCategory] = useState("All");
//   const [horizon, setHorizon] = useState(3);
//   const [forecastData, setForecastData] = useState([]);
//   const [loadingForecast, setLoadingForecast] = useState(false);
//   const [forecastError, setForecastError] = useState(null);
//   const [loadingSummary, setLoadingSummary] = useState(true);

//   // 🔹 new state for WebSocket messages
//   const [wsMessage, setWsMessage] = useState(null);

//   // ---------------- REST API ---------------- //
//   useEffect(() => {
//     setLoadingSummary(true);
//     Promise.all([
//       axios.get("http://127.0.0.1:8000/summary").then(r => setSummary(r.data)),
//       axios.get("http://127.0.0.1:8000/timeseries").then(r => setTimeseries(r.data))
//     ]).catch(console.error).finally(() => setLoadingSummary(false));

//     fetchForecast(category, horizon);
//   }, []);

//   const fetchForecast = async (cat, hor) => {
//     try {
//       setLoadingForecast(true);
//       setForecastError(null);
//       const resp = await axios.get(`http://127.0.0.1:8000/predict?horizon=${hor}&category=${encodeURIComponent(cat)}`);
//       setForecastData(resp.data.series);
//     } catch (err) {
//       console.error(err);
//       setForecastError(err?.response?.data?.detail || err.message || "Forecast failed");
//       setForecastData([]);
//     } finally {
//       setLoadingForecast(false);
//     }
//   };

//   const handleAfterTrain = () => {
//     fetchForecast(category, horizon);
//   };

//   useEffect(() => {
//     fetchForecast(category, horizon);
//   }, [category, horizon]);

//   // ---------------- WEBSOCKET ---------------- //
//   useEffect(() => {
//     const ws = new WebSocket("ws://127.0.0.1:8000/ws");

//     ws.onopen = () => {
//       console.log("✅ WebSocket connected");
//     };

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       console.log("📩 WS Received:", data);
//       setWsMessage(data);

//       if (data.status === "training_completed") {
//         fetchForecast(category, horizon);
//       }
//       setTimeout(() => {
//         setWsMessage(null);
//       }, 5000);
//     };


//     ws.onclose = () => {
//       console.log("❌ WebSocket disconnected");
//     };

//     return () => ws.close();
//   }, [category, horizon]);

//   // ---------------- FORMATTERS ---------------- //
//   const formatCurrency = (value) => {
//     if (value == null) return "—";
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(value);
//   };

//   const formatNumber = (value) => {
//     if (value == null) return "—";
//     return new Intl.NumberFormat('en-US').format(value);
//   };

//   const formatPercent = (value) => {
//     if (value == null) return "—";
//     return `${(value * 100).toFixed(1)}%`;
//   };

//   // ---------------- UI COMPONENT ---------------- //
//   const SummaryCard = ({ title, value, icon, color = "blue" }) => {
//     const colorClasses = {
//       blue: "bg-blue-50 text-blue-600 border-blue-200",
//       green: "bg-green-50 text-green-600 border-green-200",
//       purple: "bg-purple-50 text-purple-600 border-purple-200",
//       orange: "bg-orange-50 text-orange-600 border-orange-200",
//     };

//     return (
//       <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
//         <div className="flex items-center justify-between">
//           <div>
//             <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h2>
//             <p className="text-2xl font-bold text-gray-900 mt-2">
//               {loadingSummary ? (
//                 <span className="animate-pulse bg-gray-200 rounded h-8 w-24 block"></span>
//               ) : (
//                 value
//               )}
//             </p>
//           </div>
//           <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
//             <span className="text-2xl">{icon}</span>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ---------------- RENDER ---------------- //
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
//       <div className="p-6">
//         <div className="mb-8">
//           <h1 className="text-4xl font-bold text-gray-900 mb-2">
//             📊 Predictive Analytics Dashboard
//           </h1>
//           <p className="text-gray-600">Monitor your business performance and forecast future trends</p>
//         </div>

//         {/* 🔔 WebSocket Notification */}
//         {wsMessage && (
//           <div className="mb-6 p-4 bg-blue-100 border border-blue-300 text-blue-800 rounded-lg shadow-sm">
//             <strong>🔔 Update:</strong> {wsMessage.status || wsMessage.message}
//           </div>
//         )}

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           <SummaryCard
//             title="Total Sales"
//             value={formatCurrency(summary.total_sales)}
//             icon="💰"
//             color="green"
//           />
//           <SummaryCard
//             title="Total Profit"
//             value={formatCurrency(summary.total_profit)}
//             icon="📈"
//             color="blue"
//           />
//           <SummaryCard
//             title="Total Orders"
//             value={formatNumber(summary.total_orders)}
//             icon="📦"
//             color="purple"
//           />
//           <SummaryCard
//             title="Avg Discount"
//             value={formatPercent(summary.avg_discount)}
//             icon="🏷️"
//             color="orange"
//           />
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//           <div className="lg:col-span-2">
//             <SalesByCategoryBar />
//           </div>
//           <div className="flex flex-col gap-6">
//             <SalesByGenderPie />
//             <PaymentMethodPie />
//           </div>
//         </div>

//         <div className="space-y-6">
//           <ForecastControls
//             category={category}
//             setCategory={setCategory}
//             horizon={horizon}
//             setHorizon={setHorizon}
//             onTrain={handleAfterTrain}
//           />

//           <div>
//             {loadingForecast ? (
//               <div className="p-8 bg-white rounded-xl shadow-md">
//                 <div className="flex items-center justify-center space-x-3">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                   <span className="text-gray-600 text-lg">Loading forecast…</span>
//                 </div>
//               </div>
//             ) : forecastError ? (
//               <div className="p-6 bg-white rounded-xl shadow-md border-l-4 border-red-500">
//                 <div className="flex items-center space-x-3">
//                   <span className="text-red-600 text-2xl">⚠️</span>
//                   <div>
//                     <h3 className="text-lg font-semibold text-red-800">Forecast Error</h3>
//                     <p className="text-red-600 mt-1">{forecastError}</p>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <ForecastChart data={forecastData} />
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }






import React, { useEffect, useState } from "react";
import axios from "axios";
import SalesByCategoryBar from "../components/SalesByCategoryBar";
import SalesByGenderPie from "../components/SalesByGenderPie";
import PaymentMethodPie from "../components/PaymentMethodPie";
import ForecastControls from "../components/ForecastControls";
import ForecastChart from "../components/ForecastChart";

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [timeseries, setTimeseries] = useState([]);
  const [category, setCategory] = useState("All");
  const [horizon, setHorizon] = useState(3);
  const [forecastData, setForecastData] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // ---------------- REST API ---------------- //
  useEffect(() => {
    setLoadingSummary(true);
    Promise.all([
      axios.get("http://127.0.0.1:8000/summary").then(r => setSummary(r.data)),
      axios.get("http://127.0.0.1:8000/timeseries").then(r => setTimeseries(r.data))
    ]).catch(console.error).finally(() => setLoadingSummary(false));

    fetchForecast(category, horizon);
  }, []);

  const fetchForecast = async (cat, hor) => {
    try {
      setLoadingForecast(true);
      setForecastError(null);
      const resp = await axios.get(`http://127.0.0.1:8000/predict?horizon=${hor}&category=${encodeURIComponent(cat)}`);
      setForecastData(resp.data.series);
    } catch (err) {
      console.error(err);
      setForecastError(err?.response?.data?.detail || err.message || "Forecast failed");
      setForecastData([]);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleAfterTrain = () => {
    fetchForecast(category, horizon);
  };

  useEffect(() => {
    fetchForecast(category, horizon);
  }, [category, horizon]);
  
  // ---------------- FORMATTERS ---------------- //
  const formatCurrency = (value) => {
    if (value == null) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    if (value == null) return "—";
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercent = (value) => {
    if (value == null) return "—";
    return `${(value * 100).toFixed(1)}%`;
  };

  // ---------------- UI COMPONENT ---------------- //
  const SummaryCard = ({ title, value, icon, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600 border-blue-200",
      green: "bg-green-50 text-green-600 border-green-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200",
      orange: "bg-orange-50 text-orange-600 border-orange-200",
    };

    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h2>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {loadingSummary ? (
                <span className="animate-pulse bg-gray-200 rounded h-8 w-24 block"></span>
              ) : (
                value
              )}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
      </div>
    );
  };

  // ---------------- RENDER ---------------- //
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Predictive Analytics Dashboard
          </h1>
          <p className="text-gray-600">Monitor your business performance and forecast future trends</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Sales"
            value={formatCurrency(summary.total_sales)}
            icon="💰"
            color="green"
          />
          <SummaryCard
            title="Total Profit"
            value={formatCurrency(summary.total_profit)}
            icon="📈"
            color="blue"
          />
          <SummaryCard
            title="Total Orders"
            value={formatNumber(summary.total_orders)}
            icon="📦"
            color="purple"
          />
          <SummaryCard
            title="Avg Discount"
            value={formatPercent(summary.avg_discount)}
            icon="🏷️"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SalesByCategoryBar />
          </div>
          <div className="flex flex-col gap-6">
            <SalesByGenderPie />
            <PaymentMethodPie />
          </div>
        </div>

        <div className="space-y-6">
          <ForecastControls
            category={category}
            setCategory={setCategory}
            horizon={horizon}
            setHorizon={setHorizon}
            onTrain={handleAfterTrain}
          />

          <div>
            {loadingForecast ? (
              <div className="p-8 bg-white rounded-xl shadow-md">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600 text-lg">Loading forecast…</span>
                </div>
              </div>
            ) : forecastError ? (
              <div className="p-6 bg-white rounded-xl shadow-md border-l-4 border-red-500">
                <div className="flex items-center space-x-3">
                  <span className="text-red-600 text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Forecast Error</h3>
                    <p className="text-red-600 mt-1">{forecastError}</p>
                  </div>
                </div>
              </div>
            ) : (
              <ForecastChart data={forecastData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
