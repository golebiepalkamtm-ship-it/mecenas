import asyncio
import os
import sys
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

load_dotenv()

async def test():
    api_key = os.getenv("GOOGLE_API_KEY")
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=api_key)
    
    # Simple tool
    from langchain_core.tools import tool
    @tool
    def add(a: int, b: int) -> int:
        """Add two numbers."""
        return a + b
        
    tools = [add]
    
    try:
        agent = create_agent(llm, tools)
        print("Agent created successfully")
        response = await agent.ainvoke({"messages": [HumanMessage(content="add 2 and 3")]})
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
