from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import require_role
from ..models import CartItem, Product, ProductImage, User
from ..schemas import CartItemIn, CartItemOut, CartOut
from ..utils import serialize_product

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _load_cart_items(db: Session, user: User) -> list[CartItem]:
    return (
        db.query(CartItem)
        .options(selectinload(CartItem.product).selectinload(Product.images))
        .filter(CartItem.buyer_id == user.id)
        .order_by(CartItem.created_at)
        .all()
    )


def _to_cart_out(items: list[CartItem]) -> CartOut:
    out_items: list[CartItemOut] = []
    subtotal = Decimal("0")
    for item in items:
        product = item.product
        if not product:
            continue
        primary = next((img for img in product.images if img.is_primary), None)
        image_url = primary.url if primary else (product.images[0].url if product.images else None)
        supplier_name = (
            product.supplier.supplier_profile.business_name
            if product.supplier and product.supplier.supplier_profile
            else "Supplier"
        )
        out_items.append(
            CartItemOut(
                product_id=product.id,
                product_name=product.name,
                unit_price=product.price,
                quantity=item.quantity,
                image_url=image_url,
                stock=product.stock,
                supplier_name=supplier_name,
            )
        )
        subtotal += product.price * item.quantity
    return CartOut(
        items=out_items,
        total_items=sum(i.quantity for i in out_items),
        subtotal=subtotal,
    )


@router.get("", response_model=CartOut)
def get_cart(user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    return _to_cart_out(_load_cart_items(db, user))


@router.post("/items", response_model=CartOut, status_code=201)
def add_to_cart(
    payload: CartItemIn,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(selectinload(Product.images))
        .filter(Product.id == payload.product_id, Product.is_active.is_(True))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    item = (
        db.query(CartItem)
        .filter(CartItem.buyer_id == user.id, CartItem.product_id == payload.product_id)
        .first()
    )
    new_quantity = (item.quantity if item else 0) + payload.quantity
    if new_quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for {product.name} — only {product.stock} units available",
        )
    if item:
        item.quantity = min(new_quantity, 999)
    else:
        item = CartItem(buyer_id=user.id, product_id=payload.product_id, quantity=payload.quantity)
        db.add(item)
    db.commit()
    return _to_cart_out(_load_cart_items(db, user))


@router.patch("/items/{product_id}", response_model=CartOut)
def update_quantity(
    product_id: int,
    payload: CartItemIn,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    item = (
        db.query(CartItem)
        .filter(CartItem.buyer_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")
    product = db.get(Product, item.product_id)
    if product and payload.quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for {product.name} — only {product.stock} units available",
        )
    item.quantity = payload.quantity
    db.commit()
    return _to_cart_out(_load_cart_items(db, user))


@router.delete("/items/{product_id}", response_model=CartOut)
def remove_item(
    product_id: int,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    item = (
        db.query(CartItem)
        .filter(CartItem.buyer_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return _to_cart_out(_load_cart_items(db, user))


@router.delete("", status_code=204)
def clear_cart(user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    db.query(CartItem).filter(CartItem.buyer_id == user.id).delete()
    db.commit()
