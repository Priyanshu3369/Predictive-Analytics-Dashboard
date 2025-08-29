import os
import json
import logging
import asyncio
import asyncpg
import pandas as pd
import numpy as np
import joblib
from typing import List, Optional
from contextlib import asynccontextmanager
from datetime import date, time as dtime

from fastapi import (
    FastAPI, WebSocket, WebSocketDisconnect,
    HTTPException, Query, BackgroundTasks, Depends, Path
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from prophet import Prophet  # type: ignore
from pydantic import BaseModel

from database import AsyncSessionLocal, get_session
from models import Sale

# --------------------------------------------------
# Logging setup
# --------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# WebSocket Manager
# --------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"✅ New WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"❌ WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

async def broadcast_data_update():
    await manager.broadcast({
        "type": "data_updated",
        "message": "Database data updated. Refreshing dashboard data..."
    })

# --------------------------------------------------
# Pydantic models
# --------------------------------------------------
class SaleCreate(BaseModel):
    order_date: date
    time: Optional[dtime] = None
    aging: Optional[float] = 0.0
    customer_id: int
    gender: Optional[str] = "Unknown"
    device_type: Optional[str] = "Unknown"
    customer_login_type: Optional[str] = "Unknown"
    product_category: Optional[str] = "Unknown"
    product: Optional[str] = "Unknown"
    sales: float
    quantity: int
    discount: float
    profit: float
    shipping_cost: float
    order_priority: Optional[str] = "Medium"
    payment_method: Optional[str] = "Unknown"
    sales_per_unit: float

class SaleUpdate(BaseModel):
    order_date: Optional[date] = None
    time: Optional[dtime] = None
    aging: Optional[float] = None
    customer_id: Optional[int] = None
    gender: Optional[str] = None
    device_type: Optional[str] = None
    customer_login_type: Optional[str] = None
    product_category: Optional[str] = None
    product: Optional[str] = None
    sales: Optional[float] = None
    quantity: Optional[int] = None
    discount: Optional[float] = None
    profit: Optional[float] = None
    shipping_cost: Optional[float] = None
    order_priority: Optional[str] = None
    payment_method: Optional[str] = None
    sales_per_unit: Optional[float] = None

# --------------------------------------------------
# Lifespan (DB LISTEN/NOTIFY)
# --------------------------------------------------
async def notify_handler(conn, pid, channel, payload):
    logger.info(f"🔔 DB Notification: {payload}")
    asyncio.create_task(broadcast_data_update())

@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = await asyncpg.connect(
        user="postgres",
        password="Priyanshu123",
        database="ecom",
        host="localhost",
        port=5432
    )
    await conn.add_listener("sales_changes", notify_handler)
    logger.info("✅ Listening for Postgres NOTIFY events...")

    yield

    await conn.close()
    logger.info("🛑 DB connection closed.")

# --------------------------------------------------
# App initialization
# --------------------------------------------------
app = FastAPI(lifespan=lifespan)

# Enable CORS (for React frontend on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# --------------------------------------------------
# WebSocket endpoint
# --------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep alive (ignore incoming)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --------------------------------------------------
# Helpers
# --------------------------------------------------

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
    if not df.empty and hasattr(df['ds'], 'dt'):
        df['ds'] = df['ds'].dt.tz_localize(None)
    return df

# --------------------------------------------------
# Routes
# --------------------------------------------------
@app.get("/")
def root():
    return {"message": "E-commerce Predictive Analytics API with PostgreSQL 🚀"}

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
    stmt = select(Sale.product_category, func.sum(Sale.sales)).group_by(Sale.product_category)
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

# ---------------- ROUTES (WRITE) ---------------- #
@app.post("/sales", status_code=201)
async def create_sale(payload: SaleCreate, session: AsyncSession = Depends(get_session)):
    """Create a new sale row and broadcast update."""
    sale = Sale(**payload.dict())
    session.add(sale)
    await session.commit()
    await session.refresh(sale)
    await broadcast_data_update()
    return {"status": "ok", "id": sale.id}

@app.put("/sales/{sale_id}")
async def update_sale(
    sale_id: int = Path(..., ge=1),
    payload: SaleUpdate = None,
    session: AsyncSession = Depends(get_session)
):
    """Update a sale row by id and broadcast update."""
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(sale, k, v)

    await session.commit()
    await broadcast_data_update()
    return {"status": "ok", "id": sale_id}

@app.delete("/sales/{sale_id}")
async def delete_sale(sale_id: int, session: AsyncSession = Depends(get_session)):
    """Delete a sale row by id and broadcast update."""
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await session.delete(sale)
    await session.commit()
    await broadcast_data_update()
    return {"status": "ok", "deleted": sale_id}

# ---------------- TRAIN / PREDICT ---------------- #
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
    return {
        "status": "healthy",
        "active_websocket_connections": len(manager.active_connections)
    }