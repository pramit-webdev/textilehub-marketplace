from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import BuyerProfile, SupplierProfile, User
from ..schemas import BuyerProfileIn, BuyerProfileOut, SupplierProfileIn, SupplierProfileOut

router = APIRouter(prefix="/api", tags=["profiles"])


@router.get("/buyer/me/profile", response_model=BuyerProfileOut)
def get_buyer_profile(
    user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)
):
    profile = user.buyer_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/buyer/me/profile", response_model=BuyerProfileOut)
def upsert_buyer_profile(
    payload: BuyerProfileIn,
    user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db),
):
    profile = user.buyer_profile
    if not profile:
        profile = BuyerProfile(user_id=user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    user.is_onboarded = True
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/supplier/me/profile", response_model=SupplierProfileOut)
def get_supplier_profile(
    user: User = Depends(require_role("supplier")), db: Session = Depends(get_db)
):
    profile = user.supplier_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/supplier/me/profile", response_model=SupplierProfileOut)
def upsert_supplier_profile(
    payload: SupplierProfileIn,
    user: User = Depends(require_role("supplier")),
    db: Session = Depends(get_db),
):
    profile = user.supplier_profile
    if not profile:
        profile = SupplierProfile(user_id=user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    user.is_onboarded = True
    db.commit()
    db.refresh(profile)
    return profile
