from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List

from database import get_db
from models import Friends, User, FriendshipStatus, Role
from dependencies import CurrentUser, CurrentAdmin
import schemas

router = APIRouter(prefix="/friends", tags=["Friends"])

# Send friend request
@router.post("/{user_id}/request/", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    user_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    recipient = db.query(User).filter(User.user_id == user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = db.query(Friends).filter(
        or_(
            and_(
                Friends.user_id_initiator == current_user.user_id,
                Friends.user_id_recipient == user_id
            ),
            and_(
                Friends.user_id_initiator == user_id,
                Friends.user_id_recipient == current_user.user_id
            )
        )
    ).first()
    
    if existing:
        if existing.friendship_status == FriendshipStatus.ACCEPTED:
            raise HTTPException(status_code=409, detail="Already friends")
        else:
            raise HTTPException(status_code=409, detail="Friend request already pending")
    
    friend_request = Friends(
        user_id_initiator=current_user.user_id,
        user_id_recipient=user_id,
        friendship_status=FriendshipStatus.PENDING
    )
    
    db.add(friend_request)
    db.commit()
    db.refresh(friend_request)
    
    return {"message": "Friend request sent", "friendship_id": friend_request.friendship_id}

# Accept friend request
@router.put("/{friendship_id}/accept/")
async def accept_friend_request(
    friendship_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    friendship = db.query(Friends).filter(Friends.friendship_id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.user_id_recipient != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")
    
    if friendship.friendship_status == FriendshipStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Friend request already accepted")
    
    friendship.friendship_status = FriendshipStatus.ACCEPTED
    db.commit()
    db.refresh(friendship)
    
    return {"message": "Friend request accepted"}

# Get all friends (accepted friendships)
@router.get("/")
async def get_friends(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    friendships = db.query(Friends).filter(
        or_(
            Friends.user_id_initiator == current_user.user_id,
            Friends.user_id_recipient == current_user.user_id
        ),
        Friends.friendship_status == FriendshipStatus.ACCEPTED
    ).all()
    
    return friendships

# Get pending friend requests (received) - WITH USER INFO
@router.get("/requests/incoming/")
async def get_incoming_requests(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Get pending requests where current user is recipient
    requests = db.query(Friends, User).join(
        User, Friends.user_id_initiator == User.user_id
    ).filter(
        Friends.user_id_recipient == current_user.user_id,
        Friends.friendship_status == FriendshipStatus.PENDING
    ).all()
    
    # Format response with initiator info
    result = []
    for friendship, initiator in requests:
        request_dict = {
            "friendship_id": friendship.friendship_id,
            "user_id_initiator": friendship.user_id_initiator,
            "user_id_recipient": friendship.user_id_recipient,
            "friendship_date": friendship.friendship_date,
            "friendship_status": friendship.friendship_status.value,
            "initiator_username": initiator.username,
            "initiator_display_name": initiator.display_name,
            "initiator_profile_picture_url": initiator.profile_picture_url
        }
        result.append(request_dict)
    
    return result

# Get pending friend requests (sent) - WITH USER INFO
@router.get("/requests/outgoing/")
async def get_outgoing_requests(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Get pending requests where current user is initiator
    requests = db.query(Friends, User).join(
        User, Friends.user_id_recipient == User.user_id
    ).filter(
        Friends.user_id_initiator == current_user.user_id,
        Friends.friendship_status == FriendshipStatus.PENDING
    ).all()
    
    # Format response with recipient info
    result = []
    for friendship, recipient in requests:
        request_dict = {
            "friendship_id": friendship.friendship_id,
            "user_id_initiator": friendship.user_id_initiator,
            "user_id_recipient": friendship.user_id_recipient,
            "friendship_date": friendship.friendship_date,
            "friendship_status": friendship.friendship_status.value,
            "recipient_username": recipient.username,
            "recipient_display_name": recipient.display_name,
            "recipient_profile_picture_url": recipient.profile_picture_url
        }
        result.append(request_dict)
    
    return result

# Reject/Cancel friend request
@router.delete("/{friendship_id}/reject/", status_code=status.HTTP_204_NO_CONTENT)
async def reject_friend_request(
    friendship_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    friendship = db.query(Friends).filter(Friends.friendship_id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.friendship_status != FriendshipStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only reject pending requests")
    
    if friendship.user_id_recipient != current_user.user_id and friendship.user_id_initiator != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this request")
    
    db.delete(friendship)
    db.commit()
    
    return None

# Remove friend (unfriend)
@router.delete("/{friendship_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    friendship_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    friendship = db.query(Friends).filter(Friends.friendship_id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    is_involved = (
        friendship.user_id_initiator == current_user.user_id or 
        friendship.user_id_recipient == current_user.user_id
    )
    
    if not is_involved and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to remove this friendship")
    
    db.delete(friendship)
    db.commit()
    
    return None

# Check if two users are friends
@router.get("/check/{user_id}/")
async def check_friendship(
    user_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    friendship = db.query(Friends).filter(
        or_(
            and_(
                Friends.user_id_initiator == current_user.user_id,
                Friends.user_id_recipient == user_id
            ),
            and_(
                Friends.user_id_initiator == user_id,
                Friends.user_id_recipient == current_user.user_id
            )
        )
    ).first()
    
    if not friendship:
        return {
            "are_friends": False,
            "status": None,
            "friendship_id": None
        }
    
    return {
        "are_friends": friendship.friendship_status == FriendshipStatus.ACCEPTED,
        "status": friendship.friendship_status.value,
        "friendship_id": friendship.friendship_id,
        "initiated_by_current_user": friendship.user_id_initiator == current_user.user_id
    }

# Get friend details (list with user info)
@router.get("/details/")
async def get_friends_with_details(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    friendships = db.query(Friends).filter(
        or_(
            Friends.user_id_initiator == current_user.user_id,
            Friends.user_id_recipient == current_user.user_id
        ),
        Friends.friendship_status == FriendshipStatus.ACCEPTED
    ).all()
    
    friends_list = []
    for friendship in friendships:
        friend_id = (
            friendship.user_id_recipient 
            if friendship.user_id_initiator == current_user.user_id 
            else friendship.user_id_initiator
        )
        
        friend = db.query(User).filter(User.user_id == friend_id).first()
        if friend:
            friends_list.append({
                "friendship_id": friendship.friendship_id,
                "friend_user_id": friend.user_id,
                "friend_username": friend.username,
                "friend_display_name": friend.display_name,
                "friend_profile_picture_url": friend.profile_picture_url,
                "friendship_date": friendship.friendship_date
            })
    
    return {"friends": friends_list, "count": len(friends_list)}

# Get mutual friends with another user
@router.get("/mutual/{user_id}/")
async def get_mutual_friends(
    user_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    other_user = db.query(User).filter(User.user_id == user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user_friends = db.query(Friends).filter(
        or_(
            Friends.user_id_initiator == current_user.user_id,
            Friends.user_id_recipient == current_user.user_id
        ),
        Friends.friendship_status == FriendshipStatus.ACCEPTED
    ).all()
    
    current_user_friend_ids = set()
    for friendship in current_user_friends:
        friend_id = (
            friendship.user_id_recipient 
            if friendship.user_id_initiator == current_user.user_id 
            else friendship.user_id_initiator
        )
        current_user_friend_ids.add(friend_id)
    
    other_user_friends = db.query(Friends).filter(
        or_(
            Friends.user_id_initiator == user_id,
            Friends.user_id_recipient == user_id
        ),
        Friends.friendship_status == FriendshipStatus.ACCEPTED
    ).all()
    
    other_user_friend_ids = set()
    for friendship in other_user_friends:
        friend_id = (
            friendship.user_id_recipient 
            if friendship.user_id_initiator == user_id 
            else friendship.user_id_initiator
        )
        other_user_friend_ids.add(friend_id)
    
    mutual_friend_ids = current_user_friend_ids.intersection(other_user_friend_ids)
    
    mutual_friends = []
    for friend_id in mutual_friend_ids:
        friend = db.query(User).filter(User.user_id == friend_id).first()
        if friend:
            mutual_friends.append({
                "user_id": friend.user_id,
                "username": friend.username,
                "display_name": friend.display_name,
                "profile_picture_url": friend.profile_picture_url
            })
    
    return {
        "mutual_friends": mutual_friends,
        "count": len(mutual_friends)
    }