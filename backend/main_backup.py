from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class User(BaseModel):
    name: str
    age: int


@app.get("/")
def home():
    return {"message": "FastAPI is working!"}


@app.post("/users")
def create_user(user: User):
    return {
        "message": "User created successfully",
        "name": user.name,
        "age": user.age
    }