from datetime import datetime

from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    skill_name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow
    )