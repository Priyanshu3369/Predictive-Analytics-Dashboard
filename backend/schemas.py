from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Sale(BaseModel):
    order_date: datetime
    time: str
    aging: Optional[float]
    customer_id: int
    gender: str
    device_type: str
    customer_login_type: str
    product_category: str
    product: str
    sales: float
    quantity: int
    discount: float
    profit: float
    shipping_cost: float
    order_priority: str
    payment_method: str
    sales_per_unit: float
