from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import Achievement, UserAchievements, Game
from dependencies import CurrentUser, CurrentAdmin
import schemas

router = APIRouter(prefix="/achievements", tags=["Achievements"])

@router.post("/games/{game_id}/achievements/", response_model=schemas.AchievementOut, status_code=status.HTTP_201_CREATED)
async def create_achievement(
    game_id: str,
    achievement_data: schemas.AchievementCreate,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    new_achievement = Achievement(
        game_id=game_id,
        achievement_name=achievement_data.achievement_name,
        description=achievement_data.description,
        rarity=achievement_data.rarity,
        points_value=achievement_data.points_value
    )
    
    db.add(new_achievement)
    db.commit()
    db.refresh(new_achievement)
    
    return new_achievement

@router.get("/games/{game_id}/achievements/", response_model=List[schemas.AchievementOut])
async def get_game_achievements(
    game_id: str,
    db: Session = Depends(get_db)
):
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    achievements = db.query(Achievement).filter(Achievement.game_id == game_id).all()
    
    return achievements

@router.get("/games/{game_id}/my-achievements/", response_model=List[schemas.UserAchievementOut])
async def get_my_game_achievements(
    game_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get user's earned achievements for this game
    user_achievements = db.query(UserAchievements, Achievement).join(
        Achievement, UserAchievements.achievement_id == Achievement.achievement_id
    ).filter(
        UserAchievements.user_id == current_user.user_id,
        Achievement.game_id == game_id
    ).all()
    
    result = []
    for user_ach, achievement in user_achievements:
        ach_dict = {
            "achievement_id": achievement.achievement_id,
            "achievement_name": achievement.achievement_name,
            "description": achievement.description,
            "rarity": achievement.rarity,
            "points_value": achievement.points_value,
            "date_earned": user_ach.date_earned
        }
        result.append(schemas.UserAchievementOut(**ach_dict))
    
    return result

@router.post("/{achievement_id}/earn/", status_code=status.HTTP_201_CREATED)
async def earn_achievement(
    achievement_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    earned_data: schemas.UserAchievementComplete = None
):
    # Verify achievement exists
    achievement = db.query(Achievement).filter(Achievement.achievement_id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    # Check if already earned
    existing = db.query(UserAchievements).filter(
        UserAchievements.user_id == current_user.user_id,
        UserAchievements.achievement_id == achievement_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Achievement already earned")
    
    # Create user achievement
    date_earned = earned_data.date_earned if earned_data and earned_data.date_earned else datetime.utcnow()
    
    user_achievement = UserAchievements(
        user_id=current_user.user_id,
        achievement_id=achievement_id,
        date_earned=date_earned
    )
    
    db.add(user_achievement)
    db.commit()
    
    return {
        "message": "Achievement earned!",
        "achievement_id": achievement_id,
        "achievement_name": achievement.achievement_name,
        "date_earned": date_earned
    }

@router.get("/my-achievements/", response_model=List[schemas.UserAchievementOut])
async def get_all_my_achievements(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user_achievements = db.query(UserAchievements, Achievement).join(
        Achievement, UserAchievements.achievement_id == Achievement.achievement_id
    ).filter(
        UserAchievements.user_id == current_user.user_id
    ).all()
    
    result = []
    for user_ach, achievement in user_achievements:
        ach_dict = {
            "achievement_id": achievement.achievement_id,
            "achievement_name": achievement.achievement_name,
            "description": achievement.description,
            "rarity": achievement.rarity,
            "points_value": achievement.points_value,
            "date_earned": user_ach.date_earned
        }
        result.append(schemas.UserAchievementOut(**ach_dict))
    
    return result

@router.delete("/{achievement_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_achievement(
    achievement_id: str,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    achievement = db.query(Achievement).filter(Achievement.achievement_id == achievement_id).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    db.delete(achievement)
    db.commit()
    
    return None

@router.put("/{achievement_id}/", response_model=schemas.AchievementOut)
async def update_achievement(
    achievement_id: str,
    achievement_data: schemas.AchievementCreate,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    achievement = db.query(Achievement).filter(Achievement.achievement_id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    achievement.achievement_name = achievement_data.achievement_name
    achievement.description = achievement_data.description
    achievement.icon_url = achievement_data.icon_url
    achievement.rarity = achievement_data.rarity
    achievement.points_value = achievement_data.points_value
    
    db.commit()
    db.refresh(achievement)
    return achievement