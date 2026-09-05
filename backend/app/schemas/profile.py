from pydantic import BaseModel


class ProfileCreate(BaseModel):
    full_name: str
    college: str | None = None
    degree: str | None = None
    location: str | None = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    college: str | None
    degree: str | None
    location: str | None

    class Config:
        from_attributes = True