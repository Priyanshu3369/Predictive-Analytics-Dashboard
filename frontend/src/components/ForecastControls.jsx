import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ForecastControls({ category, setCategory, horizon, setHorizon, onTrain }) {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [trainStatus, setTrainStatus] = useState({ loading: false, message: "" });

  useEffect(() => {
    setLoadingCats(true);
    axios.get("http://127.0.0.1:8000/categories")
      .then(res => {
        const cats = res.data.categories || [];
        setCategories(cats);
      })
      .catch(err => {
        console.error("Failed to load categories:", err);
        setCategories(["All"]);
      })
      .finally(() => setLoadingCats(false));
  }, []);

  const handleTrain = async () => {
    try {
      setTrainStatus({ loading: true, message: "Training model… WebSocket updates will appear above." });
      const resp = await axios.post(
        `http://127.0.0.1:8000/train_forecast?category=${encodeURIComponent(category)}`
      );

      setTrainStatus({
        loading: false,
        message: `Training queued for ${category}. Watch for WebSocket updates.`
      });

      if (onTrain) onTrain();
      setTimeout(() => setTrainStatus({ loading: false, message: "" }), 3000);
    } catch (err) {
      console.error(err);
      setTrainStatus({
        loading: false,
        message: `Train failed: ${err?.response?.data?.detail || err.message}`
      });
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Forecast Controls</h3>

      <div className="flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={loadingCats}
          >
            {loadingCats ? (
              <option>Loading…</option>
            ) : (
              categories.map(c => <option key={c} value={c}>{c}</option>)
            )}
          </select>
        </div>

        <div className="w-full lg:w-40">
          <label className="block text-sm font-medium text-gray-700 mb-2">Horizon (months)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="w-full lg:w-auto">
          <button
            onClick={handleTrain}
            disabled={trainStatus.loading || loadingCats}
            className="w-full lg:w-auto px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {trainStatus.loading ? "Training…" : "Train Model"}
          </button>
        </div>
      </div>

      {trainStatus.message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${trainStatus.message.includes('failed') || trainStatus.message.includes('Train failed')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
          {trainStatus.message}
        </div>
      )}
    </div>
  );
}