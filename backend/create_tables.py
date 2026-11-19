from app.database.connection import engine, Base
import app.models

print("Creating missing database tables...")

Base.metadata.create_all(bind=engine)

print("Database tables checked successfully!")