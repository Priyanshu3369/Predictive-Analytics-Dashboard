# from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
# from fastapi.middleware.cors import CORSMiddleware
# from typing import Optional, List, Dict, Any
# import pandas as pd
# import numpy as np
# import os
# from prophet import Prophet  # type: ignore
# import joblib
# import asyncio
# from functools import lru_cache
# from datetime import datetime, timedelta
# import logging

# from db import db 

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # ---------------- FASTAPI APP ---------------- #
# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#     allow_headers=["*"],
#     expose_headers=["*"]
# )

# # ---------------- DATABASE ---------------- #
# sales_collection = db["sales"]

# MODELS_DIR = "models"
# os.makedirs(MODELS_DIR, exist_ok=True)

# # ---------------- CACHING ---------------- #
# class DataCache:
#     def __init__(self, ttl_seconds: int = 300):
#         self.cache: Dict[str, Dict[str, Any]] = {}
#         self.ttl = ttl_seconds
    
#     def get(self, key: str) -> Optional[Any]:
#         if key in self.cache:
#             data, timestamp = self.cache[key]['data'], self.cache[key]['timestamp']
#             if datetime.now() - timestamp < timedelta(seconds=self.ttl):
#                 return data
#             else:
#                 del self.cache[key]
#         return None
    
#     def set(self, key: str, data: Any):
#         self.cache[key] = {
#             'data': data,
#             'timestamp': datetime.now()
#         }
    
#     def clear(self):
#         self.cache.clear()

# data_cache = DataCache()

# # ---------------- WEBSOCKET MANAGER ---------------- #
# class ConnectionManager:
#     def __init__(self):
#         self.active_connections: List[WebSocket] = []

#     async def connect(self, websocket: WebSocket):
#         await websocket.accept()
#         self.active_connections.append(websocket)

#     def disconnect(self, websocket: WebSocket):
#         if websocket in self.active_connections:
#             self.active_connections.remove(websocket)

#     async def send_personal_message(self, message: dict, websocket: WebSocket):
#         try:
#             await websocket.send_json(message)
#         except Exception as e:
#             logger.error(f"Error sending message: {e}")
#             self.disconnect(websocket)

#     async def broadcast(self, message: dict):
#         disconnected = []
#         for connection in self.active_connections:
#             try:
#                 await connection.send_json(message)
#             except Exception as e:
#                 logger.error(f"Error broadcasting: {e}")
#                 disconnected.append(connection)
#         for conn in disconnected:
#             self.disconnect(conn)

# manager = ConnectionManager()

# # ---------------- OPTIMIZED HELPERS ---------------- #
# async def load_cleaned_optimized() -> pd.DataFrame:
#     """Optimized data loading with caching and efficient queries"""
#     cache_key = "cleaned_data"
#     cached_data = data_cache.get(cache_key)
    
#     if cached_data is not None:
#         logger.info("Using cached data")
#         return cached_data
    
#     logger.info("Loading data from database")
    
#     projection = {
#         "_id": 0,
#         "Order_Date": 1,
#         "Sales": 1,
#         "Profit": 1,
#         "Discount": 1,
#         "Product_Category": 1,
#         "Gender": 1,
#         "Payment_method": 1,
#     }
    
#     cursor = sales_collection.find({}, projection)
#     docs = await cursor.to_list(length=None)

#     if not docs:
#         raise HTTPException(status_code=404, detail="No sales data found")

#     df = pd.DataFrame(docs)
    
#     df["Order_Date"] = pd.to_datetime(df["Order_Date"], format='%Y-%m-%d', errors='coerce')
    
#     data_cache.set(cache_key, df)
#     logger.info(f"Loaded and cached {len(df)} records")
    
#     return df

# @lru_cache(maxsize=128)
# def get_monthly_aggregation_cached(cache_key: str) -> pd.DataFrame:
#     """LRU cached monthly aggregations"""
#     cached_result = data_cache.get(f"monthly_{cache_key}")
#     return cached_result

# async def prepare_monthly_series_optimized(df: pd.DataFrame, category: Optional[str] = None) -> pd.DataFrame:
#     """Optimized monthly series preparation with caching"""
#     cache_key = f"monthly_series_{category or 'All'}"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df_work = df.copy()
    
#     df_work["month"] = df_work["Order_Date"].dt.to_period("M").dt.to_timestamp()
    
#     if category and category != "All":
#         df_work = df_work[df_work["Product_Category"] == category]
    
#     monthly = df_work.groupby("month", as_index=False)["Sales"].sum()
#     monthly.columns = ["ds", "y"]
    
#     data_cache.set(cache_key, monthly)
    
#     return monthly

# def model_path_for(category: str) -> str:
#     """Get model path for category"""
#     safe = category.replace(" ", "_").replace("/", "_")
#     return os.path.join(MODELS_DIR, f"prophet_sales_{safe}.pkl")

# # ---------------- BACKGROUND TASKS ---------------- #
# async def train_model_background(category: str, df: pd.DataFrame):
#     """Background task for model training"""
#     try:
#         await manager.broadcast({"status": "training_started", "category": category})
        
#         ts = await prepare_monthly_series_optimized(df, category)
#         if len(ts) < 6:
#             await manager.broadcast({
#                 "status": "training_failed", 
#                 "category": category,
#                 "error": "Not enough data"
#             })
#             return
#         m = Prophet(
#             yearly_seasonality=True, 
#             weekly_seasonality=False, 
#             daily_seasonality=False,
#             uncertainty_samples=100
#         )
#         m.fit(ts)
        
#         p = model_path_for(category)
#         joblib.dump(m, p)
        
#         await manager.broadcast({
#             "status": "training_completed", 
#             "category": category, 
#             "months_trained": len(ts)
#         })
        
#     except Exception as e:
#         logger.error(f"Background training failed: {e}")
#         await manager.broadcast({
#             "status": "training_failed", 
#             "category": category,
#             "error": str(e)
#         })

# # ---------------- WEBSOCKET ---------------- #
# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     await manager.connect(websocket)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             await manager.send_personal_message(
#                 {"message": f"You said: {data}"}, websocket
#             )
#     except WebSocketDisconnect:
#         manager.disconnect(websocket)
#     except Exception as e:
#         logger.error(f"WebSocket error: {e}")
#         manager.disconnect(websocket)

# # ---------------- OPTIMIZED ROUTES ---------------- #
# @app.get("/")
# def root():
#     return {"message": "E-commerce Predictive Analytics API is running 🚀"}

# @app.get("/data")
# async def get_sample_data():
#     """Get sample data with caching"""
#     cache_key = "sample_data"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
#     result = df.head(10).to_dict(orient="records")
#     data_cache.set(cache_key, result)
#     return result

# @app.get("/summary")
# async def get_summary():
#     """Get summary statistics with caching"""
#     cache_key = "summary_stats"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
    
#     result = {
#         "total_sales": float(df["Sales"].sum().round(2)),
#         "total_profit": float(df["Profit"].sum().round(2)),
#         "total_orders": int(df.shape[0]),
#         "avg_discount": float(df["Discount"].mean().round(2)),
#     }
    
#     data_cache.set(cache_key, result)
#     return result

# @app.get("/timeseries")
# async def get_timeseries():
#     """Get time series data with caching"""
#     cache_key = "timeseries_monthly"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
    
#     df['period'] = df['Order_Date'].dt.to_period('M')
#     monthly = df.groupby('period').agg({
#         'Sales': 'sum',
#         'Profit': 'sum'
#     }).reset_index()
    
#     monthly['Order_Date'] = monthly['period'].astype(str)
#     monthly = monthly.drop('period', axis=1)
    
#     result = monthly.to_dict(orient="records")
#     data_cache.set(cache_key, result)
#     return result

# @app.get("/sales_by_category")
# async def sales_by_category():
#     """Get sales by category with caching"""
#     cache_key = "sales_by_category"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
#     grouped = df.groupby("Product_Category", as_index=False)["Sales"].sum()
    
#     result = grouped.to_dict(orient="records")
#     data_cache.set(cache_key, result)
#     return result

# @app.get("/sales_by_gender")
# async def sales_by_gender():
#     """Get sales by gender with caching"""
#     cache_key = "sales_by_gender"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
#     grouped = df.groupby("Gender", as_index=False)["Sales"].sum()
    
#     result = grouped.to_dict(orient="records")
#     data_cache.set(cache_key, result)
#     return result

# @app.get("/payment_methods")
# async def payment_methods():
#     """Get payment methods distribution with caching"""
#     cache_key = "payment_methods"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
#     grouped = df["Payment_method"].value_counts().reset_index()
#     grouped.columns = ["Payment_method", "Count"]
    
#     result = grouped.to_dict(orient="records")
#     data_cache.set(cache_key, result)
#     return result

# @app.get("/profit_margin")
# async def profit_margin():
#     """Get profit margins with caching"""
#     cache_key = "profit_margins"
#     cached_result = data_cache.get(cache_key)
    
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
    
#     df_calc = df.copy()
#     df_calc["Profit_Margin"] = df_calc["Profit"] / df_calc["Sales"]
#     grouped = df_calc.groupby("Product_Category", as_index=False)["Profit_Margin"].mean()
    
#     result = grouped.to_dict(orient="records")
#     data_cache.set(cache_key, result)
#     return result

# @app.post("/train_forecast")
# async def train_forecast(background_tasks: BackgroundTasks, category: str = Query("All")):
#     """Train forecast model asynchronously"""
#     df = await load_cleaned_optimized()
#     ts = await prepare_monthly_series_optimized(df, category)
    
#     if len(ts) < 6:
#         raise HTTPException(
#             status_code=400,
#             detail="Not enough monthly data to train (need >=6 months).",
#         )
#     background_tasks.add_task(train_model_background, category, df)
    
#     return {
#         "status": "training_queued", 
#         "category": category,
#         "message": "Model training started in background"
#     }

# @app.get("/predict")
# async def predict(horizon: int = Query(3, ge=1, le=60), category: str = Query("All")):
#     """Get predictions with optimized caching"""
#     cache_key = f"predict_{category}_{horizon}"
#     cached_result = data_cache.get(cache_key)
#     if cached_result is not None:
#         return cached_result
    
#     df = await load_cleaned_optimized()
#     ts = await prepare_monthly_series_optimized(df, category)
    
#     if ts.empty:
#         raise HTTPException(status_code=404, detail="No data for requested category")

#     p = model_path_for(category)
#     if os.path.exists(p):
#         model = joblib.load(p)
#     else:
#         if len(ts) < 6:
#             raise HTTPException(
#                 status_code=400, detail="Not enough monthly data to train"
#             )
#         model = Prophet(
#             yearly_seasonality=True, 
#             weekly_seasonality=False, 
#             daily_seasonality=False,
#             uncertainty_samples=100
#         )
#         model.fit(ts)
#         joblib.dump(model, p)
#     future = model.make_future_dataframe(periods=horizon, freq="MS")
#     forecast = model.predict(future)
    
#     out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
#     actuals = ts.set_index("ds")["y"]
#     out["actual"] = actuals.reindex(out["ds"]).values
#     out = out.replace({np.nan: None})
#     out["ds"] = out["ds"].dt.strftime("%Y-%m-%d")
    
#     result = {
#         "category": category,
#         "model_path": p if os.path.exists(p) else None,
#         "horizon_months": horizon,
#         "series": out.to_dict(orient="records"),
#     }
#     data_cache.set(cache_key, result)
#     return result

# # ---------------- CACHE MANAGEMENT ---------------- #
# @app.post("/clear_cache")
# async def clear_cache():
#     """Clear all cached data"""
#     data_cache.clear()
#     return {"message": "Cache cleared successfully"}

# @app.get("/health")
# async def health_check():
#     """Health check endpoint"""
#     return {
#         "status": "healthy",
#         "cache_size": len(data_cache.cache),
#         "active_connections": len(manager.active_connections)
#     }





















from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import logging
import asyncio

# Add logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- WEBSOCKET MANAGER ---------------- #
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

# Create global manager instance
manager = ConnectionManager()

# ---------------- WEBSOCKET ENDPOINT ---------------- #

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import numpy as np
import os
import json
import asyncio
from typing import List
from prophet import Prophet
import joblib
from database import AsyncSessionLocal
from database import get_session
from models import Sale

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for messages
            data = await websocket.receive_text()
            # You can handle incoming messages here if needed
            logger.info(f"Received WebSocket message: {data}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# ---------------- UPDATE TRAINING FUNCTION TO USE WEBSOCKET ---------------- #
async def train_model_background(category: str):
    """Background task for model training with WebSocket updates"""
    try:
        await manager.broadcast({
            "status": "training_started", 
            "category": category,
            "message": f"Training started for {category}"
        })
        
        # Create a new session for the background task
        async with AsyncSessionLocal() as session:
            ts = await monthly_series(session, category)
            
            if ts.empty:
                await manager.broadcast({
                    "status": "training_failed", 
                    "category": category,
                    "error": "No data available for training"
                })
                return
                
            if len(ts) < 6:
                await manager.broadcast({
                    "status": "training_failed", 
                    "category": category,
                    "error": "Not enough data (need >=6 months)"
                })
                return
            
            # Ensure no timezone information remains
            ts['ds'] = pd.to_datetime(ts['ds']).dt.tz_localize(None)
            
            # Drop any NaN values
            ts = ts.dropna()
            
            m = Prophet(
                yearly_seasonality=True, 
                weekly_seasonality=False, 
                daily_seasonality=False,
                uncertainty_samples=100
            )
            m.fit(ts)
            
            p = model_path_for(category)
            joblib.dump(m, p)
            
            await manager.broadcast({
                "status": "training_completed", 
                "category": category, 
                "months_trained": len(ts),
                "message": f"Training completed for {category} with {len(ts)} months of data"
            })
        
    except Exception as e:
        logger.error(f"Background training failed: {e}")
        await manager.broadcast({
            "status": "training_failed", 
            "category": category,
            "error": str(e),
            "message": f"Training failed for {category}: {str(e)}"
        })


MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

def model_path_for(category: str) -> str:
    safe = (category or "All").replace(" ", "_").replace("/", "_")
    return os.path.join(MODELS_DIR, f"prophet_sales_{safe}.pkl")

# ---------------- HELPERS ---------------- #
async def load_df(session: AsyncSession) -> pd.DataFrame:
    stmt = select(Sale)
    res = await session.execute(stmt)
    rows = res.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="No sales data found")

    df = pd.DataFrame([{
        "Order_Date": r.order_date,
        "Sales": r.sales,
        "Profit": r.profit,
        "Discount": r.discount,
        "Product_Category": r.product_category,
        "Gender": r.gender,
        "Payment_method": r.payment_method,
    } for r in rows])
    df["Order_Date"] = pd.to_datetime(df["Order_Date"], errors="coerce")
    return df

async def monthly_series(session: AsyncSession, category: str | None):
    month = func.date_trunc("month", Sale.order_date).label("ds")
    stmt = select(month, func.sum(Sale.sales).label("y")).group_by(month).order_by(month)

    if category and category != "All":
        stmt = stmt.where(Sale.product_category == category)

    res = await session.execute(stmt)
    rows = res.all()
    
    if not rows:
        return pd.DataFrame(columns=["ds", "y"])
    
    df = pd.DataFrame(rows, columns=["ds", "y"])
    
    # Remove timezone information from datetime column
    if not df.empty and hasattr(df['ds'], 'dt'):
        df['ds'] = df['ds'].dt.tz_localize(None)  # Remove timezone info
    
    return df

# ---------------- ROUTES ---------------- #
@app.get("/")
def root():
    return {"message": "E-commerce Predictive Analytics API with PostgreSQL 🚀"}

@app.get("/data")
async def get_sample_data(session: AsyncSession = Depends(get_session)):
    df = await load_df(session)
    return df.head(10).to_dict(orient="records")

@app.get("/summary")
async def get_summary(session: AsyncSession = Depends(get_session)):
    df = await load_df(session)
    return {
        "total_sales": float(df["Sales"].sum().round(2)),
        "total_profit": float(df["Profit"].sum().round(2)),
        "total_orders": int(df.shape[0]),
        "avg_discount": float(df["Discount"].mean().round(2)),
    }

@app.get("/sales_by_category")
async def sales_by_category(session: AsyncSession = Depends(get_session)):
    stmt = select(Sale.product_category, func.sum(Sale.sales)) \
            .group_by(Sale.product_category)
    res = await session.execute(stmt)
    return [{"Product_Category": r[0], "Sales": float(r[1])} for r in res.all()]

@app.get("/sales_by_gender")
async def sales_by_gender(session: AsyncSession = Depends(get_session)):
    stmt = select(Sale.gender, func.sum(Sale.sales)).group_by(Sale.gender)
    res = await session.execute(stmt)
    return [{"Gender": r[0], "Sales": float(r[1])} for r in res.all()]

@app.get("/payment_methods")
async def payment_methods(session: AsyncSession = Depends(get_session)):
    stmt = select(Sale.payment_method, func.count()).group_by(Sale.payment_method)
    res = await session.execute(stmt)
    return [{"Payment_method": r[0], "Count": int(r[1])} for r in res.all()]

@app.get("/timeseries")
async def get_timeseries(
    category: str = Query("All"),
    session: AsyncSession = Depends(get_session)
):
    """Get time series data for sales over time"""
    try:
        ts = await monthly_series(session, category)
        if ts.empty:
            raise HTTPException(status_code=404, detail="No data for requested category")
        
        # Convert to the format expected by the frontend
        ts["ds"] = pd.to_datetime(ts["ds"])
        ts["ds"] = ts["ds"].dt.strftime("%Y-%m-%d")
        
        return {
            "category": category,
            "data": ts.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching timeseries data: {str(e)}")

@app.get("/categories")
async def get_categories(session: AsyncSession = Depends(get_session)):
    """Get all available product categories"""
    stmt = select(Sale.product_category).distinct()
    res = await session.execute(stmt)
    categories = [row[0] for row in res.all()]
    return {"categories": ["All"] + categories}

@app.post("/train_forecast")
async def train_forecast(
    background_tasks: BackgroundTasks,
    category: str = Query("All"),
    session: AsyncSession = Depends(get_session)
):
    # First validate that we have enough data
    ts = await monthly_series(session, category)
    
    if len(ts) < 6:
        raise HTTPException(
            status_code=400,
            detail="Not enough monthly data to train (need >=6 months).",
        )
    
    # Use the WebSocket-enabled background task
    # Note: We don't pass the session since the background task creates its own
    background_tasks.add_task(train_model_background, category)
    
    return {
        "status": "training_queued", 
        "category": category,
        "message": "Model training started in background. WebSocket updates will be sent."
    }

@app.get("/predict")
async def predict(
    horizon: int = Query(3, ge=1, le=60),
    category: str = Query("All"),
    session: AsyncSession = Depends(get_session)
):
    ts = await monthly_series(session, category)
    if ts.empty:
        raise HTTPException(status_code=404, detail="No data for requested category")

    # Remove timezone information
    ts['ds'] = pd.to_datetime(ts['ds']).dt.tz_localize(None)
    ts = ts.dropna()

    path = model_path_for(category)
    if os.path.exists(path):
        model = joblib.load(path)
    else:
        if len(ts) < 6:
            raise HTTPException(status_code=400, detail="Not enough data to train")
        model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
        model.fit(ts)
        joblib.dump(model, path)

    # Forecast
    future = model.make_future_dataframe(periods=horizon, freq="MS")
    forecast = model.predict(future)

    # Build output
    out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    actuals = ts.set_index("ds")["y"]

    # Add actual values only where available
    out["actual"] = actuals.reindex(out["ds"]).values

    # Replace NaNs for JSON safety and ensure no timezone in datetime
    out = out.replace({np.nan: None})
    out["ds"] = pd.to_datetime(out["ds"]).dt.tz_localize(None).dt.strftime("%Y-%m-%d")

    return {
        "category": category,
        "horizon": horizon,
        "series": out.to_dict(orient="records"),
        "columns": ["ds", "actual", "yhat", "yhat_lower", "yhat_upper"]
    }
    
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_websocket_connections": len(manager.active_connections)
    }