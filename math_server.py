from fastmcp import FastMCP
import asyncio

mcp = FastMCP("Math")

@mcp.tool()
def calculate(expression: str) -> str:
    """Wykonaj operacje arytmetyczne (+, -, *, /)
    
    Args:
        expression: Wyrażenie matematyczne do obliczenia (np. '3 + 5 * 12')
    """
    try:
        # Note: In production, use a safer eval
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"Błąd w obliczeniach: {str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
