import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
import os

class RAWGService:
    """
    Service for interacting with RAWG Video Games Database API.
    
    To use RAWG API:
    1. Register at https://rawg.io/apidocs
    2. Get your free API key
    3. Set environment variable: RAWG_API_KEY
    
    Free tier: 20,000 requests/month
    No OAuth needed - just API key!
    """
    
    BASE_URL = "https://api.rawg.io/api"
    
    def __init__(self):
        # Fixed: Changed RAWG_API_FILE to RAWG_API_KEY and removed 'r' from open mode
        api_key_file = os.getenv("RAWG_API_KEY")
        if api_key_file:
            with open(api_key_file, 'r') as f:
                self.api_key = f.read().strip()
        else:
            self.api_key = None
        
        if not self.api_key:
            print("Warning: RAWG_API_KEY not set. API calls will fail.")
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make a request to RAWG API."""
        if params is None:
            params = {}
        
        params["key"] = self.api_key
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise Exception(f"RAWG API error: {response.status_code} - {response.text}")
            
            return response.json()
    
    async def search_games(self, search_term: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for games by name.
        
        Returns list of games with basic info.
        """
        data = await self._make_request("games", {
            "search": search_term,
            "page_size": limit,
            "ordering": "-rating"  # Best rated first
        })
        
        return data.get("results", [])
    
    async def get_game_by_id(self, rawg_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed game information by RAWG ID.
        """
        try:
            return await self._make_request(f"games/{rawg_id}")
        except Exception:
            return None
    
    async def get_popular_games(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get popular/trending games.
        """
        data = await self._make_request("games", {
            "page_size": limit,
            "ordering": "-added",  # Most added to collections
            "metacritic": "80,100"  # High rated only
        })
        
        return data.get("results", [])
    
    def format_game_data(self, rawg_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format RAWG response to match our database schema.
        """
        # Extract developer (first one)
        developer = None
        developers = rawg_data.get("developers", [])
        if developers and len(developers) > 0:
            developer = developers[0].get("name")
        
        # Extract genres
        genres = []
        for genre in rawg_data.get("genres", []):
            if "name" in genre:
                genres.append(genre["name"])
        
        # Extract platforms
        platforms = []
        for platform_data in rawg_data.get("platforms", []):
            if "platform" in platform_data and "name" in platform_data["platform"]:
                platforms.append(platform_data["platform"]["name"])
        
        # Get cover image
        cover_url = rawg_data.get("background_image")
        
        # Get release date
        release_date = rawg_data.get("released")  # Already in YYYY-MM-DD format
        
        # Get description (use short description if available)
        description = rawg_data.get("description_raw", "")
        if len(description) > 500:
            description = description[:500] + "..."
        
        return {
            "external_api_id": str(rawg_data.get("id")),
            "title": rawg_data.get("name"),
            "developer": developer,
            "release_date": release_date,
            "cover_image_url": cover_url,
            "genres": genres,
            "platforms": platforms,
            "summary": description,
            "rating": rawg_data.get("rating"),
            "metacritic": rawg_data.get("metacritic")
        }


# Singleton instance
rawg_service = RAWGService()