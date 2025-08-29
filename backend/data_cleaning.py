import pandas as pd

def clean_and_save_data():
    # Load dataset
    df = pd.read_csv("data/data.csv")

    # ✅ 1. Handle missing values
    df = df.dropna(how="all")
    df = df.fillna({
        "Discount": 0,
        "Profit": 0,
        "Shipping_Cost": df["Shipping_Cost"].mean()
    })

    # ✅ 2. Convert data types
    df["Order_Date"] = pd.to_datetime(df["Order_Date"])
    df["Time"] = pd.to_datetime(df["Time"], format="%H:%M:%S").dt.time

    # ✅ 3. Encode categorical columns as category dtype
    categorical_cols = ["Gender", "Device_Type", "Customer_Login_type",
                        "Product_Category", "Order_Priority", "Payment_method"]
    for col in categorical_cols:
        df[col] = df[col].astype("category")

    # ✅ 4. Feature Engineering
    df["Sales_per_Unit"] = df["Sales"] / df["Quantity"]

    # ✅ 5. Save cleaned dataset locally
    df.to_csv("data/ecommerce_cleaned.csv", index=False)

    return df

if __name__ == "__main__":
    cleaned_df = clean_and_save_data()
    print("✅ Data cleaned & saved as ecommerce_cleaned.csv")
    print(cleaned_df.head())
