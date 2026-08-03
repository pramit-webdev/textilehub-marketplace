from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Role = Literal["buyer", "supplier"]


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    full_name: str = Field(min_length=1, max_length=120)
    role: Role

    @field_validator("password")
    @classmethod
    def password_not_only_spaces(cls, v: str) -> str:
        if v.strip() != v or len(v.strip()) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_onboarded: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class BuyerProfileIn(BaseModel):
    business_type: str | None = None
    industry: str | None = None
    interested_categories: list[str] = Field(default_factory=list)
    preferred_fabrics: list[str] = Field(default_factory=list)
    typical_order_qty: str | None = None
    budget_range: str | None = None
    company_name: str | None = None
    phone: str | None = None
    country: str | None = None


class BuyerProfileOut(BuyerProfileIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SupplierProfileIn(BaseModel):
    business_name: str = Field(min_length=1, max_length=160)
    business_type: str | None = None
    contact_phone: str | None = None
    business_address: str | None = None
    operating_hours: str | None = None
    product_categories: list[str] = Field(default_factory=list)
    fabric_types: list[str] = Field(default_factory=list)
    min_order_qty: str | None = None
    description: str | None = None
    website: str | None = None


class SupplierProfileOut(SupplierProfileIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    is_primary: bool


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1)
    category_id: int
    fabric_type: str = Field(min_length=1, max_length=80)
    price: Decimal = Field(gt=0)
    moq: int = Field(default=1, ge=1)
    stock: int = Field(default=0, ge=0)
    colors: list[str] = Field(default_factory=list)
    specifications: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    is_featured: bool = False


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=160)
    description: str | None = None
    category_id: int | None = None
    fabric_type: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    moq: int | None = Field(default=None, ge=1)
    stock: int | None = Field(default=None, ge=0)
    colors: list[str] | None = None
    specifications: dict[str, Any] | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    fabric_type: str
    price: Decimal
    moq: int
    stock: int
    colors: list[str]
    specifications: dict[str, Any]
    is_active: bool
    is_featured: bool
    created_at: datetime
    category: CategoryOut | None = None
    supplier: UserOut | None = None
    images: list[ProductImageOut] = []
    supplier_name: str | None = None

    @classmethod
    def from_product(cls, product, supplier_name: str | None = None):
        data = cls.model_validate(product)
        if supplier_name:
            data.supplier_name = supplier_name
        return data


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=999)


class CartItemOut(BaseModel):
    product_id: int
    product_name: str
    unit_price: Decimal
    quantity: int
    image_url: str | None = None
    stock: int
    supplier_name: str


class CartOut(BaseModel):
    items: list[CartItemOut]
    total_items: int
    subtotal: Decimal


class OrderIn(BaseModel):
    shipping_name: str = Field(min_length=1, max_length=160)
    shipping_phone: str | None = None
    shipping_address: str = Field(min_length=3, max_length=255)
    shipping_city: str = Field(min_length=1, max_length=120)
    shipping_country: str = Field(min_length=1, max_length=80)
    notes: str | None = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    image_url: str | None = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    total: Decimal
    shipping_name: str
    shipping_phone: str | None
    shipping_address: str
    shipping_city: str
    shipping_country: str
    notes: str | None
    created_at: datetime
    items: list[OrderItemOut] = []
    supplier_name: str | None = None
    buyer_name: str | None = None


class OrderStatusUpdate(BaseModel):
    status: Literal[
        "pending", "accepted", "preparing", "ready_for_dispatch", "completed", "cancelled"
    ]


class SupplierStats(BaseModel):
    total_products: int
    active_products: int
    out_of_stock: int
    low_stock: int
    pending_orders: int
    total_orders: int
    recent_orders: list[OrderOut] = []


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


class ChatResponse(BaseModel):
    reply: str
    source: str = "ai"


class RecommendationRequest(BaseModel):
    context: str | None = None
    limit: int = Field(default=6, ge=1, le=20)


class CompareRequest(BaseModel):
    product_ids: list[int] = Field(min_length=2, max_length=4)


class ProductQARequest(BaseModel):
    product_id: int
    question: str = Field(min_length=1, max_length=500)


class OnboardAIRequest(BaseModel):
    role: Role
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


class OnboardAIResponse(BaseModel):
    reply: str
    structured: dict[str, Any]
