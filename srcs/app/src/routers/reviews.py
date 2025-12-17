from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Review, Game, User, Role
from dependencies import CurrentUser, CurrentAdmin
import schemas

router = APIRouter(prefix="/reviews", tags=["Reviews"])

# Create review for a game
@router.post("/games/{game_id}/", response_model=schemas.ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    game_id: str,
    review_data: schemas.ReviewCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if user already reviewed this game
    existing = db.query(Review).filter(
        Review.user_id == current_user.user_id,
        Review.game_id == game_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="You already reviewed this game. Use PUT to update.")
    
    new_review = Review(
        user_id=current_user.user_id,
        game_id=game_id,
        review_text=review_data.review_text,
        rating=review_data.rating
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    # Add username to response
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    review_dict = {
        "review_id": new_review.review_id,
        "user_id": new_review.user_id,
        "game_id": new_review.game_id,
        "review_text": new_review.review_text,
        "rating": new_review.rating,
        "review_date": new_review.review_date,
        "username": user.username,
        "display_name": user.display_name
    }
    
    return review_dict

# Get all reviews for a game
@router.get("/games/{game_id}/", response_model=List[schemas.ReviewWithUserOut])
async def get_game_reviews(
    game_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Join Review with User to get username AND profile_picture_url
    reviews = db.query(Review, User).join(
        User, Review.user_id == User.user_id
    ).filter(
        Review.game_id == game_id
    ).offset(skip).limit(limit).all()
    
    # Format response with username AND profile_picture_url
    result = []
    for review, user in reviews:
        review_dict = {
            "review_id": review.review_id,
            "user_id": review.user_id,
            "game_id": review.game_id,
            "review_text": review.review_text,
            "rating": review.rating,
            "review_date": review.review_date,
            "username": user.username,
            "display_name": user.display_name,
            "profile_picture_url": user.profile_picture_url  
        }
        result.append(review_dict)
    
    return result

# Get specific review by ID
@router.get("/{review_id}/", response_model=schemas.ReviewWithUserOut)
async def get_review(
    review_id: str,
    db: Session = Depends(get_db)
):
    review_user = db.query(Review, User).join(
        User, Review.user_id == User.user_id
    ).filter(Review.review_id == review_id).first()
    
    if not review_user:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review, user = review_user
    review_dict = {
        "review_id": review.review_id,
        "user_id": review.user_id,
        "game_id": review.game_id,
        "review_text": review.review_text,
        "rating": review.rating,
        "review_date": review.review_date,
        "username": user.username,
        "display_name": user.display_name,
        "profile_picture_url": user.profile_picture_url 
    }
    
    return review_dict

# Get current user's review for a specific game
@router.get("/games/{game_id}/my-review/", response_model=schemas.ReviewWithUserOut)
async def get_my_review_for_game(
    game_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    review_user = db.query(Review, User).join(
        User, Review.user_id == User.user_id
    ).filter(
        Review.user_id == current_user.user_id,
        Review.game_id == game_id
    ).first()
    
    if not review_user:
        raise HTTPException(status_code=404, detail="You haven't reviewed this game yet")
    
    review, user = review_user
    review_dict = {
        "review_id": review.review_id,
        "user_id": review.user_id,
        "game_id": review.game_id,
        "review_text": review.review_text,
        "rating": review.rating,
        "review_date": review.review_date,
        "username": user.username,
        "display_name": user.display_name,
        "profile_picture_url": user.profile_picture_url 
    }
    
    return review_dict

# Get all reviews by current user
@router.get("/my-reviews/", response_model=List[schemas.ReviewWithUserOut])
async def get_my_reviews(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    reviews = db.query(Review, User).join(
        User, Review.user_id == User.user_id
    ).filter(
        Review.user_id == current_user.user_id
    ).offset(skip).limit(limit).all()
    
    result = []
    for review, user in reviews:
        review_dict = {
            "review_id": review.review_id,
            "user_id": review.user_id,
            "game_id": review.game_id,
            "review_text": review.review_text,
            "rating": review.rating,
            "review_date": review.review_date,
            "username": user.username,
            "display_name": user.display_name,
            "profile_picture_url": user.profile_picture_url 
        }
        result.append(review_dict)
    
    return result

# Get all reviews by a specific user (public)
@router.get("/users/{user_id}/", response_model=List[schemas.ReviewWithUserOut])
async def get_user_reviews(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    # Verify user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reviews = db.query(Review, User).join(
        User, Review.user_id == User.user_id
    ).filter(
        Review.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    result = []
    for review, user in reviews:
        review_dict = {
            "review_id": review.review_id,
            "user_id": review.user_id,
            "game_id": review.game_id,
            "review_text": review.review_text,
            "rating": review.rating,
            "review_date": review.review_date,
            "username": user.username,
            "display_name": user.display_name,
            "profile_picture_url": user.profile_picture_url 
        }
        result.append(review_dict)
    
    return result

# Update own review
@router.put("/{review_id}/", response_model=schemas.ReviewWithUserOut)
async def update_review(
    review_id: str,
    review_data: schemas.ReviewUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Only owner can update
    if review.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this review")
    
    # Update fields if provided
    if review_data.review_text is not None:
        review.review_text = review_data.review_text
    if review_data.rating is not None:
        review.rating = review_data.rating
    
    db.commit()
    db.refresh(review)
    
    # Add username to response
    user = db.query(User).filter(User.user_id == current_user.user_id).first()
    review_dict = {
        "review_id": review.review_id,
        "user_id": review.user_id,
        "game_id": review.game_id,
        "review_text": review.review_text,
        "rating": review.rating,
        "review_date": review.review_date,
        "username": user.username,
        "display_name": user.display_name,
        "profile_picture_url": user.profile_picture_url
    }
    
    return review_dict

# Delete review (owner or admin)
@router.delete("/{review_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Allow if owner OR admin
    if review.user_id != current_user.user_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    db.delete(review)
    db.commit()
    
    return None