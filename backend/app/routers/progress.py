from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.roadmap import Roadmap
from app.models.roadmap_progress import RoadmapProgress
from app.models.user_career import UserCareer
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/progress",
    tags=["Progress"]
)


@router.post("/complete/{roadmap_id}")
def complete_roadmap_step(
    roadmap_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # Check user's selected career
    user_career = db.query(UserCareer).filter(
        UserCareer.user_id == user_id
    ).first()

    if not user_career:
        raise HTTPException(
            status_code=404,
            detail="No career selected"
        )

    # Check roadmap step
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id,
        Roadmap.career_id == user_career.career_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap step not found"
        )

    # Check existing progress
    progress = db.query(RoadmapProgress).filter(
        RoadmapProgress.user_id == user_id,
        RoadmapProgress.roadmap_id == roadmap_id
    ).first()

    if not progress:
        progress = RoadmapProgress(
            user_id=user_id,
            roadmap_id=roadmap_id,
            completed=True,
            completed_at=datetime.utcnow()
        )
        db.add(progress)
    else:
        progress.completed = True
        progress.completed_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Roadmap step completed successfully",
        "roadmap_id": roadmap_id,
        "completed": True
    }


@router.get("/")
def get_progress(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # Check user's selected career
    user_career = db.query(UserCareer).filter(
        UserCareer.user_id == user_id
    ).first()

    if not user_career:
        raise HTTPException(
            status_code=404,
            detail="No career selected"
        )

    # Get all roadmap steps
    roadmap_steps = db.query(Roadmap).filter(
        Roadmap.career_id == user_career.career_id
    ).order_by(Roadmap.step_number).all()

    if not roadmap_steps:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not available"
        )

    # Get user's completed steps
    completed_steps = db.query(RoadmapProgress).filter(
        RoadmapProgress.user_id == user_id,
        RoadmapProgress.completed == True
    ).all()

    completed_ids = {
        progress.roadmap_id
        for progress in completed_steps
    }

    total_steps = len(roadmap_steps)
    completed_count = len(
        [step for step in roadmap_steps if step.id in completed_ids]
    )

    progress_percentage = round(
        (completed_count / total_steps) * 100,
        2
    )

    return {
        "career_id": user_career.career_id,
        "total_steps": total_steps,
        "completed_steps": completed_count,
        "remaining_steps": total_steps - completed_count,
        "progress_percentage": progress_percentage
    }
