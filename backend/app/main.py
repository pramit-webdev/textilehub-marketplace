import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import ai, auth, cart, orders, products, profiles, supplier
from .config import settings
from .database import Base, engine

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

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


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
