from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    college: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    degree: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    location: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )