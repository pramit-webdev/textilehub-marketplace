from .models import Order, Product
from .schemas import OrderOut, ProductOut


def serialize_product(product: Product) -> ProductOut:
    data = ProductOut.model_validate(product)
    data.supplier_name = (
        product.supplier.supplier_profile.business_name
        if product.supplier and product.supplier.supplier_profile
        else product.supplier.full_name
        if product.supplier
        else "Unknown"
    )
    return data


def serialize_order(order: Order, supplier_name: str = "", buyer_name: str = "") -> OrderOut:
    data = OrderOut.model_validate(order)
    data.supplier_name = supplier_name
    data.buyer_name = buyer_name
    return data
