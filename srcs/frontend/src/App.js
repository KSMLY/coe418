import React, { useState, useEffect } from 'react';
import { Search, LogOut, Library, Star, Calendar, Gamepad2, Plus, Loader, AlertCircle } from 'lucide-react';

// API Configuration
const API_BASE = 'https://localhost/api';

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

// Game Details Modal
function GameDetailsModal({ game, onClose, onAddToCollection, isRAWG = false }) {
  const [loading, setLoading] = useState(false);
  const [playStatus, setPlayStatus] = useState('not_started');
  const [rating, setRating] = useState(null);
  const [error, setError] = useState('');

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
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
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

// Main App Component
function GameHub() {
  const { user, logout } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('discover');
  const [games, setGames] = useState([]);
  const [collection, setCollection] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRAWGSearch, setIsRAWGSearch] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'discover') {
      loadGames();
    } else if (activeTab === 'collection') {
      loadCollection();
    }
  }, [activeTab]);

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
      setCollection(data);
    } catch (err) {
      setError('Failed to load collection: ' + err.message);
      console.error(err);
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

  return (
    <div className="min-h-screen bg-slate-900">
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">GameHub</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{user?.display_name || user?.username}</span>
            {user?.role === 'admin' && (
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
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setActiveTab('discover');
              setSearchQuery('');
              setIsRAWGSearch(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              activeTab === 'discover' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
            Discover
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              activeTab === 'collection' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Library className="w-4 h-4" />
            My Collection ({collection.length})
          </button>
        </div>

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
                  <div key={item.game_id} className="relative">
                    <GameCard game={item} onSelect={() => {}} />
                    <button
                      onClick={() => removeFromCollection(item.game_id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs text-white">
                      {item.play_status.replace('_', ' ').toUpperCase()}
                      {item.rating && (
                        <span className="ml-2">★ {item.rating}</span>
                      )}
                    </div>
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
      </div>

      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onAddToCollection={addToCollection}
          isRAWG={selectedGame.isRAWG}
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