from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.career import Career
from app.models.user_career import UserCareer
from app.models.career_skill import CareerSkill
from app.models.skill import Skill
from app.models.user_skill import UserSkill
from app.schemas.career import (
    CareerCreate,
    CareerResponse,
    CareerSelect
)
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/careers",
    tags=["Careers"]
)


# Calculate career recommendations from the database and the user's saved skills.
@router.get("/recommendations")
def get_career_recommendations(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    careers = (
        db.query(Career)
        .order_by(Career.career_name.asc())
        .all()
    )

    saved_rows = (
        db.query(Skill, UserSkill)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )

    user_skill_ids = {skill.id for skill, _ in saved_rows}

    selected = (
        db.query(UserCareer)
        .filter(UserCareer.user_id == user_id)
        .first()
    )

    requirement_rows = (
        db.query(CareerSkill, Skill)
        .join(Skill, Skill.id == CareerSkill.skill_id)
        .all()
    )

    requirements_by_career = {}

    for career_skill, skill in requirement_rows:
        requirements_by_career.setdefault(
            career_skill.career_id, {}
        )[skill.id] = skill

    recommendations = []

    for career in careers:
        required_skills = list(
            requirements_by_career.get(career.id, {}).values()
        )

        matched_skills = [
            skill for skill in required_skills
            if skill.id in user_skill_ids
        ]

        missing_skills = [
            skill for skill in required_skills
            if skill.id not in user_skill_ids
        ]

        match_percentage = (
            round(len(matched_skills) * 100 / len(required_skills))
            if required_skills else None
        )

        recommendations.append({
            "id": career.id,
            "career_name": career.career_name,
            "description": career.description,
            "match_percentage": match_percentage,
            "required_skills": [
                skill.skill_name for skill in required_skills
            ],
            "matched_skills": [
                skill.skill_name for skill in matched_skills
            ],
            "missing_skills": [
                skill.skill_name for skill in missing_skills
            ],
        })

    return {
        "selected_career_id": selected.career_id if selected else None,
        "user_skills": [
            {
                "id": user_skill.id,
                "skill_id": skill.id,
                "skill_name": skill.skill_name,
                "proficiency": user_skill.proficiency,
            }
            for skill, user_skill in saved_rows
        ],
        "careers": recommendations,
    }

# Get all available careers
@router.get("/", response_model=list[CareerResponse])
def get_careers(
    db: Session = Depends(get_db)
):
    careers = db.query(Career).all()
    return careers


# Create a new career
@router.post("/", response_model=CareerResponse)
def create_career(
    career: CareerCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    existing_career = db.query(Career).filter(
        Career.career_name == career.career_name
    ).first()

    if existing_career:
        raise HTTPException(
            status_code=400,
            detail="Career already exists"
        )

    new_career = Career(
        career_name=career.career_name,
        description=career.description
    )

    db.add(new_career)
    db.commit()
    db.refresh(new_career)

    return new_career


# Select a career for logged-in user
@router.post("/select")
def select_career(
    career: CareerSelect,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    selected_career = db.query(Career).filter(
        Career.id == career.career_id
    ).first()

    if not selected_career:
        raise HTTPException(
            status_code=404,
            detail="Career not found"
        )

    existing_selection = db.query(UserCareer).filter(
        UserCareer.user_id == user_id
    ).first()

    if existing_selection:
        existing_selection.career_id = career.career_id
    else:
        new_selection = UserCareer(
            user_id=user_id,
            career_id=career.career_id
        )
        db.add(new_selection)

    db.commit()

    return {
        "message": "Career selected successfully",
        "career_id": career.career_id,
        "career_name": selected_career.career_name
    }


# Get logged-in user's selected career
@router.get("/my")
def get_my_career(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    user_career = db.query(UserCareer).filter(
        UserCareer.user_id == user_id
    ).first()

    if not user_career:
        raise HTTPException(
            status_code=404,
            detail="No career selected"
        )

    career = db.query(Career).filter(
        Career.id == user_career.career_id
    ).first()

    return {
        "career_id": career.id,
        "career_name": career.career_name,
        "description": career.description
    }