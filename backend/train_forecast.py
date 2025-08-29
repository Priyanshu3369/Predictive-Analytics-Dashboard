# train_prophet.py
import os
import pandas as pd
from prophet import Prophet  # type: ignore
import joblib
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from database import AsyncSessionLocal
from models import Sale

# ---------------- CONFIG ---------------- #
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

def model_path_for(category: str):
    safe = category.replace(" ", "_")
    return os.path.join(MODELS_DIR, f"prophet_sales_{safe}.pkl")

# ---------------- HELPERS ---------------- #
async def load_cleaned(session: AsyncSession) -> pd.DataFrame:
    """Fetch data from PostgreSQL and return as DataFrame."""
    stmt = select(Sale.order_date, Sale.sales, Sale.product_category)
    res = await session.execute(stmt)
    rows = res.all()

    if not rows:
        raise HTTPException(status_code=404, detail="No sales data found")

    df = pd.DataFrame(rows, columns=["Order_Date", "Sales", "Product_Category"])
    df["Order_Date"] = pd.to_datetime(df["Order_Date"])
    return df

def prepare_monthly_series(df: pd.DataFrame, category: str = "All") -> pd.DataFrame:
    """Aggregate monthly sales for Prophet."""
    df = df.copy()
    df["month"] = df["Order_Date"].dt.to_period("M").dt.to_timestamp()
    if category and category != "All":
        df = df[df["Product_Category"] == category]
    monthly = df.groupby("month")["Sales"].sum().reset_index()
    monthly.columns = ["ds", "y"]
    return monthly

# ---------------- TRAINER ---------------- #
async def train_prophet_for_category(category: str = "All"):
    async with AsyncSessionLocal() as session:
        df = await load_cleaned(session)
    ts = prepare_monthly_series(df, category)

    if len(ts) < 6:
        raise ValueError("Not enough monthly points to train a reliable model (need >=6).")

    m = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    m.fit(ts)

    path = model_path_for(category)
    joblib.dump(m, path)
    print(f"✅ Saved model to {path}")
    return path

# ---------------- ENTRY ---------------- #
if __name__ == "__main__":
    asyncio.run(train_prophet_for_category("All"))
