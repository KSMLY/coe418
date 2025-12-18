import React, { useState, useEffect } from 'react';
import { Search, LogOut, Library, Star, Calendar, Gamepad2, Plus, Loader, AlertCircle, MessageSquare, Edit2, Trash2, User, Users, Clock, BarChart3, Award, Play, Square, Check, X, Send, ArrowLeft, Upload} from 'lucide-react';

// API Configuration
const API_BASE = '/api';

// API Helper
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return response.status === 204 ? null : response.json();
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// Helper to get username from user_id
async function getUsername(userId) {
  try {
    // Try to get user info - adjust endpoint if needed
    const user = await api.get(`/users/${userId}/`);
    return user.username || user.display_name || `User ${userId.slice(0, 8)}`;
  } catch (err) {
    // If endpoint doesn't exist, fallback
    return `User ${userId.slice(0, 8)}`;
  }
}

// Helper to get profile picture url
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/static/')) {
    // Add timestamp to prevent browser caching of profile pictures
    const timestamp = new Date().getTime();
    return `/api${url}?t=${timestamp}`;
  }
  return url;
};

// Auth Context
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/users/profile/')
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (!response.ok) throw new Error('Login failed');

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    const profile = await api.get('/users/profile/');
    setUser(profile);
  };

  const register = async (username, email, password, displayName) => {
    await api.post('/register/', { username, email, password, display_name: displayName });
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Error Toast Component
function ErrorToast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md z-50 animate-slide-in">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1">{message}</p>
      <button onClick={onClose} className="text-white hover:text-red-200 font-bold">×</button>
    </div>
  );
}

// Star Rating Component
function StarRating({ rating, onRate, readonly = false }) {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-6 h-6 transition-all ${
            star <= (hover || rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-slate-600'
          } ${!readonly && 'cursor-pointer hover:scale-110'}`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onRate && onRate(star)}
        />
      ))}
    </div>
  );
}

// Review Card Component
function ReviewCard({ review, currentUserId, isAdmin, onEdit, onDelete, onViewProfile }) {
  const isOwner = review.user_id === currentUserId;
  const canDelete = isOwner || isAdmin;
  const reviewDate = new Date(review.review_date).toLocaleDateString();
  
  const displayName = review.display_name || review.username || `User ${review.user_id.slice(0, 8)}`;
  
  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
		{review.profile_picture_url ? (
		  <img 
			src={getImageUrl(review.profile_picture_url)} 
			alt={displayName}
			className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
			onClick={() => onViewProfile && onViewProfile(review.user_id)}
		  />
		) : (
		  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
			onClick={() => onViewProfile && onViewProfile(review.user_id)}
		  >
			<User className="w-5 h-5 text-white" />
		  </div>
		)}
          <div>
            <p 
              className="text-white font-semibold cursor-pointer hover:text-purple-300 transition-colors"
              onClick={() => onViewProfile && onViewProfile(review.user_id)}
            >
              {displayName}
            </p>
            <p className="text-slate-400 text-sm">{reviewDate}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} readonly />
          {(isOwner || canDelete) && (
            <div className="flex gap-1 ml-2">
              {isOwner && (
                <button
                  onClick={() => onEdit(review)}
                  className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                  title="Edit review"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(review.review_id)}
                  className="p-1 hover:bg-slate-600 rounded text-red-400 hover:text-red-300"
                  title="Delete review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {review.review_text && (
        <p className="text-slate-300 leading-relaxed">{review.review_text}</p>
      )}
    </div>
  );
}

// Login/Register Component
function AuthPage() {
  const { login, register } = React.useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await register(formData.username, formData.email, formData.password, formData.displayName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Gamepad2 className="w-12 h-12 text-purple-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">GameHub</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded ${isLogin ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded ${!isLogin ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            Register
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {!isLogin && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </>
          )}

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </div>
      </div>
    </div>
  );
}

//Friend Card component
function FriendCard({ friend, onRemove, onViewProfile, showRemove = true }) {
  const friendDate = new Date(friend.friendship_date).toLocaleDateString();
  
  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-center justify-between">
      <div 
        className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-slate-600/50 -m-4 p-4 rounded-lg transition-colors"
        onClick={() => onViewProfile && onViewProfile(friend.friend_user_id)}
      >
        {friend.friend_profile_picture_url ? (
		<img 
		src={getImageUrl(friend.friend_profile_picture_url)} 
		alt={friend.friend_username}
		className="w-12 h-12 rounded-full object-cover"
			/>
		) : (
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h4 className="text-white font-semibold hover:text-purple-300 transition-colors">
            {friend.friend_display_name || friend.friend_username}
          </h4>
          <p className="text-slate-400 text-sm">@{friend.friend_username}</p>
          <p className="text-slate-500 text-xs mt-1">Friends since {friendDate}</p>
        </div>
      </div>
      
      {showRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(friend.friendship_id);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 ml-4"
        >
          <X className="w-4 h-4" />
          Remove
        </button>
      )}
    </div>
  );
}

// Friend Request Card Component
function FriendRequestCard({ request, onAccept, onReject, type = 'incoming' }) {
  const [loading, setLoading] = useState(false);
  
  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(request.friendship_id);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(request.friendship_id);
    } finally {
      setLoading(false);
    }
  };
  
  // Get the correct user info based on request type
  const userInfo = type === 'incoming' ? {
    username: request.initiator_username,
    displayName: request.initiator_display_name,
    profilePicture: request.initiator_profile_picture_url
  } : {
    username: request.recipient_username,
    displayName: request.recipient_display_name,
    profilePicture: request.recipient_profile_picture_url
  };
  
  const displayName = userInfo.displayName || userInfo.username || 'Unknown User';
  
  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {userInfo.profilePicture ? (
  <img 
    src={getImageUrl(userInfo.profilePicture)} 
    alt={displayName}
    className="w-12 h-12 rounded-full object-cover"
  />
) : (
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h4 className="text-white font-semibold">{displayName}</h4>
          <p className="text-slate-400 text-sm">
            @{userInfo.username || 'unknown'}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {type === 'incoming' ? 'Wants to be friends' : 'Request pending'}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {type === 'incoming' ? (
          <>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </>
        ) : (
          <button
            onClick={handleReject}
            disabled={loading}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// User Search Result Card
function UserSearchCard({ user, onSendRequest, requestSent }) {
  const [loading, setLoading] = useState(false);
  
  const handleSend = async () => {
    setLoading(true);
    try {
      await onSendRequest(user.user_id);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {user.profile_picture_url ? (
		  <img 
			src={getImageUrl(user.profile_picture_url)} 
			alt={user.username}
			className="w-12 h-12 rounded-full object-cover"
		  />
		) : (
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h4 className="text-white font-semibold">
            {user.display_name || user.username}
          </h4>
          <p className="text-slate-400 text-sm">@{user.username}</p>
          {user.role === 'ADMIN' && (
            <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs mt-1 inline-block">
              ADMIN
            </span>
          )}
        </div>
      </div>
      
      <button
        onClick={handleSend}
        disabled={loading || requestSent}
        className={`px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50 ${
          requestSent 
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {loading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : requestSent ? (
          <>
            <Check className="w-4 h-4" />
            Request Sent
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Add Friend
          </>
        )}
      </button>
    </div>
  );
}

// Main Friends Component
function FriendsPage({ onFriendsUpdate }) {
  const { user } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentRequests, setSentRequests] = useState(new Set());

  // Load ALL data on mount for accurate counts
  useEffect(() => {
    loadAllData();
  }, []);

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'add' && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        loadAllUsers();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, searchQuery]);

  const loadAllData = async () => {
    // Load all data in parallel for initial counts
    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        api.get('/friends/details/'),
        api.get('/friends/requests/incoming/'),
        api.get('/friends/requests/outgoing/')
      ]);
      
      setFriends(friendsData.friends || []);
      setIncomingRequests(incomingData);
      setOutgoingRequests(outgoingData);
      
      if (onFriendsUpdate) {
        onFriendsUpdate(friendsData.count || 0);
      }
    } catch (err) {
      console.error('Failed to load friends data:', err);
    }
  };

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await api.get('/friends/details/');
      setFriends(data.friends || []);
      if (onFriendsUpdate) {
        onFriendsUpdate(data.count || 0);
      }
    } catch (err) {
      setError('Failed to load friends: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingRequests = async () => {
    setLoading(true);
    try {
      const data = await api.get('/friends/requests/incoming/');
      setIncomingRequests(data);
    } catch (err) {
      setError('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOutgoingRequests = async () => {
    setLoading(true);
    try {
      const data = await api.get('/friends/requests/outgoing/');
      setOutgoingRequests(data);
    } catch (err) {
      setError('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    if (!searchQuery.trim()) {
      setAllUsers([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await api.get(`/users/search/?query=${encodeURIComponent(searchQuery)}`);
      setAllUsers(data);
    } catch (err) {
      setError('Failed to search users: ' + err.message);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await api.post(`/friends/${userId}/request/`);
      setSentRequests(prev => new Set([...prev, userId]));
      setError('');
      setTimeout(() => {
        setError('Friend request sent!');
        setTimeout(() => setError(''), 2000);
      }, 100);
      // Reload outgoing requests to update count
      loadOutgoingRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      await api.put(`/friends/${friendshipId}/accept/`);
      // Reload all data to update counts
      await loadAllData();
    } catch (err) {
      setError('Failed to accept request: ' + err.message);
    }
  };

  const rejectRequest = async (friendshipId) => {
    try {
      await api.delete(`/friends/${friendshipId}/reject/`);
      // Reload all data to update counts
      await loadAllData();
    } catch (err) {
      setError('Failed to reject request: ' + err.message);
    }
  };

  const removeFriend = async (friendshipId) => {
    if (!window.confirm('Remove this friend?')) return;
    
    try {
      await api.delete(`/friends/${friendshipId}/`);
      await loadAllData();
    } catch (err) {
      setError('Failed to remove friend: ' + err.message);
    }
  };

  const filteredUsers = allUsers;

  return (
    <div className="space-y-6">
      {error && (
        <div className={`${
          error.includes('sent!') ? 'bg-green-500/20 border-green-500 text-green-200' : 'bg-red-500/20 border-red-500 text-red-200'
        } border px-4 py-3 rounded flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {error.includes('sent!') ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xl font-bold">×</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'friends' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'incoming' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          Incoming ({incomingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'outgoing' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent ({outgoingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'add' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Friends
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by username or display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {searchQuery && (
            <p className="text-slate-400 text-sm mt-2">
              {loading ? 'Searching...' : `Found ${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}

      {loading && activeTab !== 'add' ? (
        <div className="text-center text-slate-400 py-12">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'friends' && (
            friends.length > 0 ? (
              friends.map((friend) => (
                <FriendCard
                  key={friend.friendship_id}
                  friend={friend}
                  onRemove={removeFriend}
				  onViewProfile={(userId) => {
					window.dispatchEvent(new CustomEvent('viewProfile', { detail: userId }));
				  }}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No friends yet. Start adding some!</p>
              </div>
            )
          )}

          {activeTab === 'incoming' && (
            incomingRequests.length > 0 ? (
              incomingRequests.map((request) => (
                <FriendRequestCard
                  key={request.friendship_id}
                  request={request}
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  type="incoming"
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No incoming friend requests</p>
              </div>
            )
          )}

          {activeTab === 'outgoing' && (
            outgoingRequests.length > 0 ? (
              outgoingRequests.map((request) => (
                <FriendRequestCard
                  key={request.friendship_id}
                  request={request}
                  onAccept={() => {}}
                  onReject={rejectRequest}
                  type="outgoing"
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Send className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No pending friend requests</p>
              </div>
            )
          )}

          {activeTab === 'add' && (
            filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <UserSearchCard
                  key={u.user_id}
                  user={u}
                  onSendRequest={sendFriendRequest}
                  requestSent={sentRequests.has(u.user_id)}
                />
              ))
            ) : searchQuery.trim() ? (
              <div className="text-center text-slate-400 py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No users found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>Start typing to search for users</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Write Review Component
function WriteReview({ gameId, existingReview, onSave, onCancel }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    
    setSaving(true);
    try {
      await onSave({ rating, review_text: reviewText || null });
    } catch (err) {
      alert('Failed to save review: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="bg-slate-700 rounded-lg p-6 border-2 border-purple-600">
      <h3 className="text-white text-xl font-bold mb-4">
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>
      
      <div className="mb-4">
        <label className="block text-slate-300 mb-2">Your Rating *</label>
        <StarRating rating={rating} onRate={setRating} />
      </div>
      
      <div className="mb-4">
        <label className="block text-slate-300 mb-2">Your Review (Optional)</label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your thoughts about this game..."
          className="w-full px-4 py-3 bg-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-32"
          maxLength={1000}
        />
        <p className="text-slate-400 text-xs mt-1">{reviewText.length}/1000 characters</p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || rating === 0}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Review'
          )}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 rounded font-semibold"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// Game Reviews Component
function GameReviews({ gameId, currentUserId, isAdmin, onViewProfile }) {
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  
  useEffect(() => {
    loadReviews();
  }, [gameId]);
  
  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/reviews/games/${gameId}/`);
      
      // Username is now included in the response, no need to fetch separately
      const mine = data.find(r => r.user_id === currentUserId);
      const others = data.filter(r => r.user_id !== currentUserId);
      
      setMyReview(mine);
      setReviews(others);
      setShowWriteReview(!mine);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveReview = async (reviewData) => {
    if (editingReview) {
      await api.put(`/reviews/${editingReview.review_id}/`, reviewData);
    } else {
      await api.post(`/reviews/games/${gameId}/`, reviewData);
    }
    
    setEditingReview(null);
    setShowWriteReview(false);
    await loadReviews();
  };
  
  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Delete this review?')) return;
    
    try {
      await api.delete(`/reviews/${reviewId}/`);
      await loadReviews();
    } catch (err) {
      alert('Failed to delete review: ' + err.message);
    }
  };
  
  const handleEditMyReview = () => {
    setEditingReview(myReview);
    setShowWriteReview(true);
  };
  
  if (loading) {
    return (
      <div className="text-center text-slate-400 py-8">
        <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading reviews...
      </div>
    );
  }
  
  const totalReviews = reviews.length + (myReview ? 1 : 0);
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, myReview ? myReview.rating : 0) / totalReviews).toFixed(1)
    : 0;
  
  return (
    <div className="space-y-6">
      <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-xl font-bold mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Reviews
            </h3>
            <p className="text-slate-400">
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </p>
          </div>
          {averageRating > 0 && (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{averageRating}</div>
              <StarRating rating={Math.round(parseFloat(averageRating))} readonly />
            </div>
          )}
        </div>
      </div>
      
      {myReview && !showWriteReview ? (
        <div>
          <h4 className="text-white font-semibold mb-3">Your Review</h4>
          <ReviewCard
            review={myReview}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onEdit={handleEditMyReview}
            onDelete={handleDeleteReview}
			onViewProfile={onViewProfile} 
          />
        </div>
      ) : showWriteReview ? (
        <WriteReview
          gameId={gameId}
          existingReview={editingReview}
          onSave={handleSaveReview}
          onCancel={editingReview ? () => {
            setEditingReview(null);
            setShowWriteReview(false);
          } : myReview ? null : undefined}
        />
      ) : !myReview && (
        <button
          onClick={() => setShowWriteReview(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded font-semibold flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Write a Review
        </button>
      )}
      
      {reviews.length > 0 && (
        <div>
          <h4 className="text-white font-semibold mb-3">
            Other Reviews ({reviews.length})
          </h4>
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.review_id}
                review={review}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onEdit={() => {}}
                onDelete={handleDeleteReview}
				onViewProfile={onViewProfile}
              />
            ))}
          </div>
        </div>
      )}
      
      {totalReviews === 0 && !showWriteReview && (
        <div className="text-center text-slate-400 py-8">
          No reviews yet. Be the first to review!
        </div>
      )}
    </div>
  );
}

// Game Card Component
function GameCard({ game, onSelect, isRAWG = false }) {
  return (
    <div
      onClick={() => onSelect(game)}
      className="bg-slate-800 rounded-lg overflow-hidden cursor-pointer transform transition hover:scale-105 hover:shadow-xl"
    >
      {game.cover_image_url ? (
        <img src={game.cover_image_url} alt={game.title} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
          <Gamepad2 className="w-16 h-16 text-slate-600" />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-1 truncate">{game.title}</h3>
        <p className="text-slate-400 text-sm">{game.developer || 'Unknown Developer'}</p>
        {game.release_date && (
          <p className="text-slate-500 text-xs mt-1">{new Date(game.release_date).getFullYear()}</p>
        )}
        {isRAWG && (
          <div className="mt-2 bg-purple-600/20 text-purple-300 text-xs px-2 py-1 rounded inline-block">
            From RAWG
          </div>
        )}
      </div>
    </div>
  );
}

// Collection Item Edit Modal
function CollectionEditModal({ item, onClose, onUpdate }) {
  const [playStatus, setPlayStatus] = useState(item.play_status);
  const [rating, setRating] = useState(item.rating);
  const [notes, setNotes] = useState(item.personal_notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Update status
      await api.put(`/collection/${item.game_id}/status/`, { play_status: playStatus });
      
      // Update rating if set
      if (rating !== null) {
        await api.put(`/collection/${item.game_id}/rating/`, { rating });
      }
      
      // Update notes
      await api.put(`/collection/${item.game_id}/notes/`, { personal_notes: notes });
      
      await onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating collection item:', err);
      setError(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {item.cover_image_url && (
          <img src={item.cover_image_url} alt={item.title} className="w-full h-64 object-cover" />
        )}
        
        <div className="p-6">
          <h2 className="text-3xl font-bold text-white mb-2">{item.title}</h2>
          <p className="text-slate-400 mb-6">{item.developer}</p>

          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-slate-400 mb-2">Status:</label>
            <select
              value={playStatus}
              onChange={(e) => setPlayStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-slate-400 mb-2">Rating:</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 cursor-pointer transition-transform hover:scale-110 ${
                    star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                  }`}
                  onClick={() => setRating(star === rating ? null : star)}
                />
              ))}
              {rating !== null && (
                <button
                  onClick={() => setRating(null)}
                  className="ml-2 text-slate-400 hover:text-white text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 mb-2">Personal Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts about this game..."
              className="w-full px-4 py-2 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-24"
              maxLength={500}
            />
            <p className="text-slate-500 text-xs mt-1">{notes.length}/500 characters</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Game Details Modal
function GameDetailsModal({ game, onClose, onAddToCollection, isRAWG = false, user, onViewProfile }) {
  const [loading, setLoading] = useState(false);
  const [playStatus, setPlayStatus] = useState('NOT_STARTED');
  const [rating, setRating] = useState(null);
  const [error, setError] = useState('');

  const handleViewProfile = (userId) => {
    onClose(); // Close the modal first
    onViewProfile(userId); // Then navigate to profile
  };
  
  const handleAdd = async () => {
    setLoading(true);
    setError('');
	
  
    
    try {
      console.log('Adding game:', game);
      console.log('Is RAWG:', isRAWG);
      console.log('External API ID:', game.external_api_id);
      
      if (isRAWG) {
        // First import the game from RAWG
        const rawgId = game.external_api_id;
        if (!rawgId) {
          throw new Error('RAWG ID is missing from game data');
        }
        
        console.log('Importing from RAWG with ID:', rawgId);
        const importedGame = await api.post(`/games/import-from-rawg/${rawgId}`);
        console.log('Imported game:', importedGame);
        
        // Now add to collection with the new game_id
        console.log('Adding to collection with game_id:', importedGame.game_id);
        await onAddToCollection(importedGame.game_id, { play_status: playStatus, rating });
      } else {
        // Game already in database
        if (!game.game_id) {
          throw new Error('Game ID is missing');
        }
        console.log('Adding existing game to collection:', game.game_id);
        await onAddToCollection(game.game_id, { play_status: playStatus, rating });
      }
      onClose();
    } catch (err) {
      console.error('Error adding game:', err);
      setError(err.message || 'Failed to add game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {game.cover_image_url && (
          <img src={game.cover_image_url} alt={game.title} className="w-full h-64 object-cover" />
        )}
        
        <div className="p-6">
          <h2 className="text-3xl font-bold text-white mb-2">{game.title}</h2>
          <p className="text-slate-400 mb-4">{game.developer}</p>
          
          {game.release_date && (
            <div className="flex items-center text-slate-400 mb-4">
              <Calendar className="w-4 h-4 mr-2" />
              {new Date(game.release_date).toLocaleDateString()}
            </div>
          )}

          {game.genres && game.genres.length > 0 && (
            <div className="mb-4">
              <p className="text-slate-400 mb-2">Genres:</p>
              <div className="flex flex-wrap gap-2">
                {game.genres.map((genre) => (
                  <span key={genre} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {game.platforms && game.platforms.length > 0 && (
            <div className="mb-6">
              <p className="text-slate-400 mb-2">Platforms:</p>
              <div className="flex flex-wrap gap-2">
                {game.platforms.map((platform) => (
                  <span key={platform} className="bg-slate-700 text-slate-300 px-3 py-1 rounded text-sm">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          )}


		  {!isRAWG && game.game_id && (
			<div className="mb-6">
			<h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
			<MessageSquare className="w-5 h-5" />
			Community Reviews
			</h3>
			<GameReviews 
			gameId={game.game_id} 
			currentUserId={user?.user_id}
			isAdmin={user?.role === 'ADMIN'}
			onViewProfile={handleViewProfile}
				/>
			</div>
		)}

          {isRAWG && (
            <div className="mb-4 bg-blue-500/20 border border-blue-500 text-blue-200 px-4 py-2 rounded">
              This game will be imported from RAWG database
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-slate-400 mb-2">Status:</label>
            <select
              value={playStatus}
              onChange={(e) => setPlayStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 mb-2">Rating (optional):</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 cursor-pointer ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
                  onClick={() => setRating(star === rating ? null : star)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {isRAWG ? 'Importing...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {isRAWG ? 'Import & Add' : 'Add to Collection'}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// Play Sessions Components 

// Active Session Card
function ActiveSessionCard({ session, game, onEnd }) {
  const [notes, setNotes] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Parse the UTC time from backend and convert to local time
  const startTime = new Date(session.start_time.endsWith('Z') ? session.start_time : session.start_time + 'Z');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Calculate initial elapsed time
    const now = new Date();
    const initialDiff = Math.floor((now - startTime) / 1000);
    setElapsed(initialDiff);

    // Update every second
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now - startTime) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [session.start_time]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleEndSession = async () => {
    setLoading(true);
    try {
      const endData = { 
        session_notes: notes || null 
      };
      // Don't send end_time, let backend use current time
      await onEnd(session.session_id, endData);
      setShowEndModal(false);
    } catch (err) {
      console.error('Failed to end session:', err);
      alert('Failed to end session: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-900 to-purple-700 rounded-lg p-6 border-2 border-purple-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Active Session</h3>
              <p className="text-purple-200 text-sm">{game?.title || 'Unknown Game'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowEndModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            End Session
          </button>
        </div>
        
        <div className="bg-black/30 rounded-lg p-4">
          <div className="text-center">
            <p className="text-purple-200 text-sm mb-2">Session Duration</p>
            <p className="text-white text-3xl font-bold font-mono">{formatDuration(elapsed)}</p>
          </div>
        </div>
      </div>

      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowEndModal(false)}>
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-xl font-bold mb-4">End Gaming Session</h3>
            
            <div className="mb-4">
              <p className="text-slate-300 mb-2">Total Duration: <span className="text-white font-bold">{formatDuration(elapsed)}</span></p>
            </div>

            <div className="mb-4">
              <label className="block text-slate-400 mb-2">Session Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How was your session? Any achievements or progress?"
                className="w-full px-4 py-3 bg-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-24"
                maxLength={500}
              />
              <p className="text-slate-500 text-xs mt-1">{notes.length}/500 characters</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold disabled:opacity-50"
              >
                {loading ? 'Ending...' : 'End Session'}
              </button>
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Session History Card
function SessionHistoryCard({ session, game, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  
  const startTime = new Date(session.start_time.endsWith('Z') ? session.start_time : session.start_time + 'Z');
  const endTime = session.end_time ? new Date(session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z') : null;
  
  const duration = endTime ? Math.floor((endTime - startTime) / 1000) : 0;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  const handleDelete = async () => {
    if (!window.confirm('Delete this session from history?')) return;
    
    setDeleting(true);
    try {
      await onDelete(session.session_id);
    } catch (err) {
      alert('Failed to delete session: ' + err.message);
      setDeleting(false);
    }
  };

  // Handle missing game data
  const gameTitle = game?.title || 'Deleted Game';
  const gameImage = game?.cover_image_url;

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 relative">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {gameImage ? (
            <img src={gameImage} alt={gameTitle} className="w-16 h-16 rounded object-cover" />
          ) : (
            <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-slate-400" />
            </div>
          )}
          <div className="flex-1">
            <h4 className={`font-semibold ${!game ? 'text-slate-400 italic' : 'text-white'}`}>
              {gameTitle}
            </h4>
            {!game && (
              <p className="text-slate-500 text-xs">Game removed from collection</p>
            )}
            <p className="text-slate-400 text-sm">
              {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="text-right flex items-start gap-2">
          <div>
            <p className="text-white font-bold">{hours}h {minutes}m</p>
            <p className="text-slate-400 text-xs">Duration</p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded disabled:opacity-50 transition-all"
            title="Delete session"
          >
            {deleting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {session.session_notes && (
        <div className="bg-slate-800 rounded p-3 mt-3">
          <p className="text-slate-300 text-sm italic">"{session.session_notes}"</p>
        </div>
      )}
    </div>
  );
}

// Game Playtime Stats Card
function GamePlaytimeCard({ game, playtime, onStartSession }) {
  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-purple-500 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {game.cover_image_url ? (
            <img src={game.cover_image_url} alt={game.title} className="w-16 h-16 rounded object-cover" />
          ) : (
            <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-slate-400" />
            </div>
          )}
          <div>
            <h4 className="text-white font-semibold">{game.title}</h4>
            <p className="text-slate-400 text-sm">{playtime.formatted}</p>
            <p className="text-slate-500 text-xs">{playtime.session_count} session{playtime.session_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => onStartSession(game.game_id)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start
        </button>
      </div>
    </div>
  );
}

// Main Play Sessions Page
function PlaySessionsPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [activeSessions, setActiveSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [collectionGames, setCollectionGames] = useState([]);
  const [playtimeStats, setPlaytimeStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, collectionData] = await Promise.all([
        api.get('/sessions/?active_only=true'),
        api.get('/collection/')
      ]);
      
      setActiveSessions(sessionsData);
      setCollectionGames(collectionData);
      
      // Load playtime for each game
      const playtimes = {};
      for (const game of collectionData) {
        try {
          const stats = await api.get(`/sessions/games/${game.game_id}/playtime/`);
          playtimes[game.game_id] = stats;
        } catch (err) {
          console.error(`Failed to load playtime for ${game.game_id}:`, err);
        }
      }
      setPlaytimeStats(playtimes);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.get('/sessions/');
      setHistory(data);
    } catch (err) {
      setError('Failed to load history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (gameId) => {
    try {
      await api.post('/sessions/start/', { game_id: gameId });
      await loadData();
      setActiveTab('active');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const endSession = async (sessionId, data) => {
    try {
      await api.put(`/sessions/${sessionId}/end/`, data);
      await loadData();
      setError('Session ended successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      console.error('Failed to end session:', err);
      setError('Failed to end session: ' + err.message);
    }
  };

  // NEW: Delete session handler
  const deleteSession = async (sessionId) => {
    try {
      await api.delete(`/sessions/${sessionId}/`);
      setError('Session deleted');
      setTimeout(() => setError(''), 2000);
      
      // Reload based on current tab
      if (activeTab === 'history') {
        await loadHistory();
      } else {
        await loadData();
      }
    } catch (err) {
      setError('Failed to delete session: ' + err.message);
    }
  };

  // Get game data for sessions (returns null if not found)
  const getGameForSession = (gameId) => {
    return collectionGames.find(g => g.game_id === gameId) || null;
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {error && (
        <div className={`${
          error.includes('success') || error.includes('deleted') 
            ? 'bg-green-500/20 border-green-500 text-green-200' 
            : 'bg-red-500/20 border-red-500 text-red-200'
        } border px-4 py-3 rounded flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xl font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'active' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Play className="w-4 h-4" />
          Active ({activeSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('start')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'start' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          Start Session
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'history' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          History
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'stats' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </div>

      {/* Content */}
      {loading && activeTab !== 'active' ? (
        <div className="text-center text-slate-400 py-12">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'active' && (
            activeSessions.length > 0 ? (
              activeSessions.map((session) => (
                <ActiveSessionCard
                  key={session.session_id}
                  session={session}
                  game={getGameForSession(session.game_id)}
                  onEnd={endSession}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Play className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No active sessions</p>
                <button
                  onClick={() => setActiveTab('start')}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
                >
                  Start a Session
                </button>
              </div>
            )
          )}

          {activeTab === 'start' && (
            collectionGames.length > 0 ? (
              collectionGames.map((game) => (
                <GamePlaytimeCard
                  key={game.game_id}
                  game={game}
                  playtime={playtimeStats[game.game_id] || { formatted: '0h 0m', session_count: 0 }}
                  onStartSession={startSession}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No games in collection. Add games first!</p>
              </div>
            )
          )}

          {activeTab === 'history' && (
            history.length > 0 ? (
              history.map((session) => (
                <SessionHistoryCard
                  key={session.session_id}
                  session={session}
                  game={getGameForSession(session.game_id)}
                  onDelete={deleteSession}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>No session history yet</p>
              </div>
            )
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(playtimeStats).length > 0 ? (
                Object.entries(playtimeStats)
                  .sort(([, a], [, b]) => b.total_seconds - a.total_seconds)
                  .map(([gameId, stats]) => {
                    const game = collectionGames.find(g => g.game_id === gameId);
                    if (!game) return null;
                    
                    return (
                      <div key={gameId} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center gap-3 mb-3">
                          {game.cover_image_url ? (
                            <img src={game.cover_image_url} alt={game.title} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-600 rounded flex items-center justify-center">
                              <Gamepad2 className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-white font-semibold">{game.title}</h4>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-800 rounded p-3">
                            <p className="text-slate-400 text-xs mb-1">Total Time</p>
                            <p className="text-white font-bold text-lg">{stats.formatted}</p>
                          </div>
                          <div className="bg-slate-800 rounded p-3">
                            <p className="text-slate-400 text-xs mb-1">Sessions</p>
                            <p className="text-white font-bold text-lg">{stats.session_count}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="col-span-2 text-center text-slate-400 py-12">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p>No playtime data yet. Start tracking your sessions!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Profile Picture Upload Component
function ProfilePictureUpload({ currentPictureUrl, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image (JPG, PNG, GIF, or WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/uploads/profile-picture/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUploadSuccess(data.url);
    } catch (err) {
      setError('Failed to upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your profile picture?')) return;

    setUploading(true);
    try {
      await api.delete('/uploads/profile-picture/');
      onUploadSuccess(null);
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {currentPictureUrl ? (
		  <img
			src={getImageUrl(currentPictureUrl)}
			alt="Profile"
			className="w-32 h-32 rounded-full object-cover border-4 border-purple-600"
		  />
		) : (
          <div className="w-32 h-32 rounded-full bg-purple-600 flex items-center justify-center border-4 border-purple-700">
            <User className="w-16 h-16 text-white" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {currentPictureUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
        {currentPictureUrl && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// User Stats Card Component
function UserStatsCard({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-700 rounded-lg p-4 text-center">
        <Library className="w-8 h-8 text-purple-400 mx-auto mb-2" />
        <p className="text-2xl font-bold text-white">{stats.gamesCount}</p>
        <p className="text-slate-400 text-sm">Games</p>
      </div>
      <div className="bg-slate-700 rounded-lg p-4 text-center">
        <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="text-2xl font-bold text-white">{stats.totalHours}h</p>
        <p className="text-slate-400 text-sm">Played</p>
      </div>
      <div className="bg-slate-700 rounded-lg p-4 text-center">
        <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p className="text-2xl font-bold text-white">{stats.reviewsCount}</p>
        <p className="text-slate-400 text-sm">Reviews</p>
      </div>
      <div className="bg-slate-700 rounded-lg p-4 text-center">
        <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
        <p className="text-2xl font-bold text-white">{stats.friendsCount}</p>
        <p className="text-slate-400 text-sm">Friends</p>
      </div>
    </div>
  );
}

// Profile Page Component
function ProfilePage({ userId, isOwnProfile, onClose }) {
  const { user: currentUser } = React.useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    gamesCount: 0,
    totalHours: 0,
    reviewsCount: 0,
    friendsCount: 0
  });
  const [games, setGames] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('games');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ email: '', display_name: '' });
  const [friendshipStatus, setFriendshipStatus] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
  setLoading(true);
  try {
    // Load user profile
    const profileData = isOwnProfile
      ? await api.get('/users/profile/')
      : await api.get(`/users/${userId}`);
    
    setProfile(profileData);
    setEditData({
      email: profileData.email || '',
      display_name: profileData.display_name || ''
    });

    // Load stats and data
    const [gamesData, reviewsData, friendsData, playtimeData] = await Promise.all([
      isOwnProfile 
        ? api.get('/collection/')
        : api.get(`/collection/user/${profileData.user_id}/`).catch(() => []), // ✅ FIXED: Use user-specific endpoint
      api.get(`/reviews/users/${profileData.user_id}/`).catch(() => []),
      isOwnProfile
        ? api.get('/friends/details/')
        : Promise.resolve({ count: 0 }), // Can't see other's friends list
      isOwnProfile
        ? api.get('/sessions/stats/playtime/').catch(() => ({ total_playtime_hours: 0 }))
        : Promise.resolve({ total_playtime_hours: 0 })
    ]);

    setGames(gamesData);
    setReviews(reviewsData);
    setStats({
      gamesCount: Array.isArray(gamesData) ? gamesData.length : 0,
      totalHours: playtimeData.total_playtime_hours || 0,
      reviewsCount: Array.isArray(reviewsData) ? reviewsData.length : 0,
      friendsCount: friendsData.count || 0
    });

    // Check friendship status if viewing another user
    if (!isOwnProfile) {
      const friendStatus = await api.get(`/friends/check/${userId}/`);
      setFriendshipStatus(friendStatus);
    }
  } catch (err) {
    setError('Failed to load profile: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  const handleProfilePictureUpdate = async (newUrl) => {
    setProfile({ ...profile, profile_picture_url: newUrl });
    // Optionally reload entire profile to ensure consistency
    await loadProfile();
  };

  const handleSaveProfile = async () => {
    try {
      await api.put('/users/profile/', editData);
      setIsEditing(false);
      await loadProfile();
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    }
  };

  const handleAddFriend = async () => {
    try {
      await api.post(`/friends/${userId}/request/`);
      await loadProfile();
    } catch (err) {
      setError('Failed to send friend request: ' + err.message);
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm('Remove friend?')) return;
    try {
      await api.delete(`/friends/${friendshipStatus.friendship_id}/`);
      await loadProfile();
    } catch (err) {
      setError('Failed to remove friend: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">User not found</div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900 to-slate-900 pt-6 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          {onClose && (
            <button
              onClick={onClose}
              className="text-white mb-4 flex items-center gap-2 hover:text-purple-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            {isOwnProfile ? (
              <ProfilePictureUpload
                currentPictureUrl={profile.profile_picture_url}
                onUploadSuccess={handleProfilePictureUpdate}
              />
            ) : profile.profile_picture_url ? (
			  <img
				src={getImageUrl(profile.profile_picture_url)}
				alt={displayName}
				className="w-32 h-32 rounded-full object-cover border-4 border-purple-600"
			  />
			) : (
              <div className="w-32 h-32 rounded-full bg-purple-600 flex items-center justify-center border-4 border-purple-700">
                <User className="w-16 h-16 text-white" />
              </div>
            )}

            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.display_name}
                    onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                    placeholder="Display Name"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded"
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    placeholder="Email"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white mb-1">{displayName}</h1>
                  <p className="text-purple-300 mb-2">@{profile.username}</p>
                  {profile.role === 'ADMIN' && (
                    <span className="bg-purple-600 text-white px-3 py-1 rounded text-sm">
                      ADMIN
                    </span>
                  )}
                  <p className="text-slate-400 text-sm mt-2">
                    Joined {new Date(profile.join_date).toLocaleDateString()}
                  </p>
                  
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-3 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto md:mx-0"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}

                  {!isOwnProfile && friendshipStatus && (
                    <div className="mt-3">
                      {friendshipStatus.are_friends ? (
                        <button
                          onClick={handleRemoveFriend}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto md:mx-0"
                        >
                          <X className="w-4 h-4" />
                          Remove Friend
                        </button>
                      ) : friendshipStatus.status === 'PENDING' ? (
                        <div className="bg-yellow-600/20 border border-yellow-600 text-yellow-200 px-4 py-2 rounded">
                          Friend Request Pending
                        </div>
                      ) : (
                        <button
                          onClick={handleAddFriend}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto md:mx-0"
                        >
                          <Users className="w-4 h-4" />
                          Add Friend
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 mb-8">
        <UserStatsCard stats={stats} />
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-6 mb-4">
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-xl font-bold">×</button>
          </div>
        </div>
      )}

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'games' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Library className="w-4 h-4" />
            Games ({stats.gamesCount})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'reviews' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Reviews ({stats.reviewsCount})
          </button>
        </div>

        {/* Games Grid */}
        {activeTab === 'games' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {games.length > 0 ? (
              games.map((game) => (
                <div key={game.game_id} className="bg-slate-800 rounded-lg overflow-hidden">
                  {game.cover_image_url ? (
                    <img src={game.cover_image_url} alt={game.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-slate-700 flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                  <div className="p-3">
                    <h4 className="text-white font-semibold text-sm truncate">{game.title}</h4>
                    {game.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < game.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-slate-400 py-12">
                <Library className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>{isOwnProfile ? 'No games in collection yet' : 'No games to display'}</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews List */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard
                  key={review.review_id}
                  review={review}
                  currentUserId={currentUser?.user_id}
                  isAdmin={currentUser?.role === 'ADMIN'}
                  onEdit={() => {}}
                  onDelete={async () => {
                    await api.delete(`/reviews/${review.review_id}/`);
                    loadProfile();
                  }}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p>{isOwnProfile ? 'No reviews written yet' : 'No reviews to display'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Analytics Page Component

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topRatedGames, setTopRatedGames] = useState([]);
  const [gameStats, setGameStats] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('top-rated');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      // Load all three endpoints with individual error handling
      const [topRatedResult, statsResult, usersResult] = await Promise.allSettled([
        api.get('/games/top-rated/?limit=10'),
        api.get('/games/statistics/?min_reviews=1'),
        api.get('/users/active-users/?limit=20')
      ]);
      
      // Handle top rated games
      if (topRatedResult.status === 'fulfilled') {
        setTopRatedGames(Array.isArray(topRatedResult.value) ? topRatedResult.value : []);
      } else {
        console.error('Top rated games error:', topRatedResult.reason);
        setTopRatedGames([]);
      }
      
      // Handle game statistics
      if (statsResult.status === 'fulfilled') {
        setGameStats(Array.isArray(statsResult.value) ? statsResult.value : []);
      } else {
        console.error('Game stats error:', statsResult.reason);
        setGameStats([]);
      }
      
      // Handle active users
      if (usersResult.status === 'fulfilled') {
        setActiveUsers(Array.isArray(usersResult.value) ? usersResult.value : []);
      } else {
        console.error('Active users error:', usersResult.reason);
        setActiveUsers([]);
      }
      
      // Only show error if ALL requests failed
      if (topRatedResult.status === 'rejected' && 
          statsResult.status === 'rejected' && 
          usersResult.status === 'rejected') {
        setError('Failed to load analytics data');
      }
      
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-slate-400 py-12">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xl font-bold">×</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8" />
          GameHub Analytics
        </h2>
        <p className="text-slate-300">Advanced database insights and statistics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('top-rated')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'top-rated' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          Top Rated Games ({topRatedGames.length})
          <span className="bg-purple-700 px-2 py-0.5 rounded text-xs">NESTED QUERY</span>
        </button>
        <button
          onClick={() => setActiveTab('game-stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'game-stats' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Game Statistics ({gameStats.length})
          <span className="bg-purple-700 px-2 py-0.5 rounded text-xs">GROUP BY</span>
        </button>
        <button
          onClick={() => setActiveTab('active-users')}
          className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
            activeTab === 'active-users' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Users ({activeUsers.length})
          <span className="bg-purple-700 px-2 py-0.5 rounded text-xs">UNION</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'top-rated' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-purple-500/30">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Top Rated Games (Above Average)
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Games with ratings higher than the community average • Uses nested subquery to calculate overall average rating
            </p>
          </div>

          {topRatedGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topRatedGames.map((game) => (
                <div key={game.game_id} className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-purple-500 transition-colors">
                  <div className="flex items-start gap-3">
                    {game.cover_image_url ? (
                      <img 
                        src={game.cover_image_url} 
                        alt={game.title} 
                        className="w-20 h-20 rounded object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-600 rounded flex items-center justify-center">
                        <Gamepad2 className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{game.title}</h4>
                      <p className="text-slate-400 text-sm mb-2">{game.developer || 'Unknown'}</p>
                      <div className="flex flex-wrap gap-2">
                        {game.genres && game.genres.map((genre) => (
                          <span key={genre} className="bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded text-xs">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Award className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12 bg-slate-800 rounded-lg">
              <Award className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p>No games with above-average ratings yet</p>
              <p className="text-sm mt-2">Games need reviews to appear here</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'game-stats' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-purple-500/30">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Comprehensive Game Statistics
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Aggregated data across reviews, collections, and play sessions • Uses GROUP BY with multiple JOINs and aggregate functions
            </p>
          </div>

          {gameStats.length > 0 ? (
            <div className="space-y-3">
              {gameStats.slice(0, 10).map((stat) => (
                <div key={stat.game_id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      {stat.cover_image_url ? (
                        <img 
                          src={stat.cover_image_url} 
                          alt={stat.title} 
                          className="w-16 h-16 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
                          <Gamepad2 className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-white font-semibold">{stat.title}</h4>
                        <p className="text-slate-400 text-sm">{stat.developer || 'Unknown Developer'}</p>
                      </div>
                    </div>
                    {stat.average_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-white font-bold">{stat.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800 rounded p-3 text-center">
                      <MessageSquare className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                      <p className="text-white font-bold">{stat.review_count}</p>
                      <p className="text-slate-400 text-xs">Reviews</p>
                    </div>
                    <div className="bg-slate-800 rounded p-3 text-center">
                      <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <p className="text-white font-bold">{stat.user_count}</p>
                      <p className="text-slate-400 text-xs">In Collections</p>
                    </div>
                    <div className="bg-slate-800 rounded p-3 text-center">
                      <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                      <p className="text-white font-bold">{stat.total_sessions}</p>
                      <p className="text-slate-400 text-xs">Play Sessions</p>
                    </div>
                    <div className="bg-slate-800 rounded p-3 text-center">
                      <BarChart3 className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                      <p className="text-white font-bold">
                        {stat.average_rating > 0 ? stat.average_rating.toFixed(1) : 'N/A'}
                      </p>
                      <p className="text-slate-400 text-xs">Avg Rating</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12 bg-slate-800 rounded-lg">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p>No game statistics available yet</p>
              <p className="text-sm mt-2">Add games and reviews to see statistics</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'active-users' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-purple-500/30">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              Active Community Members
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Users with either game collections or reviews • Uses UNION set operation to combine two distinct queries
            </p>
          </div>

          {activeUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeUsers.map((user) => (
                <div 
                  key={user.user_id} 
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('viewProfile', { detail: user.user_id }))}
                >
                  <div className="flex flex-col items-center text-center">
                    {user.profile_picture_url ? (
                      <img 
                        src={getImageUrl(user.profile_picture_url)} 
                        alt={user.username}
                        className="w-16 h-16 rounded-full object-cover mb-3"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-3">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <h4 className="text-white font-semibold mb-1">
                      {user.display_name || user.username}
                    </h4>
                    <p className="text-slate-400 text-sm mb-2">@{user.username}</p>
                    {user.role === 'ADMIN' && (
                      <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">
                        ADMIN
                      </span>
                    )}
                    <p className="text-slate-500 text-xs mt-2">
                      Joined {new Date(user.join_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12 bg-slate-800 rounded-lg">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p>No active users found</p>
              <p className="text-sm mt-2">Users need to add games or write reviews</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main App Component
function GameHub() {
  const { user, logout } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('discover');
  const [games, setGames] = useState([]);
  const [collection, setCollection] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRAWGSearch, setIsRAWGSearch] = useState(false);
  const [error, setError] = useState('');
  const [viewingProfile, setViewingProfile] = useState(null); // null, 'own', or userId
  // Load initial counts when component mounts
  useEffect(() => {
    loadInitialCounts();
  }, []);



  useEffect(() => {
    if (activeTab === 'discover') {
      loadGames();
    } else if (activeTab === 'collection') {
      loadCollection();
    }
    // Friends tab handles its own loading
  }, [activeTab]);

  const loadInitialCounts = async () => {
    try {
      // Load collection count
      const collectionData = await api.get('/collection/');
      setCollection(collectionData);
      
      // Load friends count
      const friendsData = await api.get('/friends/details/');
      setFriendsCount(friendsData.count || 0);
    } catch (err) {
      console.error('Failed to load initial counts:', err);
    }
  };

  const loadGames = async () => {
    setLoading(true);
    setIsRAWGSearch(false);
    try {
      const data = await api.get('/games/');
      setGames(data);
    } catch (err) {
      setError('Failed to load games: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCollection = async () => {
    setLoading(true);
    try {
      const data = await api.get('/collection/');
      console.log('Collection data:', data);
      setCollection(data);
    } catch (err) {
      console.error('Failed to load collection:', err);
      setError('Failed to load collection: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchRAWG = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setIsRAWGSearch(true);
    try {
      const data = await api.get(`/games/search-rawg/?search=${encodeURIComponent(searchQuery)}`);
      setGames(data.results || []);
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async (gameId, data) => {
    await api.post(`/collection/${gameId}/add/`, data);
    loadCollection();
  };

  const removeFromCollection = async (gameId) => {
    if (window.confirm('Remove this game from your collection?')) {
      try {
        await api.delete(`/collection/${gameId}/`);
        loadCollection();
      } catch (err) {
        setError('Failed to remove game: ' + err.message);
      }
    }
  };

  const handleGameSelect = (game) => {
    setSelectedGame({ ...game, isRAWG: isRAWGSearch });
  };

  const filteredGames = searchQuery && !isRAWGSearch
    ? games.filter(game =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : games;
	
	
	 useEffect(() => {
  const handleViewProfile = (e) => {
    setViewingProfile(e.detail);
  };
  
  window.addEventListener('viewProfile', handleViewProfile);
  return () => window.removeEventListener('viewProfile', handleViewProfile);
}, []);

   return (
    <div className="min-h-screen bg-slate-900">
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      
      {viewingProfile ? (
        // PROFILE VIEW MODE
        <>
          <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold text-white">GameHub</h1>
              </div>
              <button
                onClick={() => setViewingProfile(null)}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to App
              </button>
            </div>
          </header>
          
          <ProfilePage
            userId={viewingProfile === 'own' ? user.user_id : viewingProfile}
            isOwnProfile={viewingProfile === 'own'}
            onClose={() => setViewingProfile(null)}
          />
        </>
      ) : (
        // NORMAL APP VIEW MODE
        <>
          <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold text-white">GameHub</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-slate-300">{user?.display_name || user?.username}</span>
                {user?.role === 'ADMIN' && (
                  <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">ADMIN</span>
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto p-6">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab('discover');
                  setSearchQuery('');
                  setIsRAWGSearch(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
                  activeTab === 'discover' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Search className="w-4 h-4" />
                Discover
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
                  activeTab === 'collection' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Library className="w-4 h-4" />
                My Collection ({collection.length})
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
                  activeTab === 'sessions' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                Sessions
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
                  activeTab === 'friends' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Friends ({friendsCount})
              </button>
			  <button
				  onClick={() => setActiveTab('analytics')}
				  className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
					activeTab === 'analytics' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
				  }`}
				>
				  <BarChart3 className="w-4 h-4" />
				  Analytics
				</button>
			  
              <button
                onClick={() => setViewingProfile('own')}
                className="flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
            </div>

            {/* Tab Content */}
			{activeTab === 'friends' ? (
			  <FriendsPage onFriendsUpdate={(count) => setFriendsCount(count)} />
			) : activeTab === 'sessions' ? (
			  <PlaySessionsPage />
			) : activeTab === 'analytics' ? (
			  <AnalyticsPage />
			) : (
              <>
                {activeTab === 'discover' && (
                  <div className="mb-6">
                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Search games..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchRAWG()}
                        className="flex-1 px-4 py-2 bg-slate-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={searchRAWG}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-semibold flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Search RAWG
                      </button>
                      <button
                        onClick={loadGames}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded font-semibold"
                      >
                        Browse Database
                      </button>
                    </div>
                    {isRAWGSearch && (
                      <div className="bg-purple-600/20 border border-purple-600 text-purple-200 px-4 py-2 rounded">
                        Searching RAWG database. Games will be imported when added to collection.
                      </div>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
                    <Loader className="w-8 h-8 animate-spin" />
                    <p>Loading...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {activeTab === 'discover' ? (
                      filteredGames.length > 0 ? (
                        filteredGames.map((game) => (
                          <GameCard 
                            key={game.game_id || game.external_api_id} 
                            game={game} 
                            onSelect={handleGameSelect}
                            isRAWG={isRAWGSearch}
                          />
                        ))
                      ) : (
                        <div className="col-span-full text-center text-slate-400 py-12">
                          No games found. Try searching!
                        </div>
                      )
                    ) : (
                      collection.length > 0 ? (
                        collection.map((item) => (
                          <div key={item.game_id} className="relative group">
                            <div 
                              className="bg-slate-800 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105"
                              onClick={() => setEditingItem(item)}
                            >
                              {item.cover_image_url ? (
                                <img src={item.cover_image_url} alt={item.title} className="w-full h-48 object-cover" />
                              ) : (
                                <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                                  <Gamepad2 className="w-16 h-16 text-slate-600" />
                                </div>
                              )}
                              <div className="p-4">
                                <h3 className="text-white font-semibold text-lg mb-1 truncate">{item.title}</h3>
                                <p className="text-slate-400 text-sm mb-2">{item.developer || 'Unknown Developer'}</p>
                                
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                                    {item.play_status ? item.play_status.replace(/_/g, ' ') : 'UNKNOWN'}
                                  </span>
                                  {item.rating && (
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-4 h-4 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {item.personal_notes && (
                                  <p className="text-slate-400 text-xs italic truncate">"{item.personal_notes}"</p>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCollection(item.game_id);
                              }}
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-lg transition-all hover:scale-110 z-10"
                              title="Remove from collection"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center text-slate-400 py-12">
                          Your collection is empty. Start adding games!
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Modals - these are outside the conditional render */}
      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onAddToCollection={addToCollection}
          isRAWG={selectedGame.isRAWG}
          user={user}
          onViewProfile={(userId) => setViewingProfile(userId)}
        />
      )}

      {editingItem && (
        <CollectionEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={loadCollection}
        />
      )}
    </div>
  );
}

function App() {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-white animate-spin" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return user ? <GameHub /> : <AuthPage />;
}

export default function WrappedApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}