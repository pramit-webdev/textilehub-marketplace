from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .api import ai, auth, cart, orders, products, profiles, supplier
from .config import settings
from .database import Base, engine, get_db
from .models import ProductImage

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="B2B Textile Marketplace — backend for the buyer & supplier experiences.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://textilehub.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGE_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


@app.get("/uploads/{filename}")
def serve_upload(filename: str, db: Session = Depends(get_db)):
    url_suffix = f"/uploads/{filename}"
    image = (
        db.query(ProductImage)
        .filter(ProductImage.url.like(f"%{url_suffix}"))
        .order_by(ProductImage.id.desc())
        .first()
    )
    if not image or not image.data:
        raise HTTPException(status_code=404, detail="Not found")
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return Response(
        content=image.data,
        media_type=IMAGE_CONTENT_TYPES.get(ext, "application/octet-stream"),
    )


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    # lightweight migration: product_images.data column for DB-backed uploads
    try:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE product_images ADD COLUMN IF NOT EXISTS data BYTEA")
            )
    except Exception:
        try:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE product_images ADD COLUMN IF NOT EXISTS data BLOB")
                )
        except Exception:
            pass


@app.exception_handler(IntegrityError)
def integrity_error_handler(request, exc: IntegrityError):
    return Response(
        content='{"detail": "Invalid or conflicting data — check your request"}',
        status_code=409,
        media_type="application/json",
    )


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "docs": "/docs",
        "status": "ok",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


app.include_router(auth.router)
app.include_router(products.router)
app.include_router(profiles.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(supplier.router)
app.include_router(ai.router)
