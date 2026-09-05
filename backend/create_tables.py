from app.database.connection import Base, engine
from app.models.user import User
from app.models.profile import Profile

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("✅ Database tables created successfully!")