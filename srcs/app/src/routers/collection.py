from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import text

from database import get_db
from models import Game, UserGames, Review, PlaySession
from dependencies import CurrentUser
import schemas

router = APIRouter(prefix="/collection", tags=["Collection"])

@router.post("/{game_id}/add/", status_code=status.HTTP_201_CREATED)
async def add_game_to_collection(
    game_id: str,
    collection_data: schemas.UserGameAdd,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    existing = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Game already in collection")
    
    user_game = UserGames(
        user_id=current_user.user_id,
        game_id=game_id,
        play_status=collection_data.play_status,
        personal_notes=collection_data.personal_notes,
        rating=collection_data.rating
    )
    
    db.add(user_game)
    db.commit()
    
    return {"message": "Game added to collection", "game_id": game_id}

@router.get("/", response_model=List[schemas.UserGameOut])
async def get_collection(
    current_user: CurrentUser,
    play_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(UserGames, Game).join(
        Game, UserGames.game_id == Game.game_id
    ).filter(UserGames.user_id == current_user.user_id)
    
    if play_status:
        query = query.filter(UserGames.play_status == play_status)
    
    results = query.all()
    
    collection = []
    for user_game, game in results:
        game_data = {
            "game_id": game.game_id,
            "title": game.title,
            "developer": game.developer,
            "release_date": game.release_date,
            "cover_image_url": game.cover_image_url,
            "play_status": user_game.play_status,
            "personal_notes": user_game.personal_notes,
            "rating": user_game.rating
        }
        collection.append(schemas.UserGameOut(**game_data))
    
    return collection

@router.put("/{game_id}/status/")
async def update_play_status(
    game_id: str,
    status_update: schemas.UserGameStatusUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user_game = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if not user_game:
        raise HTTPException(status_code=404, detail="Game not in collection")
    
    user_game.play_status = status_update.play_status
    db.commit()
    
    return {"message": "Play status updated", "play_status": status_update.play_status}

@router.put("/{game_id}/rating/")
async def update_rating(
    game_id: str,
    rating_update: schemas.UserGameRatingUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user_game = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if not user_game:
        raise HTTPException(status_code=404, detail="Game not in collection")
    
    user_game.rating = rating_update.rating
    db.commit()
    
    return {"message": "Rating updated", "rating": rating_update.rating}

@router.put("/{game_id}/notes/")
async def update_notes(
    game_id: str,
    notes_update: schemas.UserGameNotesUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user_game = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if not user_game:
        raise HTTPException(status_code=404, detail="Game not in collection")
    
    user_game.personal_notes = notes_update.personal_notes
    db.commit()
    
    return {"message": "Notes updated"}

@router.get("/user/{user_id}/", response_model=List[schemas.UserGameOut])
async def get_user_collection(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get a user's public collection."""
    query = db.query(UserGames, Game).join(
        Game, UserGames.game_id == Game.game_id
    ).filter(UserGames.user_id == user_id)
    
    results = query.all()
    
    collection = []
    for user_game, game in results:
        game_data = {
            "game_id": game.game_id,
            "title": game.title,
            "developer": game.developer,
            "release_date": game.release_date,
            "cover_image_url": game.cover_image_url,
            "play_status": user_game.play_status,
            "personal_notes": user_game.personal_notes,
            "rating": user_game.rating
        }
        collection.append(schemas.UserGameOut(**game_data))
    
    return collection


@router.delete("/{game_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_collection(
    game_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user_game = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if not user_game:
        raise HTTPException(status_code=404, detail="Game not in collection")
    
    db.delete(user_game)
    db.commit()
    
    return None

# ASIM THIS IS NEW
@router.delete("/{game_id}/complete-removal/", status_code=status.HTTP_200_OK)
async def complete_game_removal(
    game_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Verify user owns the game
    user_game = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if not user_game:
        raise HTTPException(
            status_code=404, 
            detail="Game not in your collection"
        )
    
    try:
        # BEGIN TRANSACTION
        db.execute(text("BEGIN"))
        
        # Step 1: Count what we're about to delete
        review = db.query(Review).filter(
            Review.user_id == current_user.user_id,
            Review.game_id == game_id
        ).first()
        
        sessions = db.query(PlaySession).filter(
            PlaySession.user_id == current_user.user_id,
            PlaySession.game_id == game_id
        ).all()
        
        review_count = 1 if review else 0
        session_count = len(sessions)
        
        # Step 2: Delete review if exists
        if review:
            db.delete(review)
            db.flush()
        
        # Step 3: Delete all play sessions
        for session in sessions:
            db.delete(session)
        db.flush()
        
        # Step 4: Remove from collection
        db.delete(user_game)
        db.flush()
        
        # COMMIT - All deletions succeeded
        db.execute(text("COMMIT"))
        
        return {
            "message": "Game and all related data removed successfully",
            "game_id": game_id,
            "deleted": {
                "collection_entry": True,
                "reviews": review_count,
                "play_sessions": session_count
            }
        }
        
    except Exception as e:
        # ROLLBACK - Undo everything if any step failed
        db.execute(text("ROLLBACK"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove game: {str(e)}"
        )
    
# ASIM THIS IS NEW    
@router.put("/{game_id}/complete-with-review-check/")
async def mark_complete_with_review_prompt(
    game_id: str,
    rating: int = None,
    current_user = CurrentUser,
    db: Session = Depends(get_db)
):
    user_game = db.query(UserGames).filter(
        UserGames.user_id == current_user.user_id,
        UserGames.game_id == game_id
    ).first()
    
    if not user_game:
        raise HTTPException(
            status_code=404,
            detail="Game not in collection"
        )
    
    try:
        # BEGIN TRANSACTION
        db.execute(text("BEGIN"))
        
        # Step 1: Update play status to COMPLETED
        old_status = user_game.play_status
        user_game.play_status = PlayStatus.COMPLETED
        db.flush()
        
        # Step 2: Check if review exists
        existing_review = db.query(Review).filter(
            Review.user_id == current_user.user_id,
            Review.game_id == game_id
        ).first()
        
        review_created = False
        review_id = None
        
        # Step 3: Create review if rating provided and no review exists
        if rating is not None and not existing_review:
            if rating < 1 or rating > 5:
                db.execute(text("ROLLBACK"))
                raise HTTPException(
                    status_code=400,
                    detail="Rating must be between 1 and 5"
                )
            
            new_review = Review(
                user_id=current_user.user_id,
                game_id=game_id,
                rating=rating,
                review_text=None  # Can add text later
            )
            db.add(new_review)
            db.flush()
            review_created = True
            review_id = new_review.review_id
        
        # COMMIT - Both status update and review creation succeeded
        db.execute(text("COMMIT"))
        
        return {
            "message": "Game marked as completed",
            "game_id": game_id,
            "previous_status": old_status.value,
            "new_status": "COMPLETED",
            "review_created": review_created,
            "review_id": review_id,
            "needs_review": not existing_review and not review_created
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # ROLLBACK - Undo everything
        db.execute(text("ROLLBACK"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update game: {str(e)}"
        )