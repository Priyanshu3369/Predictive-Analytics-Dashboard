import pandas as pd
import asyncio
from db import db

async def import_csv():
    collection = db["sales"]
    df = pd.read_csv("data/cleaned.csv", parse_dates=["Order_Date"])
    records = df.to_dict("records")
    await collection.delete_many({})
    await collection.insert_many(records)
    print(f"Inserted {len(records)} records")

if __name__ == "__main__":
    asyncio.run(import_csv())
