import pandas as pd
import asyncio
import math
from datetime import datetime
from database import AsyncSessionLocal
from models import Sale
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
import asyncpg

CSV_FILE = "./data/cleaned.csv"

# -------------------- Safe converters -------------------- #
def safe_string_convert(value, default="Unknown"):
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)) or value == "" or value is None:
        return default
    return str(value).strip()

def safe_float_convert(value, default=0.0, required=False):
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None if required else default
    try:
        return float(value)
    except (ValueError, TypeError):
        return None if required else default

def safe_int_convert(value, default=0, required=False):
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None if required else default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None if required else default

def safe_datetime_convert(value, time_format=False):
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        if time_format:
            return pd.to_datetime(str(value)).time()
        else:
            return pd.to_datetime(value).date()
    except (ValueError, TypeError):
        return None

# -------------------- Helpers -------------------- #
async def clear_sales_data(session: AsyncSession):
    """Delete all rows from the Sale table"""
    await session.execute(delete(Sale))
    await session.commit()
    print("🗑️ Cleared all existing sales data")

async def notify_dashboard_refresh():
    """Send a NOTIFY event to Postgres so WebSocket clients refresh"""
    conn = await asyncpg.connect(
        user="postgres",
        password="Priyanshu123",
        database="ecom",
        host="localhost",
        port=5432
    )
    await conn.execute("NOTIFY sales_changes, 'reload';")
    await conn.close()
    print("📢 Sent NOTIFY to refresh dashboard")

# -------------------- Main loader -------------------- #
async def load_csv_to_db():
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"📊 Loaded CSV with {len(df)} rows")

        df.rename(columns={
            "Order_Date": "order_date",
            "Time": "time",
            "Aging": "aging",
            "Customer_Id": "customer_id",
            "Gender": "gender",
            "Device_Type": "device_type",
            "Customer_Login_type": "customer_login_type",
            "Product_Category": "product_category",
            "Product": "product",
            "Sales": "sales",
            "Quantity": "quantity",
            "Discount": "discount",
            "Profit": "profit",
            "Shipping_Cost": "shipping_cost",
            "Order_Priority": "order_priority",
            "Payment_method": "payment_method",
            "Sales_per_Unit": "sales_per_unit"
        }, inplace=True)

        async with AsyncSessionLocal() as session:  # type: AsyncSession
            # Step 1: Clear old data
            await clear_sales_data(session)

            objs = []
            skipped_rows = 0

            for idx, row in df.iterrows():
                try:
                    order_date = safe_datetime_convert(row["order_date"])
                    customer_id = safe_int_convert(row["customer_id"], required=True)
                    sales_value = safe_float_convert(row["sales"], required=True)
                    quantity_value = safe_int_convert(row["quantity"], required=True)
                    discount_value = safe_float_convert(row["discount"], required=True)
                    profit_value = safe_float_convert(row["profit"], required=True)
                    shipping_cost_value = safe_float_convert(row["shipping_cost"], required=True)
                    sales_per_unit_value = safe_float_convert(row["sales_per_unit"], required=True)

                    if (order_date is None or customer_id is None or sales_value is None or 
                        quantity_value is None or discount_value is None or profit_value is None or 
                        shipping_cost_value is None or sales_per_unit_value is None):
                        print(f"⚠️  Skipping row {idx}: Missing required numeric data")
                        skipped_rows += 1
                        continue

                    sale = Sale(
                        order_date=order_date,
                        time=safe_datetime_convert(row["time"], time_format=True),
                        aging=safe_float_convert(row["aging"]),
                        customer_id=customer_id,
                        gender=safe_string_convert(row["gender"], "Unknown"),
                        device_type=safe_string_convert(row["device_type"], "Unknown"),
                        customer_login_type=safe_string_convert(row["customer_login_type"], "Unknown"),
                        product_category=safe_string_convert(row["product_category"], "Unknown"),
                        product=safe_string_convert(row["product"], "Unknown"),
                        sales=sales_value,
                        quantity=quantity_value,
                        discount=discount_value,
                        profit=profit_value,
                        shipping_cost=shipping_cost_value,
                        order_priority=safe_string_convert(row["order_priority"], "Medium"),
                        payment_method=safe_string_convert(row["payment_method"], "Unknown"),
                        sales_per_unit=sales_per_unit_value,
                    )

                    objs.append(sale)

                    if len(objs) >= 1000:
                        session.add_all(objs)
                        await session.commit()
                        print(f"✅ Processed batch: {len(objs)} rows")
                        objs = []

                except Exception as e:
                    print(f"❌ Error processing row {idx}: {str(e)}")
                    skipped_rows += 1
                    continue

            if objs:
                session.add_all(objs)
                await session.commit()
                print(f"✅ Processed final batch: {len(objs)} rows")

            total_processed = len(df) - skipped_rows
            print(f"\n🎉 Data loading completed!")
            print(f"   Total rows in CSV: {len(df)}")
            print(f"   Successfully inserted: {total_processed}")
            print(f"   Skipped rows: {skipped_rows}")

        # Step 2: Notify dashboard after reload
        await notify_dashboard_refresh()

    except FileNotFoundError:
        print(f"❌ Error: CSV file '{CSV_FILE}' not found")
    except pd.errors.EmptyDataError:
        print(f"❌ Error: CSV file '{CSV_FILE}' is empty")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(load_csv_to_db())
