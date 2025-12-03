from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import PlaySession, Game, Role
from dependencies import CurrentUser, CurrentAdmin
import schemas

router = APIRouter(prefix="/sessions", tags=["Play Sessions"])

# Start a play session
@router.post("/start/", response_model=schemas.PlaySessionOut, status_code=status.HTTP_201_CREATED)
async def start_play_session(
    session_data: schemas.PlaySessionStart,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == session_data.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if user has an active session for this game (no end_time)
    active_session = db.query(PlaySession).filter(
        PlaySession.user_id == current_user.user_id,
        PlaySession.game_id == session_data.game_id,
        PlaySession.end_time == None
    ).first()
    
    if active_session:
        raise HTTPException(
            status_code=409,
            detail="You already have an active session for this game. End it first."
        )
    
    # Create new session
    start_time = session_data.start_time if session_data.start_time else datetime.utcnow()
    
    new_session = PlaySession(
        user_id=current_user.user_id,
        game_id=session_data.game_id,
        start_time=start_time
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session

# End a play session
@router.put("/{session_id}/end/", response_model=schemas.PlaySessionOut)
async def end_play_session(
    session_id: int,
    session_data: schemas.PlaySessionEnd,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    session = db.query(PlaySession).filter(PlaySession.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Play session not found")
    
    # Only owner can end their session
    if session.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to end this session")
    
    # Check if already ended
    if session.end_time is not None:
        raise HTTPException(status_code=400, detail="Session already ended")
    
    # End the session
    end_time = session_data.end_time if session_data.end_time else datetime.utcnow()
    
    # Validate end_time is after start_time
    if end_time <= session.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    session.end_time = end_time
    if session_data.session_notes:
        session.session_notes = session_data.session_notes
    
    db.commit()
    db.refresh(session)
    
    return session

# Get all play sessions for current user
@router.get("/", response_model=List[schemas.PlaySessionOut])
async def get_my_sessions(
    current_user: CurrentUser,
    game_id: Optional[str] = None,
    active_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(PlaySession).filter(PlaySession.user_id == current_user.user_id)
    
    # Filter by game if specified
    if game_id:
        query = query.filter(PlaySession.game_id == game_id)
    
    # Filter active sessions only (no end_time)
    if active_only:
        query = query.filter(PlaySession.end_time == None)
    
    # Order by most recent first
    query = query.order_by(PlaySession.start_time.desc())
    
    sessions = query.offset(skip).limit(limit).all()
    
    return sessions

# Get specific session by ID
@router.get("/{session_id}/", response_model=schemas.PlaySessionOut)
async def get_session(
    session_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    session = db.query(PlaySession).filter(PlaySession.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Play session not found")
    
    # Only owner can view their session (unless admin)
    if session.user_id != current_user.user_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
    
    return session

# Get all sessions for a specific game (current user)
@router.get("/games/{game_id}/", response_model=List[schemas.PlaySessionOut])
async def get_my_game_sessions(
    game_id: str,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    sessions = db.query(PlaySession).filter(
        PlaySession.user_id == current_user.user_id,
        PlaySession.game_id == game_id
    ).order_by(PlaySession.start_time.desc()).offset(skip).limit(limit).all()
    
    return sessions

# Update session notes
@router.put("/{session_id}/notes/", response_model=schemas.PlaySessionOut)
async def update_session_notes(
    session_id: int,
    notes: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    session = db.query(PlaySession).filter(PlaySession.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Play session not found")
    
    # Only owner can update
    if session.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this session")
    
    session.session_notes = notes
    db.commit()
    db.refresh(session)
    
    return session

# Delete session (owner or admin)
@router.delete("/{session_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    session = db.query(PlaySession).filter(PlaySession.session_id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Play session not found")
    
    # Allow if owner OR admin
    if session.user_id != current_user.user_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    
    db.delete(session)
    db.commit()
    
    return None

# Get total playtime for a game (current user)
@router.get("/games/{game_id}/playtime/")
async def get_game_playtime(
    game_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Verify game exists
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get all completed sessions for this game
    sessions = db.query(PlaySession).filter(
        PlaySession.user_id == current_user.user_id,
        PlaySession.game_id == game_id,
        PlaySession.end_time != None
    ).all()
    
    # Calculate total playtime in seconds
    total_seconds = 0
    for session in sessions:
        duration = (session.end_time - session.start_time).total_seconds()
        total_seconds += duration
    
    # Convert to hours and minutes
    total_hours = int(total_seconds // 3600)
    remaining_minutes = int((total_seconds % 3600) // 60)
    
    return {
        "game_id": game_id,
        "total_seconds": int(total_seconds),
        "total_hours": total_hours,
        "remaining_minutes": remaining_minutes,
        "formatted": f"{total_hours}h {remaining_minutes}m",
        "session_count": len(sessions)
    }

# Get all-time playtime stats (current user)
@router.get("/stats/playtime/")
async def get_playtime_stats(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Get all completed sessions
    sessions = db.query(PlaySession).filter(
        PlaySession.user_id == current_user.user_id,
        PlaySession.end_time != None
    ).all()
    
    # Calculate total and per-game stats
    total_seconds = 0
    game_stats = {}
    
    for session in sessions:
        duration = (session.end_time - session.start_time).total_seconds()
        total_seconds += duration
        
        if session.game_id not in game_stats:
            game_stats[session.game_id] = {
                "total_seconds": 0,
                "session_count": 0
            }
        
        game_stats[session.game_id]["total_seconds"] += duration
        game_stats[session.game_id]["session_count"] += 1
    
    # Convert to hours
    total_hours = int(total_seconds // 3600)
    
    # Find most played game
    most_played_game_id = None
    most_played_seconds = 0
    
    for game_id, stats in game_stats.items():
        if stats["total_seconds"] > most_played_seconds:
            most_played_seconds = stats["total_seconds"]
            most_played_game_id = game_id
    
    return {
        "total_playtime_seconds": int(total_seconds),
        "total_playtime_hours": total_hours,
        "total_sessions": len(sessions),
        "unique_games_played": len(game_stats),
        "most_played_game_id": most_played_game_id,
        "most_played_game_hours": int(most_played_seconds // 3600)
    }