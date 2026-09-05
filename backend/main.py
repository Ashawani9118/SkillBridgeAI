from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.profile import router as profile_router
from app.routers.skills import router as skills_router
from app.routers.dashboard import router as dashboard_router
from app.routers.resume import router as resume_router
from app.routers.skill_analyzer import router as skill_analyzer_router


app = FastAPI(
    title="SkillBridgeAI API",
    version="1.0.0"
)


app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(skills_router)
app.include_router(dashboard_router)
app.include_router(resume_router)
app.include_router(skill_analyzer_router)


@app.get("/")
def home():
    return {
        "message": "SkillBridgeAI API is working!"
    }

