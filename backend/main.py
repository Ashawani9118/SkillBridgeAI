
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.profile import router as profile_router
from app.routers.skills import router as skills_router
from app.routers.dashboard import router as dashboard_router
from app.routers.resume import router as resume_router
from app.routers.github_analysis import router as github_analysis_router
from app.routers.skill_analyzer import router as skill_analyzer_router
from app.routers.careers import router as careers_router
from app.routers.skill_gap import router as skill_gap_router
from app.routers.roadmap import router as roadmap_router
from app.routers.progress import router as progress_router


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="SkillBridgeAI API",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# Allow React/Vite frontend to access FastAPI
# ==========================================

# Local development origins are always allowed.
# Add production frontend origins using CORS_ORIGINS.
configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

allowed_origins.extend(configured_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ==========================================
# EXISTING ROUTERS
# ==========================================

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(skills_router)
app.include_router(dashboard_router)
app.include_router(resume_router)
app.include_router(github_analysis_router)
app.include_router(skill_analyzer_router)


# ==========================================
# CAREER FEATURES
# ==========================================

app.include_router(careers_router)
app.include_router(skill_gap_router)
app.include_router(roadmap_router)
app.include_router(progress_router)


# ==========================================
# ROOT ENDPOINT
# ==========================================

@app.get("/")
def home():
    return {
        "message": "SkillBridgeAI API is working!"
    }