from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy.exc import SQLAlchemyError


from database import create_tables
from routers import auth, users, games, collection, achievements, uploads
from exceptions import database_exception_handler, exception_handler

app = FastAPI(title="GameHub API")

app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, exception_handler)

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/static/profiles", StaticFiles(directory=str(UPLOAD_DIR / "profiles")), name="profiles")
app.mount("/static/achievements", StaticFiles(directory=str(UPLOAD_DIR / "achievements")), name="achievements")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(games.router)
app.include_router(collection.router)
app.include_router(achievements.router)
app.include_router(uploads.router)

@app.on_event("startup")
def on_startup():
    create_tables()
    (UPLOAD_DIR / "profiles").mkdir(exist_ok=True)
    (UPLOAD_DIR / "achievements").mkdir(exist_ok=True)
    print("Database tables created!")

@app.get("/")
async def root():
    return {"message": "GameHub API is running!"}