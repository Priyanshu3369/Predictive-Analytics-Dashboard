import React, { useEffect, useState, useCallback } from "react";
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
  const [wsMessage, setWsMessage] = useState(null);
  const [ws, setWs] = useState(null);

  // ---------------- FETCH FORECAST ---------------- //
  const fetchForecast = useCallback(async (cat, hor) => {
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
  }, []);

  const handleAfterTrain = useCallback(() => {
    fetchForecast(category, horizon);
  }, [category, horizon, fetchForecast]);

  useEffect(() => {
    setLoadingSummary(true);
    Promise.all([
      axios.get("http://127.0.0.1:8000/summary").then(r => setSummary(r.data)),
      axios.get("http://127.0.0.1:8000/timeseries").then(r => setTimeseries(r.data))
    ]).catch(console.error).finally(() => setLoadingSummary(false));

    fetchForecast(category, horizon);
  }, [fetchForecast, category, horizon]);
  useEffect(() => {
    let websocket = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        websocket = new WebSocket("ws://127.0.0.1:8000/ws");

        websocket.onopen = () => {
          console.log("✅ WebSocket connected");
          setWs(websocket);
          websocket.send(JSON.stringify({ type: "subscribe", category: category }));
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📩 WS Received:", data);

            // Handle different message types
            if (data.status === "training_started") {
              setWsMessage({
                type: "info",
                message: `Training started for ${data.category}`
              });
            } else if (data.status === "training_completed") {
              setWsMessage({
                type: "success",
                message: `Training completed for ${data.category} (${data.months_trained} months)`
              });
              fetchForecast(category, horizon);
            } else if (data.status === "training_failed") {
              setWsMessage({
                type: "error",
                message: `Training failed for ${data.category}: ${data.error}`
              });
            }

            setTimeout(() => {
              setWsMessage(null);
            }, 5000);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        websocket.onclose = (event) => {
          console.log("❌ WebSocket disconnected", event.code, event.reason);
          setWs(null);

          // Only reconnect if it wasn't a normal closure
          if (event.code !== 1000) {
            reconnectTimeout = setTimeout(() => {
              console.log("🔄 Attempting to reconnect WebSocket...");
              connectWebSocket();
            }, 3000);
          }
        };

        websocket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (websocket) {
        websocket.close(1000, "Component unmounting");
      }
    };
  }, [category, horizon, fetchForecast]);

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

        {/* WebSocket Notification */}
        {wsMessage && (
          <div className={`mb-6 p-4 rounded-lg border shadow-sm ${wsMessage.type === "error"
              ? "bg-red-100 border-red-300 text-red-800"
              : wsMessage.type === "success"
                ? "bg-green-100 border-green-300 text-green-800"
                : "bg-blue-100 border-blue-300 text-blue-800"
            }`}>
            <div className="flex items-center">
              <span className="mr-2 text-lg">
                {wsMessage.type === "error" ? "❌" :
                  wsMessage.type === "success" ? "✅" : "ℹ️"}
              </span>
              <div>
                <strong className="block text-sm font-medium">
                  {wsMessage.type === "error" ? "Error" :
                    wsMessage.type === "success" ? "Success" : "Info"}
                </strong>
                <span className="text-sm">{wsMessage.message}</span>
              </div>
              <button
                onClick={() => setWsMessage(null)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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