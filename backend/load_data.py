# load_data.py
import pandas as pd
import asyncio
import math
from datetime import datetime
from database import engine, AsyncSessionLocal
from models import Sale
from sqlalchemy.ext.asyncio import AsyncSession

CSV_FILE = "./data/cleaned.csv"

def safe_string_convert(value, default="Unknown"):
    """Safely convert value to string, handling nan values"""
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)) or value == "" or value is None:
        return default
    return str(value).strip()

def safe_float_convert(value, default=0.0, required=False):
    """Safely convert value to float, handling nan values"""
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        if required:
            return None  # Will cause row to be skipped
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        if required:
            return None
        return default

def safe_int_convert(value, default=0, required=False):
    """Safely convert value to int, handling nan values"""
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        if required:
            return None
        return default
    try:
        return int(float(value))  # Convert to float first to handle decimal strings
    except (ValueError, TypeError):
        if required:
            return None
        return default

def safe_datetime_convert(value, time_format=False):
    """Safely convert value to datetime, handling nan values"""
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        if time_format:
            return pd.to_datetime(str(value)).time()
        else:
            return pd.to_datetime(value).date()
    except (ValueError, TypeError):
        return None

async def load_csv_to_db():
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"📊 Loaded CSV with {len(df)} rows")
        
        # Rename columns to match the database schema
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

        # Display column info for debugging
        print("📋 CSV Columns:", df.columns.tolist())
        print("🔍 Sample data types:")
        print(df.dtypes.head(10))

        async with AsyncSessionLocal() as session:  # type: AsyncSession
            objs = []
            skipped_rows = 0
            
            for idx, row in df.iterrows():
                try:
                    # Convert and validate required fields
                    order_date = safe_datetime_convert(row["order_date"])
                    customer_id = safe_int_convert(row["customer_id"], required=True)
                    sales_value = safe_float_convert(row["sales"], required=True)
                    quantity_value = safe_int_convert(row["quantity"], required=True)
                    discount_value = safe_float_convert(row["discount"], required=True)
                    profit_value = safe_float_convert(row["profit"], required=True)
                    shipping_cost_value = safe_float_convert(row["shipping_cost"], required=True)
                    sales_per_unit_value = safe_float_convert(row["sales_per_unit"], required=True)
                    
                    # Check if any required field is None (failed conversion)
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
                    
                    # Process in batches to avoid memory issues
                    if len(objs) >= 1000:
                        session.add_all(objs)
                        await session.commit()
                        print(f"✅ Processed batch: {len(objs)} rows")
                        objs = []
                        
                except Exception as e:
                    print(f"❌ Error processing row {idx}: {str(e)}")
                    print(f"   Row data: {dict(row)}")
                    skipped_rows += 1
                    continue

            # Insert remaining objects
            if objs:
                session.add_all(objs)
                await session.commit()
                print(f"✅ Processed final batch: {len(objs)} rows")

            total_processed = len(df) - skipped_rows
            print(f"\n🎉 Data loading completed!")
            print(f"   Total rows in CSV: {len(df)}")
            print(f"   Successfully inserted: {total_processed}")
            print(f"   Skipped rows: {skipped_rows}")
            
    except FileNotFoundError:
        print(f"❌ Error: CSV file '{CSV_FILE}' not found")
    except pd.errors.EmptyDataError:
        print(f"❌ Error: CSV file '{CSV_FILE}' is empty")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(load_csv_to_db())