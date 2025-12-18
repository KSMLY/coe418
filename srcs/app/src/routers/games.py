from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional

from database import get_db
from models import Game, GameGenre, GamePlatform, Review, UserGames, PlaySession
from dependencies import CurrentAdmin, CurrentUser
from services.rawg import rawg_service
import schemas

router = APIRouter(prefix="/games", tags=["Games"])

# PUBLIC - Search RAWG
@router.get("/search-rawg/")
async def search_rawg_games(
    search: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Search for games in RAWG database."""
    try:
        results = await rawg_service.search_games(search, limit)
        formatted_results = [rawg_service.format_game_data(game) for game in results]
        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAWG API error: {str(e)}")

# ASIM THIS IS NEW!!
@router.get("/top-rated/", response_model=List[schemas.GameDetailOut])
async def get_top_rated_games(
    db: Session = Depends(get_db),
    limit: int = 10
):
    """
    Get games with average rating higher than the overall average.
    NESTED QUERY: Uses a scalar subquery to compare each game's average rating 
    against the global average.
    """
    try:
        # First, check if there are any reviews at all
        total_reviews = db.query(func.count(Review.review_id)).scalar()
        if total_reviews == 0:
            return []
        
        # NESTED SUBQUERY: Calculate overall average rating across ALL reviews
        overall_avg_subquery = db.query(
            func.avg(Review.rating)
        ).scalar_subquery()
        
        # Main query: Get games where their average rating is above the overall average
        games_above_avg = db.query(Game).join(
            Review, Game.game_id == Review.game_id
        ).group_by(Game.game_id).having(
            func.avg(Review.rating) > overall_avg_subquery
        ).order_by(
            func.avg(Review.rating).desc()
        ).limit(limit).all()
        
        if not games_above_avg:
            return []
        
        # Format response with genres and platforms
        result = []
        for game in games_above_avg:
            game_dict = {
                "game_id": game.game_id,
                "external_api_id": game.external_api_id,
                "title": game.title,
                "developer": game.developer,
                "release_date": game.release_date,
                "cover_image_url": game.cover_image_url,
                "genres": [g.genre for g in game.genres],
                "platforms": [p.platform for p in game.platforms]
            }
            result.append(schemas.GameDetailOut(**game_dict))
        
        return result
        
    except Exception as e:
        print(f"Error in get_top_rated_games: {e}")
        import traceback
        traceback.print_exc()
        return []


# ASIM THIS IS NEW
@router.get("/statistics/")
async def get_game_statistics(
    db: Session = Depends(get_db),
    min_reviews: int = 1
):
    """
    Get comprehensive game statistics using GROUP BY with multiple aggregations.
    Demonstrates: GROUP BY, multiple JOINs, aggregate functions (COUNT, AVG)
    """
    try:
        # Build query with joins and aggregates
        stats_query = db.query(
            Game.game_id,
            Game.title,
            Game.developer,
            Game.cover_image_url,
            func.count(func.distinct(Review.review_id)).label('review_count'),
            func.coalesce(func.avg(Review.rating), 0).label('average_rating'),
            func.count(func.distinct(UserGames.user_id)).label('user_count'),
            func.count(func.distinct(PlaySession.session_id)).label('total_sessions')
        ).outerjoin(
            Review, Game.game_id == Review.game_id
        ).outerjoin(
            UserGames, Game.game_id == UserGames.game_id
        ).outerjoin(
            PlaySession, Game.game_id == PlaySession.game_id
        ).group_by(
            Game.game_id, Game.title, Game.developer, Game.cover_image_url
        ).having(
            func.count(func.distinct(Review.review_id)) >= min_reviews
        ).order_by(
            func.coalesce(func.avg(Review.rating), 0).desc(),
            func.count(func.distinct(Review.review_id)).desc()
        ).all()
        
        stats = []
        for row in stats_query:
            stats.append({
                "game_id": row.game_id,
                "title": row.title,
                "developer": row.developer,
                "cover_image_url": row.cover_image_url,
                "review_count": row.review_count,
                "average_rating": float(row.average_rating) if row.average_rating else 0.0,
                "user_count": row.user_count,
                "total_sessions": row.total_sessions
            })
        
        return stats
        
    except Exception as e:
        print(f"Error in get_game_statistics: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch statistics: {str(e)}"
        )




@router.post("/import-from-rawg/{rawg_id}", response_model=schemas.GameOut, status_code=status.HTTP_201_CREATED)
async def import_game_from_rawg(
    rawg_id: int,
    current_user: CurrentUser,  # Changed from CurrentAdmin to CurrentUser
    db: Session = Depends(get_db)
):
    """Import a game from RAWG into the local database (Authenticated users)."""
    # Check if already exists
    existing = db.query(Game).filter(Game.external_api_id == str(rawg_id)).first()
    if existing:
        # Return existing game instead of error (allow adding to collection)
        return existing
    
    # Fetch from RAWG
    try:
        rawg_data = await rawg_service.get_game_by_id(rawg_id)
        if not rawg_data:
            raise HTTPException(status_code=404, detail="Game not found in RAWG")
        
        formatted = rawg_service.format_game_data(rawg_data)
        
        # Create game in database
        new_game = Game(
            external_api_id=formatted["external_api_id"],
            title=formatted["title"],
            developer=formatted["developer"],
            release_date=formatted["release_date"],
            cover_image_url=formatted["cover_image_url"]
        )
        
        db.add(new_game)
        db.flush()
        
        # Add genres
        for genre in formatted.get("genres", []):
            db.add(GameGenre(game_id=new_game.game_id, genre=genre))
        
        # Add platforms
        for platform in formatted.get("platforms", []):
            db.add(GamePlatform(game_id=new_game.game_id, platform=platform))
        
        db.commit()
        db.refresh(new_game)
        
        return new_game
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error importing game: {str(e)}")

# ADMIN ONLY - Create game manually
@router.post("/", response_model=schemas.GameOut, status_code=status.HTTP_201_CREATED)
async def create_game(
    game_data: schemas.GameCreate,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    """Create a new game entry manually (Admin only)."""
    if game_data.external_api_id:
        existing = db.query(Game).filter(
            Game.external_api_id == game_data.external_api_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Game with this external API ID already exists")
    
    new_game = Game(
        external_api_id=game_data.external_api_id,
        title=game_data.title,
        developer=game_data.developer,
        release_date=game_data.release_date,
        cover_image_url=game_data.cover_image_url
    )
    
    db.add(new_game)
    db.flush()
    
    for genre in game_data.genres or []:
        db.add(GameGenre(game_id=new_game.game_id, genre=genre))
    
    for platform in game_data.platforms or []:
        db.add(GamePlatform(game_id=new_game.game_id, platform=platform))
    
    db.commit()
    db.refresh(new_game)
    
    return new_game

# PUBLIC - Browse/search games in local database
@router.get("/", response_model=List[schemas.GameDetailOut])
async def get_games(
    search: Optional[str] = None,
    genre: Optional[str] = None,
    platform: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Browse and search games in local database."""
    query = db.query(Game)
    
    if search:
        query = query.filter(
            or_(
                Game.title.ilike(f"%{search}%"),
                Game.developer.ilike(f"%{search}%")
            )
        )
    
    if genre:
        query = query.join(GameGenre).filter(GameGenre.genre == genre)
    
    if platform:
        query = query.join(GamePlatform).filter(GamePlatform.platform == platform)
    
    games = query.offset(skip).limit(limit).all()
    
    result = []
    for game in games:
        game_dict = {
            "game_id": game.game_id,
            "external_api_id": game.external_api_id,
            "title": game.title,
            "developer": game.developer,
            "release_date": game.release_date,
            "cover_image_url": game.cover_image_url,
            "genres": [g.genre for g in game.genres],
            "platforms": [p.platform for p in game.platforms]
        }
        result.append(schemas.GameDetailOut(**game_dict))
    
    return result

# PUBLIC - Get specific game
@router.get("/{game_id}/", response_model=schemas.GameDetailOut)
async def get_game(game_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a specific game."""
    game = db.query(Game).filter(Game.game_id == game_id).first()
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_dict = {
        "game_id": game.game_id,
        "external_api_id": game.external_api_id,
        "title": game.title,
        "developer": game.developer,
        "release_date": game.release_date,
        "cover_image_url": game.cover_image_url,
        "genres": [g.genre for g in game.genres],
        "platforms": [p.platform for p in game.platforms]
    }
    
    return schemas.GameDetailOut(**game_dict)

# ADMIN ONLY - Update game
@router.put("/{game_id}/", response_model=schemas.GameOut)
async def update_game(
    game_id: str,
    game_data: schemas.GameCreate,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    """Update game information (Admin only)."""
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Update basic fields
    game.title = game_data.title
    if game_data.developer is not None:
        game.developer = game_data.developer
    if game_data.release_date is not None:
        game.release_date = game_data.release_date
    if game_data.cover_image_url is not None:
        game.cover_image_url = game_data.cover_image_url
    if game_data.external_api_id is not None:
        game.external_api_id = game_data.external_api_id
    
    # Update genres
    if game_data.genres is not None:
        db.query(GameGenre).filter(GameGenre.game_id == game_id).delete()
        for genre in game_data.genres:
            db.add(GameGenre(game_id=game_id, genre=genre))
    
    # Update platforms
    if game_data.platforms is not None:
        db.query(GamePlatform).filter(GamePlatform.game_id == game_id).delete()
        for platform in game_data.platforms:
            db.add(GamePlatform(game_id=game_id, platform=platform))
    
    db.commit()
    db.refresh(game)
    return game

# ADMIN ONLY - Delete game
@router.delete("/{game_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    game_id: str,
    current_admin: CurrentAdmin,
    db: Session = Depends(get_db)
):
    """Delete a game (Admin only)."""
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    db.delete(game)
    db.commit()
    return None

