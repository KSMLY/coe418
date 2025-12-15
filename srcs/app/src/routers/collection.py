from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Game, UserGames
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

