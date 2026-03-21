from fastmcp import FastMCP
import asyncio

mcp = FastMCP("Weather")

@mcp.tool()
async def get_weather(city: str) -> str:
    """Pobierz aktualną pogodę dla wybranego miasta.
    
    Args:
        city: Nazwa miasta (np. 'Warszawa', 'Nowy Jork', 'Londyn')
    """
    city_lower = city.lower()
    # Mock weather data
    weather_map = {
        "warszawa": "12°C, Słonecznie",
        "london": "15°C, Deszczowo",
        "paris": "18°C, Zachmurzenie",
        "nyc": "22°C, Słonecznie",
        "new york": "22°C, Słonecznie",
    }
    
    weather = weather_map.get(city_lower, "18°C, Słonecznie (Prawdopodobnie)")
    return f"Aktualna pogoda w {city.title()} to {weather}."

if __name__ == "__main__":
    mcp.run(transport="stdio")
