from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pathlib import Path
import shutil

from database import get_db
from dependencies import CurrentAdmin, CurrentUser
from models import Achievement, User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Storage directory inside container
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed image types
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_image(file: UploadFile):
    # Check extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size (reads content)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

@router.post("/profile-picture/")
async def upload_profile_picture(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    file: UploadFile = File(...)
):
    validate_image(file)
    
    # Create profiles directory
    profile_dir = UPLOAD_DIR / "profiles"
    profile_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    filename = f"{current_user.user_id}{file_ext}"
    file_path = profile_dir / filename
    
    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    
    # Update user's profile picture URL in database
    image_url = f"/static/profiles/{filename}"
    current_user.profile_picture_url = image_url
    db.commit()
    
    return {
        "message": "Profile picture uploaded successfully",
        "url": image_url
    }

@router.post("/achievement-icon/{achievement_id}")
async def upload_achievement_icon(
    achievement_id: str,
    db: Session = Depends(get_db),
    file: UploadFile = File(...)
):
    validate_image(file)
    
    # Verify achievement exists
    achievement = db.query(Achievement).filter(
        Achievement.achievement_id == achievement_id
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    # Create achievements directory
    achievement_dir = UPLOAD_DIR / "achievements"
    achievement_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    filename = f"{achievement_id}{file_ext}"
    file_path = achievement_dir / filename
    
    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    
    # Update achievement's icon URL in database
    image_url = f"/static/achievements/{filename}"
    achievement.icon_url = image_url
    db.commit()
    
    return {
        "message": "Achievement icon uploaded successfully",
        "url": image_url
    }

@router.delete("/profile-picture/")
async def delete_profile_picture(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    if not current_user.profile_picture_url:
        raise HTTPException(status_code=404, detail="No profile picture to delete")
    
    # Extract filename from URL
    filename = Path(current_user.profile_picture_url).name
    file_path = UPLOAD_DIR / "profiles" / filename
    
    # Delete file if exists
    if file_path.exists():
        file_path.unlink()
    
    # Clear database entry
    current_user.profile_picture_url = None
    db.commit()
    
    return {"message": "Profile picture deleted"}

@router.delete("/profile-picture/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_profile_picture(
    user_id: str,
    current_admin: CurrentAdmin,  # ← Admin only
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.profile_picture_url:
        raise HTTPException(status_code=404, detail="User has no profile picture")
    
    # Extract filename and delete file
    filename = Path(user.profile_picture_url).name
    file_path = UPLOAD_DIR / "profiles" / filename
    if file_path.exists():
        file_path.unlink()
    
    # Clear database entry
    user.profile_picture_url = None
    db.commit()
    
    return None