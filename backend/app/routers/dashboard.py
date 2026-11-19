from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.models.profile import Profile
from app.models.skill import Skill
from app.models.user_skill import UserSkill
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/")
def get_dashboard(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Get logged-in user
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        return {"detail": "User not found"}

    # Get user profile
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )

    # Get user's skills
    user_skills = (
        db.query(UserSkill, Skill)
        .join(
            Skill,
            UserSkill.skill_id == Skill.id
        )
        .filter(UserSkill.user_id == user_id)
        .all()
    )

    skills = []

    for user_skill, skill in user_skills:
        skills.append({
            "id": skill.id,
            "skill_name": skill.skill_name,
            "proficiency": user_skill.proficiency
        })

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        },

        "profile": {
            "full_name": profile.full_name,
            "college": profile.college,
            "degree": profile.degree,
            "location": profile.location
        } if profile else None,

        "skill_count": len(skills),

        "skills": skills
    }