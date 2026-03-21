import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient

async def test_langchain_mcp():
    mcp_config = {
        "docs-langchain": {
            "transport": "http",
            "url": "https://docs.langchain.com/mcp",
        }
    }
    
    print("Łączenie z LangChain Docs MCP (Streamable HTTP)...")
    try:
        client = MultiServerMCPClient(mcp_config)
        tools = await client.get_tools()
        print(f"✅ Połączono! Znaleziono {len(tools)} narzędzi:")
        for tool in tools:
            desc = tool.description[:120] if tool.description else "brak opisu"
            print(f"  - {tool.name}: {desc}")
    except Exception as e:
        print(f"❌ Błąd połączenia: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_langchain_mcp())
