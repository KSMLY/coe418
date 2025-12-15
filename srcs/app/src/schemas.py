from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List
from models import Role, PlayStatus, Rarity, FriendshipStatus 

# ============= USER SCHEMAS =============

# POST /register/ (Input)
class UserCreate(BaseModel):
    username: str = Field(..., max_length=50)
    email: EmailStr = Field(..., max_length=100)
    password: str = Field(..., min_length=8, max_length=32)
    display_name: Optional[str] = Field(None, max_length=100)

# POST /login/ (Input)
class UserLogin(BaseModel):
    username: str 
    password: str

# GET /profile/, POST /register/ (Output)
class UserOut(BaseModel):
    user_id: str
    username: str
    email: EmailStr
    display_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: Role
    join_date: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True  # This returns the enum value instead of the enum object

# GET /users/{user_id} (Output for public viewing)
class UserPublicOut(BaseModel):
    user_id: str
    username: str
    display_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: Role
    join_date: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True

# PUT /profile/ (Input)
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)

# ============= GAME SCHEMAS =============

# POST /games/ (Input - Create new game in database)
class GameCreate(BaseModel):
    external_api_id: Optional[str] = Field(None, max_length=100)
    title: str = Field(..., max_length=255)
    developer: Optional[str] = Field(None, max_length=100)
    release_date: Optional[date] = None
    cover_image_url: Optional[str] = None
    genres: Optional[List[str]] = []
    platforms: Optional[List[str]] = []

# GET /games/, GET /games/{game_id}/ (Output)
class GameOut(BaseModel):
    game_id: str
    external_api_id: Optional[str] = None
    title: str
    developer: Optional[str] = None
    release_date: Optional[date] = None
    cover_image_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# GET /games/ with genres and platforms
class GameDetailOut(BaseModel):
    game_id: str
    external_api_id: Optional[str] = None
    title: str
    developer: Optional[str] = None
    release_date: Optional[date] = None
    cover_image_url: Optional[str] = None
    genres: List[str] = []
    platforms: List[str] = []
    
    class Config:
        from_attributes = True

# ============= COLLECTION SCHEMAS =============

# POST /collection/{game_id}/add/ (Input)
class UserGameAdd(BaseModel):
    play_status: Optional[PlayStatus] = PlayStatus.NOT_STARTED
    personal_notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    
    class Config:
        use_enum_values = True

# PUT /collection/{game_id}/status/ (Input)
class UserGameStatusUpdate(BaseModel):
    play_status: PlayStatus
    
    class Config:
        use_enum_values = True

# PUT /collection/{game_id}/rating/ (Input)
class UserGameRatingUpdate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Personal rating from 1 to 5.")

# PUT /collection/{game_id}/notes/ (Input)
class UserGameNotesUpdate(BaseModel):
    personal_notes: Optional[str] = None

# GET /collection/ (Output)
class UserGameOut(BaseModel):
    game_id: str
    title: str
    developer: Optional[str] = None
    release_date: Optional[date] = None
    cover_image_url: Optional[str] = None
    
    # UserGames data
    play_status: PlayStatus
    personal_notes: Optional[str] = None
    rating: Optional[int] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True

# ============= ACHIEVEMENT SCHEMAS =============

# POST /achievements/games/{game_id}/achievements/ (Input)
class AchievementCreate(BaseModel):
    achievement_name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon_url: Optional[str] = None
    rarity: Optional[Rarity] = None
    points_value: int = Field(default=0, ge=0)
    
    class Config:
        use_enum_values = True

# Base Achievement Definition (Output for GET /collection/{game_id}/achievements/)
class AchievementOut(BaseModel):
    achievement_id: str
    achievement_name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    rarity: Optional[Rarity] = None
    points_value: int
    
    class Config:
        from_attributes = True
        use_enum_values = True

# Combined User Achievement Data (Output for GET /collection/{game_id}/achievements/)
class UserAchievementOut(AchievementOut):
    date_earned: datetime

# POST /achievements/{achievement_id}/complete/ (Input)
class UserAchievementComplete(BaseModel):
    date_earned: Optional[datetime] = None

# ============= REVIEW SCHEMAS =============

# POST /games/{game_id}/reviews/ (Input)
class ReviewCreate(BaseModel):
    review_text: Optional[str] = None
    rating: int = Field(..., ge=1, le=5, description="Review rating from 1 to 5 stars.")

# PUT /reviews/{review_id}/ (Input)
class ReviewUpdate(BaseModel):
    review_text: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)

# GET /games/{game_id}/reviews/ (Output)
class ReviewOut(BaseModel):
    review_id: str
    user_id: str
    game_id: str
    review_text: Optional[str] = None
    rating: int
    review_date: datetime
 
# GET /reviews/games/{game_id}/ with username (Output)
class ReviewWithUserOut(BaseModel):
    review_id: str
    user_id: str
    game_id: str
    review_text: Optional[str] = None
    rating: int
    review_date: datetime
    username: str
    display_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
     
    class Config:
        from_attributes = True

# ============= FRIENDS SCHEMAS =============

# GET /friends/ (Output)
class FriendRequestOut(BaseModel):
    friendship_id: str
    user_id_initiator: str
    user_id_recipient: str
    friendship_date: datetime
    friendship_status: FriendshipStatus
    
 # Friend Request with User Info (Output)
class FriendRequestWithUserOut(BaseModel):
    friendship_id: str
    user_id_initiator: str
    user_id_recipient: str
    friendship_date: datetime
    friendship_status: FriendshipStatus
    # Optional fields for user info
    initiator_username: Optional[str] = None
    initiator_display_name: Optional[str] = None
    initiator_profile_picture_url: Optional[str] = None
    recipient_username: Optional[str] = None
    recipient_display_name: Optional[str] = None
    recipient_profile_picture_url: Optional[str] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True

# ============= PLAY SESSION SCHEMAS =============
        
# POST /sessions/start/ (Input)
class PlaySessionStart(BaseModel):
    game_id: str
    start_time: Optional[datetime] = None 

# PUT /sessions/{session_id}/end/ (Input)
class PlaySessionEnd(BaseModel):
    end_time: Optional[datetime] = None
    session_notes: Optional[str] = None

# Output
class PlaySessionOut(BaseModel):
    session_id: int
    user_id: str
    game_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    session_notes: Optional[str] = None
    
    class Config:
        from_attributes = True