from fastapi import FastAPI

from app.routers.auth import router as auth_router

app = FastAPI(
    title="SkillBridgeAI API",
    version="1.0.0"
)

app.include_router(auth_router)


@app.get("/")
def home():
    return {
        "message": "SkillBridgeAI API is working!"
    }