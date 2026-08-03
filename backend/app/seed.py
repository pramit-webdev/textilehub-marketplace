"""Seed the database with categories, demo users, suppliers, products and sample orders."""

from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import (
    BuyerProfile,
    CartItem,
    Category,
    Order,
    OrderItem,
    Product,
    ProductImage,
    SupplierProfile,
    User,
)
from .security import hash_password

IMAGE_POOL = [
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580651315530-69c8e0026377?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604176354204-9268737828e4?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?q=80&w=900&auto=format&fit=crop",
]

CATEGORIES = [
    ("Cotton", "cotton", "Breathable, durable cotton fabrics for apparel and home textiles."),
    ("Silk", "silk", "Luxurious natural silk for premium garments and accessories."),
    ("Linen", "linen", "Crisp, airy linen fabrics made from flax fibres."),
    ("Wool", "wool", "Warm wool fabrics for suits, coats and knitwear."),
    ("Denim", "denim", "Heavy-duty denim for jeans, jackets and workwear."),
    ("Polyester", "polyester", "Versatile, easy-care synthetic fabrics."),
    ("Viscose", "viscose", "Soft, flowing rayon and viscose fabrics."),
    ("Blends", "blends", "Engineered blends combining natural and synthetic fibres."),
]

PRODUCTS = [
    # (name, category_slug, fabric, price, moq, stock, colors, specs, featured, desc)
    ("Premium Combed Cotton Poplin", "cotton", "Cotton", 245, 100, 5000,
     ["White", "Off White", "Sky Blue", "Black"],
     {"GSM": "120", "Width": "58 inch", "Weave": "Poplin", "Finish": "Enzyme wash"},
     True, "High-grade combed poplin with a soft hand-feel, perfect for shirts, dresses and kids wear. Pre-shrunk and colour-fast."),
    ("Organic Cotton Canvas", "cotton", "Cotton", 320, 50, 1800,
     ["Natural", "Olive", "Sand", "Charcoal"],
     {"GSM": "240", "Width": "60 inch", "Weave": "Canvas", "Certification": "GOTS"},
     True, "Certified organic cotton canvas for bags, upholstery and sturdy apparel. Heavyweight with excellent dimensional stability."),
    ("Mulberry Silk Georgette", "silk", "Silk", 1850, 20, 400,
     ["Ivory", "Rose", "Teal", "Mustard"],
     {"Weight": "12 momme", "Width": "44 inch", "Weave": "Georgette", "Source": "Karnataka"},
     True, "Pure mulberry silk georgette with a fluid drape and subtle texture. Ideal for sarees, dupattas and luxury dresses."),
    ("Tussar Silk Taffeta", "silk", "Silk", 1450, 25, 300,
     ["Golden", "Rust", "Forest Green", "Ochre"],
     {"Weight": "16 momme", "Width": "44 inch", "Weave": "Taffeta", "Source": "Bhagalpur"},
     False, "Handwoven tussar silk with a natural golden sheen. Structured hand-feel suited to jackets, sarees and occasion wear."),
    ("Belgian Linen Voile", "linen", "Linen", 410, 60, 1200,
     ["Natural", "White", "Powder Blue"],
     {"GSM": "110", "Width": "58 inch", "Weave": "Voile", "Blend": "100% flax"},
     True, "Lightweight 100% flax linen voile with a soft, airy drape. Gets softer with every wash; ideal for summer shirting and scarves."),
    ("Stonewashed Linen Blend", "linen", "Linen", 365, 80, 900,
     ["Oat", "Sage", "Ink", "Terracotta"],
     {"GSM": "180", "Width": "56 inch", "Blend": "55% flax / 45% cotton"},
     False, "Pre-washed linen-cotton blend with a relaxed, lived-in texture. Great for casual tailoring and home furnishings."),
    ("Merino Wool Suiting", "wool", "Wool", 2200, 30, 250,
     ["Navy", "Charcoal", "Grey", "Black"],
     {"GSM": "260", "Width": "60 inch", "Weave": "Plain", "Composition": "100% merino wool"},
     True, "Superfine merino suiting cloth with a clean finish for tailored suits and trousers. Wrinkle-resistant and breathable."),
    ("Wool Flannel Melton", "wool", "Wool", 1680, 40, 350,
     ["Camel", "Maroon", "Midnight Blue", "Grey"],
     {"GSM": "330", "Width": "60 inch", "Weave": "Flannel", "Finish": "Mill-finished"},
     False, "Brushed woollen melton for coats and outerwear. Dense, warm and wind-resistant with a soft matte finish."),
    ("Selvedge Denim 14oz", "denim", "Denim", 620, 80, 1500,
     ["Indigo", "Raw Indigo", "Black", "Stone Wash"],
     {"Weight": "14 oz", "Width": "34 inch", "Weave": "3x1 twill", "Type": "Selvedge"},
     True, "Japanese-style selvedge denim in classic indigo. Rigid construction that fades beautifully with wear. Ideal for premium jeans."),
    ("Stretch Denim 12oz", "denim", "Denim", 480, 100, 2000,
     ["Mid Blue", "Dark Blue", "Black", "Grey"],
     {"Weight": "12 oz", "Width": "58 inch", "Weave": "Twill", "Stretch": "2% spandex"},
     False, "Comfort stretch denim with excellent recovery for skinny fits, jeggings and everyday denim wear."),
    ("100% Polyester Chiffon", "polyester", "Polyester", 145, 200, 8000,
     ["Black", "Navy", "Burgundy", "Emerald", "Lilac"],
     {"GSM": "55", "Width": "44 inch", "Weave": "Chiffon", "Opacity": "Semi-sheer"},
     False, "Featherlight chiffon with a soft flow for sarees, scarves and lining. Easy-care and crease-resistant."),
    ("Polyester Microfiber Sport", "polyester", "Polyester", 210, 150, 6000,
     ["Neon Yellow", "Royal Blue", "Black", "Red"],
     {"GSM": "150", "Width": "58 inch", "Finish": "Moisture-wicking", "Use": "Activewear"},
     False, "Performance microfiber with moisture-wicking finish for sportswear, athleisure and team uniforms."),
    ("Viscose Rayon Crepe", "viscose", "Viscose", 280, 100, 3500,
     ["Dusty Pink", "Mint", "Beige", "Navy"],
     {"GSM": "135", "Width": "44 inch", "Weave": "Crepe", "Drape": "Fluid"},
     True, "Soft-touch viscose crepe with a beautiful fluid drape for dresses, blouses and lining. Breathable and comfortable."),
    ("Viscose Twill Ajrak Print", "viscose", "Viscose", 320, 80, 1200,
     ["Indigo", "Crimson", "Multi"],
     {"GSM": "160", "Width": "44 inch", "Print": "Ajrak block print", "Use": "Ethnic wear"},
     False, "Viscose twill with traditional Ajrak block prints. Colourful ethnic wear fabric for kurtas and dupattas."),
    ("Cotton-Silk Linen Blend", "blends", "Blends", 540, 60, 900,
     ["Natural", "Ecru", "Slate"],
     {"GSM": "190", "Width": "58 inch", "Blend": "45% cotton / 35% silk / 20% linen"},
     False, "Luxury triple-blend suiting with the best of cotton, silk and linen. Soft drape with natural texture."),
    ("Poly-Cotton Poplin 65/35", "blends", "Blends", 185, 300, 15000,
     ["White", "Ice Blue", "Pink", "Lilac"],
     {"GSM": "110", "Width": "58 inch", "Blend": "65% polyester / 35% cotton", "Use": "Uniforms & shirting"},
     False, "Workhorse poly-cotton poplin for uniforms, school wear and mass-produced shirting. Wrinkle-free and durable."),
    ("Poly-Viscose Suiting", "blends", "Blends", 350, 120, 4200,
     ["Dark Grey", "Navy", "Brown", "Black"],
     {"GSM": "230", "Width": "60 inch", "Blend": "70% polyester / 30% viscose", "Use": "Trousers & skirts"},
     False, "Crisp poly-viscose suiting fabric with a clean drape for trousers, skirts and casual blazers."),
    ("Brushed Cotton Flannel", "cotton", "Cotton", 380, 90, 1600,
     ["Plaid Red", "Plaid Blue", "Grey", "Cream"],
     {"GSM": "210", "Width": "58 inch", "Weave": "Flannel", "Finish": "Brushed both sides"},
     False, "Cosy brushed cotton flannel in classic plaids for shirts and pyjamas. Warm and soft on both sides."),
    ("Silk Cotton Saree Fabric", "silk", "Silk", 780, 30, 600,
     ["Peacock", "Magenta", "Ivory", "Golden"],
     {"GSM": "140", "Width": "44 inch", "Blend": "70% silk / 30% cotton", "Weave": "Handloom"},
     True, "Handloom silk-cotton with a crisp finish and rich colours, ideal for everyday and festive sarees."),
    ("Raw Linen Upholstery", "linen", "Linen", 460, 50, 700,
     ["Natural", "Stone", "Espresso", "Grey"],
     {"GSM": "280", "Width": "58 inch", "Weave": "Dobby", "Use": "Upholstery & drapery"},
     False, "Heavyweight raw linen for sofas, cushions and curtains. Naturally textured with a relaxed look."),
    ("Italian Merino Crêpe Suiting", "wool", "Wool", 2400, 20, 180,
     ["Navy", "Charcoal", "Light Grey", "Burgundy"],
     {"GSM": "250", "Width": "60 inch", "Weave": "Crêpe", "Finish": "Worsted"},
     False, "Worsted merino crêpe suiting for elegant dresses and lightweight jackets. Moves beautifully."),
    ("Neon Acid-Wash Denim", "denim", "Denim", 560, 70, 800,
     ["Acid Black", "Acid Blue", "Grey"],
     {"Weight": "13 oz", "Width": "44 inch", "Finish": "Acid wash", "Use": "Streetwear"},
     False, "Statement acid-wash denim for streetwear brands. Each roll has a unique washed character."),
    ("Microfiber Polyester Taffeta", "polyester", "Polyester", 165, 250, 10000,
     ["Black", "White", "Navy", "Red"],
     {"GSM": "70", "Width": "58 inch", "Weave": "Taffeta", "Use": "Lining & banners"},
     False, "Glossy taffeta for garment lining, bags and event decor. Lightweight with a crisp rustle."),
    ("Printed Viscose Rayon", "viscose", "Viscose", 295, 100, 2200,
     ["Floral", "Geometric", "Tropical"],
     {"GSM": "120", "Width": "44 inch", "Print": "Digital", "Use": "Dresses & kaftans"},
     False, "Digitally printed viscose rayon with vibrant all-over designs for dresses and kaftans."),
    ("Tri-Blend Performance Knit", "blends", "Blends", 340, 150, 5000,
     ["Black", "Heather Grey", "Navy", "White"],
     {"GSM": "180", "Width": "60 inch", "Blend": "50% poly / 25% cotton / 25% rayon", "Stretch": "4-way"},
     False, "Ultra-soft tri-blend jersey knit with 4-way stretch for premium t-shirts and athleisure."),
]

SUPPLIERS = [
    {
        "email": "weaver@textilehub.in",
        "full_name": "Anita Deshmukh",
        "business_name": "Prakriti Weaves",
        "business_type": "Handloom Weaver & Exporter",
        "phone": "+91 98220 11223",
        "address": "SIPCOT Industrial Park, Chennai, Tamil Nadu",
        "hours": "Mon–Sat, 9:00 AM – 6:00 PM IST",
        "categories": ["Cotton", "Silk", "Linen"],
        "fabrics": ["cotton", "silk", "linen"],
        "moq": "100 meters",
        "desc": "Third-generation handloom weaving house from Tamil Nadu, specialising in organic cotton, mulberry silk and linen. GOTS and OCS certified mill with 40 looms.",
    },
    {
        "email": "mills@textilehub.in",
        "full_name": "Rajesh Kapoor",
        "business_name": "Shree Textile Mills",
        "business_type": "Textile Manufacturer",
        "phone": "+91 99870 55678",
        "address": "Textile Park, Surat, Gujarat",
        "hours": "Mon–Sat, 8:30 AM – 7:00 PM IST",
        "categories": ["Denim", "Polyester", "Viscose"],
        "fabrics": ["denim", "polyester", "viscose"],
        "moq": "500 meters",
        "desc": "Modern synthetic and denim mill in Surat with high-speed weaving and dyeing lines. Capable of 2 lakh meters per month with strict QC.",
    },
    {
        "email": "woolworks@textilehub.in",
        "full_name": "Sunil Mehta",
        "business_name": "Himalaya Wool Works",
        "business_type": "Woolen Fabric Producer",
        "phone": "+91 98763 33445",
        "address": "Focal Point, Ludhiana, Punjab",
        "hours": "Mon–Fri, 9:00 AM – 5:30 PM IST",
        "categories": ["Wool", "Blends"],
        "fabrics": ["wool", "blends"],
        "moq": "200 meters",
        "desc": "Specialist woollen mill producing merino, flannel and blended suiting from Ludhiana. Sourced merino wool from Australia and NZ.",
    },
]

BUYER = {
    "email": "buyer@textilehub.in",
    "full_name": "Meera Nair",
    "company": "Nair Fashion Studio",
    "business_type": "Apparel Manufacturer",
    "industry": "Fashion & Apparel",
    "categories": ["Cotton", "Silk", "Linen"],
    "fabrics": ["cotton", "silk", "linen"],
    "order_qty": "500–2000 meters",
    "budget": "Rs. 150–800 per meter",
}


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        categories = {}
        for name, slug, desc in CATEGORIES:
            cat = Category(name=name, slug=slug, description=desc)
            db.add(cat)
            categories[slug] = cat
        db.flush()

        buyer = User(
            email=BUYER["email"],
            password_hash=hash_password("demo1234"),
            full_name=BUYER["full_name"],
            role="buyer",
            is_onboarded=True,
        )
        db.add(buyer)
        db.flush()
        db.add(
            BuyerProfile(
                user_id=buyer.id,
                company_name=BUYER["company"],
                business_type=BUYER["business_type"],
                industry=BUYER["industry"],
                interested_categories=BUYER["categories"],
                preferred_fabrics=BUYER["fabrics"],
                typical_order_qty=BUYER["order_qty"],
                budget_range=BUYER["budget"],
                phone="+91 98765 43210",
                country="India",
            )
        )

        supplier_users = []
        for idx, sup in enumerate(SUPPLIERS):
            user = User(
                email=sup["email"],
                password_hash=hash_password("demo1234"),
                full_name=sup["full_name"],
                role="supplier",
                is_onboarded=True,
            )
            db.add(user)
            db.flush()
            db.add(
                SupplierProfile(
                    user_id=user.id,
                    business_name=sup["business_name"],
                    business_type=sup["business_type"],
                    contact_phone=sup["phone"],
                    business_address=sup["address"],
                    operating_hours=sup["hours"],
                    product_categories=sup["categories"],
                    fabric_types=sup["fabrics"],
                    min_order_qty=sup["moq"],
                    description=sup["desc"],
                )
            )
            supplier_users.append(user)

        db.flush()
        image_idx = 0
        for i, (name, cat_slug, fabric, price, moq, stock, colors, specs, featured, desc) in enumerate(
            PRODUCTS
        ):
            supplier = supplier_users[i % len(supplier_users)]
            product = Product(
                supplier_id=supplier.id,
                category_id=categories[cat_slug].id,
                name=name,
                description=desc,
                fabric_type=fabric,
                price=price,
                moq=moq,
                stock=stock,
                colors=colors,
                specifications=specs,
                is_active=True,
                is_featured=featured,
            )
            db.add(product)
            db.flush()
            url = IMAGE_POOL[image_idx % len(IMAGE_POOL)]
            db.add(ProductImage(product_id=product.id, url=url, is_primary=True))
            if i % 3 == 0:
                db.add(
                    ProductImage(
                        product_id=product.id,
                        url=IMAGE_POOL[(image_idx + 1) % len(IMAGE_POOL)],
                        is_primary=False,
                    )
                )
            image_idx += 1

        db.flush()

        recent_products = db.query(Product).order_by(Product.id.desc()).limit(3).all()
        for pi, product in enumerate(recent_products):
            order = Order(
                buyer_id=buyer.id,
                supplier_id=product.supplier_id,
                status=["accepted", "preparing", "ready_for_dispatch"][pi],
                total=product.price * 50,
                shipping_name="Meera Nair",
                shipping_phone="+91 98765 43210",
                shipping_address="12, Indiranagar 2nd Stage",
                shipping_city="Bengaluru",
                shipping_country="India",
                notes="Sample order for seasonal collection.",
            )
            db.add(order)
            db.flush()
            primary = product.images[0] if product.images else None
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    product_name=product.name,
                    quantity=50,
                    unit_price=product.price,
                    image_url=primary.url if primary else None,
                )
            )

        db.commit()
        print("Seeded categories, 3 suppliers, 1 buyer, 25 products and 3 sample orders.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
