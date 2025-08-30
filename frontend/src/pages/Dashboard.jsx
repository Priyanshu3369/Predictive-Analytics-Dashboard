import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import SalesByCategoryBar from "../components/SalesByCategoryBar";
import SalesByGenderPie from "../components/SalesByGenderPie";
import PaymentMethodPie from "../components/PaymentMethodPie";
import ForecastControls from "../components/ForecastControls";
import ForecastChart from "../components/ForecastChart";

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [salesByGender, setSalesByGender] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [timeseries, setTimeseries] = useState([]);
  const [category, setCategory] = useState("All");
  const [horizon, setHorizon] = useState(3);
  const [forecastData, setForecastData] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [wsMessage, setWsMessage] = useState(null);

  // ---------------- FETCHERS ---------------- //
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await axios.get(`http://127.0.0.1:8000/dashboard_data?category=${encodeURIComponent(category)}`);
      setSummary(res.data.summary);
      setSalesByCategory(res.data.sales_by_category);
      setSalesByGender(res.data.sales_by_gender);
      setPaymentMethods(res.data.payment_methods);
      setTimeseries(res.data.timeseries.data);
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, [category]);

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

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    fetchForecast(category, horizon);
  }, [fetchDashboardData, fetchForecast, category, horizon]);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "data_updated") {
          setWsMessage({ type: "info", message: data.message || "Data updated" });
          fetchDashboardData();
        }
        if (data.status === "training_completed") {
          setWsMessage({ type: "success", message: `Training completed for ${data.category}` });
          fetchForecast(category, horizon);
        }
        if (data.status === "training_failed") {
          setWsMessage({ type: "error", message: `Training failed: ${data.error}` });
        }
      } catch {}
    };
    return () => ws.close(1000, "unmount dashboard");
  }, [fetchDashboardData, fetchForecast, category, horizon]);

  // ---------------- FORMATTERS ---------------- //
  const formatCurrency = (value) => value == null ? "–" :
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatNumber = (value) => value == null ? "–" :
    new Intl.NumberFormat('en-US').format(value);

  const formatPercent = (value) => value == null ? "–" :
    `${(value * 100).toFixed(1)}%`;

  const SummaryCard = ({ title, value, icon, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600 border-blue-200",
      green: "bg-green-50 text-green-600 border-green-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200",
      orange: "bg-orange-50 text-orange-600 border-orange-200",
    };

    return (
      <div className="p-4 sm:p-6 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide truncate">{title}</h2>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
              {loadingSummary ? (
                <span className="animate-pulse bg-gray-200 rounded h-6 sm:h-8 w-16 sm:w-24 block"></span>
              ) : (
                <span className="break-all">{value}</span>
              )}
            </p>
          </div>
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0 ml-2`}>
            <span className="text-lg sm:text-2xl">{icon}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
            📊 Predictive Analytics Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Monitor your business performance and forecast future trends
          </p>
        </div>

        {/* WebSocket Message */}
        {wsMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            wsMessage.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200'
              : wsMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {wsMessage.message}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <SummaryCard title="Total Sales" value={formatCurrency(summary.total_sales)} icon="💰" color="green" />
          <SummaryCard title="Total Profit" value={formatCurrency(summary.total_profit)} icon="📈" color="blue" />
          <SummaryCard title="Total Orders" value={formatNumber(summary.total_orders)} icon="📦" color="purple" />
          <SummaryCard title="Avg Discount" value={formatPercent(summary.avg_discount)} icon="🏷️" color="orange" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Main Chart - Takes full width on mobile, 2 columns on xl+ */}
          <div className="xl:col-span-2">
            <SalesByCategoryBar data={salesByCategory} />
          </div>
          
          {/* Side Charts - Stack vertically on mobile, single column on xl+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-6">
            <SalesByGenderPie data={salesByGender} />
            <PaymentMethodPie data={paymentMethods} />
          </div>
        </div>

        {/* Forecast Section */}
        <div className="space-y-4 sm:space-y-6">
          <ForecastControls
            category={category}
            setCategory={setCategory}
            horizon={horizon}
            setHorizon={setHorizon}
            onTrain={handleAfterTrain}
          />
          
          <div>
            {loadingForecast ? (
              <div className="p-6 sm:p-8 bg-white rounded-xl shadow-md">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-sm sm:text-base">Loading forecast…</span>
                </div>
              </div>
            ) : forecastError ? (
              <div className="p-4 sm:p-6 bg-white rounded-xl shadow-md border-l-4 border-red-500">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-red-500 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Forecast Error</h3>
                    <p className="text-sm text-red-700 mt-1">{forecastError}</p>
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