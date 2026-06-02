from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Product ──────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    quantity_in_stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[float] = Field(None, gt=0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)


class ProductResponse(BaseModel):
    id: str
    name: str
    sku: str
    price: float
    quantity_in_stock: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Customer ─────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=50)


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=1, max_length=50)


class CustomerResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Order ────────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: str
    items: list[OrderItemCreate]

    @model_validator(mode="after")
    def ensure_items_not_empty(self):
        if not self.items:
            raise ValueError("Order must contain at least one item")
        return self


class OrderItemResponse(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    total_amount: float
    status: str
    created_at: datetime
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}
