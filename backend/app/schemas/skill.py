from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SkillCreate(BaseModel):
    skill_name: str
    category: str | None = None


class SkillResponse(BaseModel):
    id: int
    skill_name: str
    category: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSkillCreate(BaseModel):
    skill_name: str
    proficiency: str | None = None


class UserSkillResponse(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    proficiency: str | None

    model_config = ConfigDict(from_attributes=True)