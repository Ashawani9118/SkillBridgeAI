
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.skill import Skill
from app.models.user_skill import UserSkill
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/skill-analyzer",
    tags=["Skill Analyzer"]
)


CAREER_SKILLS = {
    "python developer": [
        "Python",
        "SQL",
        "FastAPI",
        "Git"
    ],
    "data analyst": [
        "Python",
        "SQL",
        "Excel",
        "Data Analysis"
    ],
    "machine learning engineer": [
        "Python",
        "SQL",
        "Machine Learning",
        "Data Analysis"
    ]
}


@router.get("/analyze")
def analyze_skills(
    career: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    career_key = career.lower().strip()

    required_skills = CAREER_SKILLS.get(career_key)

    if not required_skills:
        return {
            "career": career,
            "message": "Career not available",
            "available_careers": list(CAREER_SKILLS.keys())
        }

    user_skills = (
        db.query(Skill.skill_name)
        .join(
            UserSkill,
            UserSkill.skill_id == Skill.id
        )
        .filter(
            UserSkill.user_id == user_id
        )
        .all()
    )

    user_skill_names = {
        skill_name.lower()
        for (skill_name,) in user_skills
    }

    matched_skills = []
    missing_skills = []

    for required_skill in required_skills:
        if required_skill.lower() in user_skill_names:
            matched_skills.append(required_skill)
        else:
            missing_skills.append(required_skill)

    total = len(required_skills)
    matched = len(matched_skills)

    skill_match_percentage = round(
        (matched / total) * 100
    ) if total else 0

    return {
        "career": career,
        "skill_match_percentage": skill_match_percentage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }

