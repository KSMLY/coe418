from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, union 
from typing import List

from database import get_db
from models import Role, User, Review, UserGames  
from dependencies import CurrentUser, CurrentAdmin
import schemas

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/profile/", response_model=schemas.UserOut)
async def get_profile(current_user: CurrentUser):
    return current_user

@router.put("/profile/", response_model=schemas.UserOut)
async def update_profile(
    user_update: schemas.UserUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    if user_update.email is not None:
        # Check if email is already taken by another user
        existing = db.query(User).filter(
            User.email == user_update.email,
            User.user_id != current_user.user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = user_update.email
    
    if user_update.display_name is not None:
        current_user.display_name = user_update.display_name
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/search/", response_model=List[schemas.UserPublicOut])
async def search_users(
    query: str = "",
    current_user: CurrentUser = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to search for users by username or display name.
    Used for finding friends to add.
    """
    if not query or len(query.strip()) == 0:
        # Return empty list if no query
        return []
    
    query = query.strip().lower()
    
    # Search by username or display_name
    users = db.query(User).filter(
        or_(
            User.username.ilike(f"%{query}%"),
            User.display_name.ilike(f"%{query}%")
        )
    ).offset(skip).limit(limit).all()
    
    # Filter out current user from results
    if current_user:
        users = [u for u in users if u.user_id != current_user.user_id]
    
    return users


@router.get("/{user_id}", response_model=schemas.UserPublicOut)
async def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return user

@router.get("/", response_model=List[schemas.UserOut])
async def get_all_users(
    current_admin: CurrentAdmin,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    # Don't let admin delete themselves
    if user_id == current_admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return None

@router.put("/{user_id}/role", response_model=schemas.UserOut)
async def change_user_role(
    user_id: str,
    new_role: Role,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user

# ASIM THIS IS NEW
@router.get("/active-users/", response_model=List[schemas.UserPublicOut])
async def get_active_users(
    db: Session = Depends(get_db),
    limit: int = 50
):
    """
    Get users who are active (have reviews OR games in collection).
    SET OPERATION: Uses UNION concept by combining two distinct queries.
    """
    try:
        # Query 1: Get user IDs who have written reviews
        users_with_reviews_ids = db.query(
            User.user_id
        ).join(
            Review, User.user_id == Review.user_id
        ).distinct().all()
        
        # Query 2: Get user IDs who have games in collection
        users_with_games_ids = db.query(
            User.user_id
        ).join(
            UserGames, User.user_id == UserGames.user_id
        ).distinct().all()
        
        # UNION: Combine and get unique user IDs (simulates UNION operation)
        active_user_ids = set()
        for (user_id,) in users_with_reviews_ids:
            active_user_ids.add(user_id)
        for (user_id,) in users_with_games_ids:
            active_user_ids.add(user_id)
        
        if not active_user_ids:
            return []
        
        # Fetch full user details for these IDs
        users = db.query(User).filter(
            User.user_id.in_(active_user_ids)
        ).order_by(
            User.join_date.desc()
        ).limit(limit).all()
        
        return users
        
    except Exception as e:
        print(f"Error in get_active_users: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch active users: {str(e)}"
        )