from fastapi import FastAPI
from database import create_tables

from routers import auth, users, games, collection

app = FastAPI(title="GameHub API")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(games.router)
app.include_router(collection.router)

@app.on_event("startup")
def on_startup():
    create_tables()
    print("Database tables created!")

@app.get("/")
async def root():
    return {"message": "GameHub API is running!"}