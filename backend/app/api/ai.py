from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import Product, User
from ..schemas import (
    ChatRequest,
    ChatResponse,
    CompareRequest,
    OnboardAIRequest,
    OnboardAIResponse,
    ProductQARequest,
    RecommendationRequest,
)
from ..services.ai_service import ai_service
from ..utils import serialize_product

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _catalog_dicts(db: Session) -> list[dict]:
    products = (
        db.query(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.supplier).selectinload(User.supplier_profile),
        )
        .filter(Product.is_active.is_(True))
        .all()
    )
    return [serialize_product(p).model_dump(mode="json") for p in products]


def _to_messages(payload) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in payload.messages]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    catalog = _catalog_dicts(db)
    result = await ai_service.chat(_to_messages(payload), catalog)
    return ChatResponse(**result)


@router.post("/nl-search", response_model=list)
async def natural_language_search(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = payload.messages[-1].content if payload.messages else ""
    catalog = _catalog_dicts(db)
    matched = await ai_service.semantic_search(query, catalog, limit=8)
    return [p["id"] for p in matched]


@router.post("/recommendations", response_model=list)
async def recommendations(
    payload: RecommendationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    catalog = _catalog_dicts(db)
    profile = None
    if user.buyer_profile:
        profile = {
            "preferred_fabrics": user.buyer_profile.preferred_fabrics,
            "interested_categories": user.buyer_profile.interested_categories,
            "industry": user.buyer_profile.industry,
        }
    matched = await ai_service.recommend(
        catalog, profile=profile, context=payload.context or "", limit=payload.limit
    )
    return [p["id"] for p in matched]


@router.post("/similar/{product_id}", response_model=list)
async def similar(
    product_id: int,
    limit: int = 4,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, 20))
    catalog = _catalog_dicts(db)
    product = next((p for p in catalog if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    matched = await ai_service.similar_products(product, catalog, limit=limit)
    return [p["id"] for p in matched]


@router.post("/compare")
async def compare(
    payload: CompareRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    catalog = _catalog_dicts(db)
    by_id = {p["id"]: p for p in catalog}
    selected = [by_id[i] for i in payload.product_ids if i in by_id]
    if len(selected) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 products to compare")
    text = await ai_service.compare_products(selected)
    return {"comparison": text, "products": selected}


@router.post("/product-qa", response_model=ChatResponse)
async def product_qa(
    payload: ProductQARequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    catalog = _catalog_dicts(db)
    product = next((p for p in catalog if p["id"] == payload.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    reply = await ai_service.product_qa(product, payload.question)
    return ChatResponse(reply=reply, source="ai")


@router.post("/onboarding", response_model=OnboardAIResponse)
async def ai_onboarding(
    payload: OnboardAIRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    messages = _to_messages(payload)
    structured = await ai_service.parse_onboarding(payload.role, messages)
    prompt = (
        "Reply to the user's latest message in a warm, friendly way. You are helping "
        "them complete their textile marketplace onboarding. Keep it under 120 words, "
        "confirm what you understood, and ask one friendly follow-up question."
    )
    chat_result = await ai_service.chat(messages + [{"role": "system", "content": prompt}])
    return OnboardAIResponse(reply=chat_result["reply"], structured=structured)
