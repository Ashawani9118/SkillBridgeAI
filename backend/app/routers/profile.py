
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileResponse
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)


@router.post("/", response_model=ProfileResponse)
def create_profile(
    profile: ProfileCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    existing_profile = (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )

    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="Profile already exists"
        )

    new_profile = Profile(
        user_id=user_id,
        full_name=profile.full_name,
        college=profile.college,
        degree=profile.degree,
        location=profile.location
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    return new_profile


@router.get("/", response_model=ProfileResponse)
def get_my_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    return profile


@router.put("/", response_model=ProfileResponse)
def update_my_profile(
    profile_data: ProfileCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    existing_profile = (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )

    if not existing_profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    existing_profile.full_name = profile_data.full_name
    existing_profile.college = profile_data.college
    existing_profile.degree = profile_data.degree
    existing_profile.location = profile_data.location

    db.commit()
    db.refresh(existing_profile)

    return existing_profile
