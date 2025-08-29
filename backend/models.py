# models.py
from datetime import date, time
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Float, Integer, Date, Time
from database import Base

class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    time: Mapped[time | None] = mapped_column(Time)
    aging: Mapped[float | None] = mapped_column(Float)
    customer_id: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_login_type: Mapped[str] = mapped_column(String(50), nullable=False)
    product_category: Mapped[str] = mapped_column(String(100), nullable=False)
    product: Mapped[str] = mapped_column(String(200), nullable=False)
    sales: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    discount: Mapped[float] = mapped_column(Float, nullable=False)
    profit: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_cost: Mapped[float] = mapped_column(Float, nullable=False)
    order_priority: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    sales_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
