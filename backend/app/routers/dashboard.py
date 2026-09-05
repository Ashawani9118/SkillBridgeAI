from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.profile import Profile
from app.models.user_skill import UserSkill
from app.models.skill import Skill


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/")
def get_dashboard(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    profile = (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )

    user_skills = (
        db.query(UserSkill, Skill)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )

    skills = [
        {
            "id": skill.id,
            "skill_name": skill.skill_name,
            "proficiency": user_skill.proficiency
        }
        for user_skill, skill in user_skills
    ]

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        },
        "profile": (
            {
                "full_name": profile.full_name,
                "college": profile.college,
                "degree": profile.degree,
                "location": profile.location
            }
            if profile else None
        ),
        "skill_count": len(skills),
        "skills": skills
    }