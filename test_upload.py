import asyncio
import httpx
import base64

async def test_upload():
    # Read file
    with open('local_storage/knowledge_base/konstytucja.pdf', 'rb') as f:
        content = f.read()
        b64 = base64.b64encode(content).decode()

    # Test upload with multipart form
    data = {
        'filename': 'konstytucja.pdf',
        'content_type': 'application/pdf', 
        'content': b64,
        'category': 'rag_legal'
    }
    
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post('http://127.0.0.1:8003/upload-base64-document', data=data)
        print(f'Status: {response.status_code}')
        print(f'Response: {response.text[:500]}')

if __name__ == "__main__":
    asyncio.run(test_upload())
