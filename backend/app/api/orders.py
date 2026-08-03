from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import require_role
from ..models import CartItem, Order, OrderItem, Product, ProductImage, User
from ..schemas import OrderIn, OrderOut, OrderStatusUpdate
from ..utils import serialize_order

router = APIRouter(prefix="/api", tags=["orders"])

ORDER_STATUS_FLOW = {
    "pending": {"accepted", "cancelled"},
    "accepted": {"preparing", "cancelled"},
    "preparing": {"ready_for_dispatch", "cancelled"},
    "ready_for_dispatch": {"completed"},
    "completed": set(),
    "cancelled": set(),
}


@router.post("/checkout", response_model=list[OrderOut], status_code=201)
def checkout(
    payload: OrderIn,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    cart_items = (
        db.query(CartItem)
        .options(
            selectinload(CartItem.product)
            .selectinload(Product.images),
            selectinload(CartItem.product)
            .selectinload(Product.supplier)
            .selectinload(User.supplier_profile),
        )
        .filter(CartItem.buyer_id == user.id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    for item in cart_items:
        product = item.product
        if item.quantity > product.stock:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name} — only {product.stock} units available",
            )

    by_supplier: dict[int, list[CartItem]] = {}
    for item in cart_items:
        by_supplier.setdefault(item.product.supplier_id, []).append(item)

    created_orders: list[Order] = []
    for supplier_id, items in by_supplier.items():
        total = Decimal("0")
        order_items = []
        for item in items:
            product = item.product
            unit_price = product.price * item.quantity
            primary = next((img for img in product.images if img.is_primary), None)
            order_items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    quantity=item.quantity,
                    unit_price=product.price,
                    image_url=primary.url if primary else (product.images[0].url if product.images else None),
                )
            )
            total += unit_price
            product.stock -= item.quantity

        order = Order(
            buyer_id=user.id,
            supplier_id=supplier_id,
            status="pending",
            total=total,
            shipping_name=payload.shipping_name,
            shipping_phone=payload.shipping_phone,
            shipping_address=payload.shipping_address,
            shipping_city=payload.shipping_city,
            shipping_country=payload.shipping_country,
            notes=payload.notes,
            items=order_items,
        )
        db.add(order)
        created_orders.append(order)

    db.query(CartItem).filter(CartItem.buyer_id == user.id).delete()
    db.commit()

    for order in created_orders:
        db.refresh(order)
    return [
        serialize_order(
            o,
            supplier_name=o.supplier.supplier_profile.business_name
            if o.supplier and o.supplier.supplier_profile
            else "Supplier",
        )
        for o in created_orders
    ]


@router.get("/buyer/orders", response_model=list[OrderOut])
def buyer_orders(
    user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)
):
    orders = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.supplier).selectinload(User.supplier_profile),
        )
        .filter(Order.buyer_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        serialize_order(
            o,
            supplier_name=o.supplier.supplier_profile.business_name
            if o.supplier and o.supplier.supplier_profile
            else "Supplier",
        )
        for o in orders
    ]


@router.get("/supplier/orders", response_model=list[OrderOut])
def supplier_orders(
    user: User = Depends(require_role("supplier")), db: Session = Depends(get_db)
):
    orders = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.buyer),
        )
        .filter(Order.supplier_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        serialize_order(o, buyer_name=o.buyer.full_name if o.buyer else "")
        for o in orders
    ]


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    user: User = Depends(require_role("buyer", "supplier")),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.buyer),
            selectinload(Order.supplier).selectinload(User.supplier_profile),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.buyer_id != user.id and order.supplier_id != user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    return serialize_order(
        order,
        supplier_name=order.supplier.supplier_profile.business_name
        if order.supplier and order.supplier.supplier_profile
        else "",
        buyer_name=order.buyer.full_name if order.buyer else "",
    )


@router.patch("/supplier/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.buyer),
        )
        .filter(Order.id == order_id, Order.supplier_id == user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    allowed = ORDER_STATUS_FLOW.get(order.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change order status from '{order.status}' to '{payload.status}'",
        )
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return serialize_order(order, buyer_name=order.buyer.full_name if order.buyer else "")
