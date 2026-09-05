from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.skill import Skill
from app.models.user_skill import UserSkill
from app.schemas.skill import (
    SkillCreate,
    SkillResponse,
    UserSkillCreate,
    UserSkillResponse
)
from app.core.security import get_current_user_id


router = APIRouter(
    prefix="/skills",
    tags=["Skills"]
)


@router.post("/", response_model=SkillResponse)
def create_skill(
    skill: SkillCreate,
    db: Session = Depends(get_db)
):
    existing_skill = (
        db.query(Skill)
        .filter(Skill.skill_name == skill.skill_name)
        .first()
    )

    if existing_skill:
        raise HTTPException(
            status_code=400,
            detail="Skill already exists"
        )

    new_skill = Skill(
        skill_name=skill.skill_name,
        category=skill.category
    )

    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)

    return new_skill


@router.get("/", response_model=list[SkillResponse])
def get_all_skills(
    db: Session = Depends(get_db)
):
    return db.query(Skill).all()


@router.post("/my", response_model=UserSkillResponse)
def add_my_skill(
    skill: UserSkillCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    existing_skill = (
        db.query(Skill)
        .filter(Skill.skill_name == skill.skill_name)
        .first()
    )

    if not existing_skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found"
        )

    existing_user_skill = (
        db.query(UserSkill)
        .filter(
            UserSkill.user_id == user_id,
            UserSkill.skill_id == existing_skill.id
        )
        .first()
    )

    if existing_user_skill:
        raise HTTPException(
            status_code=400,
            detail="Skill already added to your profile"
        )

    new_user_skill = UserSkill(
        user_id=user_id,
        skill_id=existing_skill.id,
        proficiency=skill.proficiency
    )

    db.add(new_user_skill)
    db.commit()
    db.refresh(new_user_skill)

    return {
        "id": new_user_skill.id,
        "skill_id": existing_skill.id,
        "skill_name": existing_skill.skill_name,
        "proficiency": new_user_skill.proficiency
    }


@router.get("/my", response_model=list[UserSkillResponse])
def get_my_skills(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user_skills = (
        db.query(UserSkill, Skill)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )

    return [
        {
            "id": user_skill.id,
            "skill_id": skill.id,
            "skill_name": skill.skill_name,
            "proficiency": user_skill.proficiency
        }
        for user_skill, skill in user_skills
    ]


@router.delete("/my/{skill_id}")
def delete_my_skill(
    skill_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user_skill = (
        db.query(UserSkill)
        .filter(
            UserSkill.user_id == user_id,
            UserSkill.skill_id == skill_id
        )
        .first()
    )

    if not user_skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found in your profile"
        )

    db.delete(user_skill)
    db.commit()

    return {
        "message": "Skill removed successfully"
    }