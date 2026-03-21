import asyncio
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent
from langchain_core.tools import tool

load_dotenv()

@tool
def dummy_tool(query: str) -> str:
    """A tool for testing."""
    return f"Result for {query}"

async def test():
    api_key = os.getenv("GOOGLE_API_KEY")
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=api_key)
    
    tools = [dummy_tool]
    
    try:
        agent = create_agent(llm, tools)
        print("Agent created successfully")
        # response = await agent.ainvoke({"messages": [{"role": "user", "content": "use dummy tool for hello"}]})
        # print(response)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
