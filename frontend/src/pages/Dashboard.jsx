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
  const formatCurrency = (value) => value == null ? "—" :
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatNumber = (value) => value == null ? "—" :
    new Intl.NumberFormat('en-US').format(value);

  const formatPercent = (value) => value == null ? "—" :
    `${(value * 100).toFixed(1)}%`;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Predictive Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your business performance and forecast future trends</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Total Sales" value={formatCurrency(summary.total_sales)} icon="💰" color="green" />
          <SummaryCard title="Total Profit" value={formatCurrency(summary.total_profit)} icon="📈" color="blue" />
          <SummaryCard title="Total Orders" value={formatNumber(summary.total_orders)} icon="📦" color="purple" />
          <SummaryCard title="Avg Discount" value={formatPercent(summary.avg_discount)} icon="🏷️" color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SalesByCategoryBar data={salesByCategory} />
          </div>
          <div className="flex flex-col gap-6">
            <SalesByGenderPie data={salesByGender} />
            <PaymentMethodPie data={paymentMethods} />
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
              <div className="p-8 bg-white rounded-xl shadow-md">Loading forecast…</div>
            ) : forecastError ? (
              <div className="p-6 bg-white rounded-xl shadow-md border-l-4 border-red-500">{forecastError}</div>
            ) : (
              <ForecastChart data={forecastData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
