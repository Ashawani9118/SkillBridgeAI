from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CareerCreate(BaseModel):
    career_name: str
    description: str | None = None


class CareerResponse(BaseModel):
    id: int
    career_name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CareerSelect(BaseModel):
    career_id: int