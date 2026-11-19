
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.career import Career
from app.models.career_skill import CareerSkill
from app.models.skill import Skill
from app.models.user_skill import UserSkill
from app.models.user_career import UserCareer
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/skill-gap",
    tags=["Skill Gap"]
)


@router.get("/")
def get_skill_gap(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # 1. Check user's selected career
    user_career = db.query(UserCareer).filter(
        UserCareer.user_id == user_id
    ).first()

    if not user_career:
        raise HTTPException(
            status_code=404,
            detail="No career selected"
        )

    # 2. Get selected career
    career = db.query(Career).filter(
        Career.id == user_career.career_id
    ).first()

    if not career:
        raise HTTPException(
            status_code=404,
            detail="Career not found"
        )

    # 3. Get skills required for this career
    required_skills = (
        db.query(Skill)
        .join(
            CareerSkill,
            CareerSkill.skill_id == Skill.id
        )
        .filter(
            CareerSkill.career_id == career.id
        )
        .all()
    )

    # 4. Get user's current skills
    user_skills = (
        db.query(Skill)
        .join(
            UserSkill,
            UserSkill.skill_id == Skill.id
        )
        .filter(
            UserSkill.user_id == user_id
        )
        .all()
    )

    # 5. Convert user's skills into a set of IDs
    user_skill_ids = {
        skill.id
        for skill in user_skills
    }

    # 6. Find missing skills
    missing_skills = [
        skill
        for skill in required_skills
        if skill.id not in user_skill_ids
    ]

    # 7. Return result
    return {
        "career": career.career_name,
        "required_skills": [
            skill.skill_name
            for skill in required_skills
        ],
        "user_skills": [
            skill.skill_name
            for skill in user_skills
        ],
        "missing_skills": [
            skill.skill_name
            for skill in missing_skills
        ],
        "total_required": len(required_skills),
        "total_user_skills": len(user_skills),
        "total_missing": len(missing_skills)
    }

