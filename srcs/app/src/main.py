from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uvicorn
from typing import Annotated 

from database import get_db, create_tables
from models import User
from password import hash_password, verify_password, create_access_token, verify_token 
import schemas

app = FastAPI(title="GameHub API")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = verify_token(token) 
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

# Create tables on startup
@app.on_event("startup")
def on_startup():
    create_tables()
    print("Database tables created!")

# Health check
@app.get("/")
async def root():
    return {"message": "GameHub API is running!"}

# User registration (POST /register/)
@app.post("/register/", response_model=schemas.UserOut) 
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)): 
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Hash the password
    hashed_password = hash_password(user_data.password)
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        display_name=user_data.display_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

# OAuth2 Login (POST /login) - For Swagger UI authentication
@app.post("/login")
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login (form data) - works with Swagger UI 'Authorize' button.
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(user_id=user.user_id)
    
    return {"access_token": access_token, "token_type": "bearer"}

# JSON Login (POST /login/json) - For regular API clients
@app.post("/login/json")
async def login_json(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    JSON-based login endpoint for API clients that prefer JSON over form data.
    """
    user = db.query(User).filter(User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(user_id=user.user_id)
    
    return {"access_token": access_token, "token_type": "bearer"}

# User Profile (GET /profile/)
@app.get(
    "/profile/", 
    response_model=schemas.UserOut,
) 
async def get_profile(current_user: Annotated[User, Depends(get_current_user)]):
    """Get the currently authenticated user's profile."""
    return current_user

# Visiting a (public) User Profile (GET /users/{user_id})
@app.get("/users/{user_id}", response_model=schemas.UserPublicOut)
async def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves basic public profile information for any user by ID."""
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return user

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)