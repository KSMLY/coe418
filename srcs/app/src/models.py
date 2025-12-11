from sqlalchemy import Column, String, Integer, Text, DateTime, Date, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum

Base = declarative_base()

class PlayStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"  # Changed from "not_started"
    IN_PROGRESS = "IN_PROGRESS"  # Changed from "in_progress"
    COMPLETED = "COMPLETED"      # Changed from "completed"
    DROPPED = "DROPPED"          # Changed from "dropped"

class Rarity(enum.Enum):
    COMMON = "COMMON"           # Changed from "common"
    UNCOMMON = "UNCOMMON"       # Changed from "uncommon"
    RARE = "RARE"               # Changed from "rare"
    EPIC = "EPIC"               # Changed from "epic"
    LEGENDARY = "LEGENDARY"     # Changed from "legendary"

class FriendshipStatus(enum.Enum):
    PENDING = "PENDING"         # Changed from "pending"
    ACCEPTED = "ACCEPTED"       # Changed from "accepted"

class Role(enum.Enum):
    USER = 'USER'               # Changed from 'user'
    ADMIN = 'ADMIN'             # Changed from 'admin'

class User(Base):
    __tablename__ = "USER"
    
    user_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))
    join_date = Column(DateTime, default=datetime.utcnow)
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    profile_picture_url = Column(Text)

    games = relationship("UserGames", back_populates="user")
    achievements = relationship("UserAchievements", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    play_sessions = relationship("PlaySession", back_populates="user")
    friends_initiated = relationship(
        "Friends", 
        foreign_keys="Friends.user_id_initiator",
        back_populates="initiator"
    )
    friends_received = relationship(
        "Friends", 
        foreign_keys="Friends.user_id_recipient", 
        back_populates="recipient"
    )

class Game(Base):
    __tablename__ = "GAME"
    
    game_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    external_api_id = Column(String(100), unique=True)
    title = Column(String(255), nullable=False)
    developer = Column(String(100))
    release_date = Column(Date)
    cover_image_url = Column(Text)
    
    genres = relationship("GameGenre", back_populates="game")
    platforms = relationship("GamePlatform", back_populates="game")
    achievements = relationship("Achievement", back_populates="game")
    user_games = relationship("UserGames", back_populates="game")
    reviews = relationship("Review", back_populates="game")
    play_sessions = relationship("PlaySession", back_populates="game")

class GameGenre(Base):
    __tablename__ = "GAME_GENRE"
    
    game_id = Column(String(36), ForeignKey("GAME.game_id", ondelete="CASCADE"), primary_key=True)
    genre = Column(String(50), primary_key=True)
    
    game = relationship("Game", back_populates="genres")

class GamePlatform(Base):
    __tablename__ = "GAME_PLATFORM"
    
    game_id = Column(String(36), ForeignKey("GAME.game_id", ondelete="CASCADE"), primary_key=True)
    platform = Column(String(50), primary_key=True)
    
    game = relationship("Game", back_populates="platforms")

class Achievement(Base):
    __tablename__ = "ACHIEVEMENT"
    
    achievement_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String(36), ForeignKey("GAME.game_id", ondelete="CASCADE"), nullable=False)
    achievement_name = Column(String(100), nullable=False)
    description = Column(Text)
    rarity = Column(Enum(Rarity))
    points_value = Column(Integer, default=0)
    icon_url = Column(Text)

    game = relationship("Game", back_populates="achievements")
    user_achievements = relationship("UserAchievements", back_populates="achievement")

class UserGames(Base):
    __tablename__ = "USER_GAMES"
    
    user_id = Column(String(36), ForeignKey("USER.user_id", ondelete="CASCADE"), primary_key=True)
    game_id = Column(String(36), ForeignKey("GAME.game_id", ondelete="CASCADE"), primary_key=True)
    play_status = Column(Enum(PlayStatus), default=PlayStatus.NOT_STARTED)
    personal_notes = Column(Text)
    rating = Column(Integer)
    
    user = relationship("User", back_populates="games")
    game = relationship("Game", back_populates="user_games")

class UserAchievements(Base):
    __tablename__ = "USER_ACHIEVEMENTS"
    
    user_id = Column(String(36), ForeignKey("USER.user_id", ondelete="CASCADE"), primary_key=True)
    achievement_id = Column(String(36), ForeignKey("ACHIEVEMENT.achievement_id", ondelete="CASCADE"), primary_key=True)
    date_earned = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

class Review(Base):
    __tablename__ = "REVIEW"
    
    review_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("USER.user_id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String(36), ForeignKey("GAME.game_id", ondelete="CASCADE"), nullable=False)
    review_text = Column(Text)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="reviews")
    game = relationship("Game", back_populates="reviews")

class PlaySession(Base):
    __tablename__ = "PLAY_SESSION"
    
    session_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("USER.user_id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String(36), ForeignKey("GAME.game_id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    session_notes = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="play_sessions")
    game = relationship("Game", back_populates="play_sessions")

class Friends(Base):
    __tablename__ = "FRIENDS"
    
    friendship_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id_initiator = Column(String(36), ForeignKey("USER.user_id", ondelete="CASCADE"), nullable=False)
    user_id_recipient = Column(String(36), ForeignKey("USER.user_id", ondelete="CASCADE"), nullable=False)
    friendship_date = Column(DateTime, default=datetime.utcnow)
    friendship_status = Column(Enum(FriendshipStatus), default=FriendshipStatus.PENDING)
    
    # Relationships
    initiator = relationship("User", foreign_keys=[user_id_initiator], back_populates="friends_initiated")
    recipient = relationship("User", foreign_keys=[user_id_recipient], back_populates="friends_received")