from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Category, Product, User
from ..schemas import CategoryOut, ProductListOut, ProductOut
from ..utils import serialize_product

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.get("/products", response_model=ProductListOut)
def list_products(
    search: str | None = Query(default=None),
    category: int | None = Query(default=None),
    fabric_type: str | None = Query(default=None),
    min_price: float | None = Query(default=None, gt=0),
    max_price: float | None = Query(default=None, gt=0),
    in_stock_only: bool = Query(default=False),
    featured: bool = Query(default=False),
    sort: str = Query(default="featured", pattern="^(featured|newest|price_asc|price_desc|name)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=60),
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.supplier).selectinload(User.supplier_profile),
    )
    query = query.filter(Product.is_active.is_(True))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
                Product.fabric_type.ilike(term),
            )
        )
    if category:
        query = query.filter(Product.category_id == category)
    if fabric_type:
        query = query.filter(Product.fabric_type.ilike(f"%{fabric_type.strip()}%"))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if in_stock_only:
        query = query.filter(Product.stock > 0)
    if featured:
        query = query.filter(Product.is_featured.is_(True))

    total = query.count()

    order_map = {
        "featured": (Product.is_featured.desc(), Product.created_at.desc()),
        "newest": (Product.created_at.desc(),),
        "price_asc": (Product.price.asc(),),
        "price_desc": (Product.price.desc(),),
        "name": (Product.name.asc(),),
    }
    query = query.order_by(*order_map[sort])

    products = query.offset((page - 1) * page_size).limit(page_size).all()
    return ProductListOut(
        items=[serialize_product(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/products/fabric-types")
def fabric_types(db: Session = Depends(get_db)):
    rows = (
        db.query(Product.fabric_type)
        .filter(Product.is_active.is_(True))
        .distinct()
        .order_by(Product.fabric_type)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.supplier).selectinload(User.supplier_profile),
        )
        .filter(Product.id == product_id)
        .first()
    )
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(product)
