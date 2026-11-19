from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.roadmap import Roadmap
from app.models.roadmap_progress import RoadmapProgress
from app.models.career import Career
from app.models.skill import Skill
from app.models.user_career import UserCareer
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/roadmap",
    tags=["Roadmap"]
)


@router.get("/")
def get_my_roadmap(
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

    # 3. Get roadmap steps for selected career
    roadmap_steps = (
        db.query(Roadmap, Skill)
        .join(
            Skill,
            Roadmap.skill_id == Skill.id
        )
        .filter(
            Roadmap.career_id == career.id
        )
        .order_by(
            Roadmap.step_number
        )
        .all()
    )

    if not roadmap_steps:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not available for this career"
        )

    # 4. Prepare response using persisted completion records
    completed_rows = db.query(RoadmapProgress.roadmap_id).filter(
        RoadmapProgress.user_id == user_id,
        RoadmapProgress.completed.is_(True)
    ).all()
    completed_ids = {row[0] for row in completed_rows}

    steps = []

    for roadmap, skill in roadmap_steps:
        steps.append({
            "id": roadmap.id,
            "step_number": roadmap.step_number,
            "skill": skill.skill_name,
            "title": roadmap.title,
            "description": roadmap.description,
            "completed": roadmap.id in completed_ids
        })

    return {
        "career": career.career_name,
        "total_steps": len(steps),
        "roadmap": steps
    }