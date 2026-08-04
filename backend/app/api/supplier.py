import os
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..database import get_db
from ..deps import require_role
from ..models import Order, OrderItem, Product, ProductImage, User
from ..schemas import (
    ProductIn,
    ProductListOut,
    ProductOut,
    ProductUpdate,
    SupplierStats,
)
from ..utils import serialize_order, serialize_product

router = APIRouter(prefix="/api/supplier", tags=["supplier"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def _ensure_upload_dir() -> bool:
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        return os.access(UPLOAD_DIR, os.W_OK)
    except OSError:
        return False


@router.get("/dashboard", response_model=SupplierStats)
def dashboard(
    user: User = Depends(require_role("supplier")), db: Session = Depends(get_db)
):
    products = (
        db.query(Product)
        .filter(Product.supplier_id == user.id)
        .order_by(Product.created_at.desc())
        .all()
    )
    total_orders = (
        db.query(Order).filter(Order.supplier_id == user.id).count()
    )
    pending_orders = (
        db.query(Order)
        .filter(Order.supplier_id == user.id, Order.status == "pending")
        .count()
    )
    recent = (
        db.query(Order)
        .options(selectinload(Order.items), selectinload(Order.buyer))
        .filter(Order.supplier_id == user.id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )
    return SupplierStats(
        total_products=len(products),
        active_products=sum(1 for p in products if p.is_active),
        out_of_stock=sum(1 for p in products if p.stock == 0),
        low_stock=sum(1 for p in products if 0 < p.stock <= 10),
        pending_orders=pending_orders,
        total_orders=total_orders,
        recent_orders=[
            serialize_order(o, buyer_name=o.buyer.full_name if o.buyer else "")
            for o in recent
        ],
    )


def _supplier_products_query(db: Session, user: User):
    return db.query(Product).options(
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.supplier).selectinload(User.supplier_profile),
    ).filter(Product.supplier_id == user.id)


@router.get("/products", response_model=ProductListOut)
def supplier_products(
    page: int = 1,
    page_size: int = 24,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    query = _supplier_products_query(db, user)
    total = query.count()
    products = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ProductListOut(
        items=[serialize_product(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductIn,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    if not user.is_onboarded or not user.supplier_profile:
        raise HTTPException(
            status_code=400, detail="Complete supplier onboarding before listing products"
        )
    product = Product(supplier_id=user.id, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.supplier_id == user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.supplier_id == user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    has_orders = (
        db.query(OrderItem.id).filter(OrderItem.product_id == product.id).first()
        is not None
    )
    if has_orders:
        product.is_active = False
        db.commit()
        return serialize_product(product)
    db.delete(product)
    db.commit()
    return Response(status_code=204)


@router.post("/products/{product_id}/images", response_model=ProductOut)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    is_primary: bool = False,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.supplier_id == user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP or GIF images are allowed")

    if not _ensure_upload_dir():
        raise HTTPException(
            status_code=503,
            detail="File storage is unavailable in this deployment",
        )
    ext = os.path.splitext(file.filename or "")[1][:5] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)
    size = 0
    with open(dest, "wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_MB * 1024 * 1024:
                out.close()
                os.remove(dest)
                raise HTTPException(status_code=413, detail="Image too large")
            out.write(chunk)

    from ..models import ProductImage

    image = ProductImage(
        product_id=product.id,
        url=f"{settings.PUBLIC_BASE_URL}/uploads/{filename}",
        is_primary=is_primary,
    )
    db.add(image)
    if is_primary:
        for existing in product.images:
            existing.is_primary = False
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.delete("/products/{product_id}/images/{image_id}", response_model=ProductOut)
def delete_product_image(
    product_id: int,
    image_id: int,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.supplier_id == user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    image = next((img for img in product.images if img.id == image_id), None)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    filename = os.path.basename(image.url)
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    db.delete(image)
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.get("/orders/stats/last7days")
def order_stats_7d(
    user: User = Depends(require_role("supplier")), db: Session = Depends(get_db)
):
    cutoff = datetime.utcnow() - timedelta(days=7)
    rows = (
        db.query(Order)
        .filter(Order.supplier_id == user.id, Order.created_at >= cutoff)
        .all()
    )
    days = {i: {"orders": 0, "revenue": 0.0} for i in range(7)}
    for order in rows:
        delta = (datetime.utcnow() - order.created_at).days
        if 0 <= delta < 7:
            days[6 - delta]["orders"] += 1
            days[6 - delta]["revenue"] += float(order.total)
    return days
