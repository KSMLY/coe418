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
    
    return new_review

# Get all reviews for a game
@router.get("/games/{game_id}/", response_model=List[schemas.ReviewOut])
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
    
    reviews = db.query(Review).filter(
        Review.game_id == game_id
    ).offset(skip).limit(limit).all()
    
    return reviews

# Get specific review by ID
@router.get("/{review_id}/", response_model=schemas.ReviewOut)
async def get_review(
    review_id: str,
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return review

# Get current user's review for a specific game
@router.get("/games/{game_id}/my-review/", response_model=schemas.ReviewOut)
async def get_my_review_for_game(
    game_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(
        Review.user_id == current_user.user_id,
        Review.game_id == game_id
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="You haven't reviewed this game yet")
    
    return review

# Get all reviews by current user
@router.get("/my-reviews/", response_model=List[schemas.ReviewOut])
async def get_my_reviews(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    reviews = db.query(Review).filter(
        Review.user_id == current_user.user_id
    ).offset(skip).limit(limit).all()
    
    return reviews

# Get all reviews by a specific user (public)
@router.get("/users/{user_id}/", response_model=List[schemas.ReviewOut])
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
    
    reviews = db.query(Review).filter(
        Review.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    return reviews

# Update own review
@router.put("/{review_id}/", response_model=schemas.ReviewOut)
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
    
    return review

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