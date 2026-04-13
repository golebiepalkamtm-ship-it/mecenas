#!/usr/bin/env python3
"""
Obsluga obrazow z wektorami CLIP - Supabase Storage + pgvector
"""

import asyncio
import httpx
import base64
import os
from typing import Dict, Any, Optional
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

class ImageEmbeddingService:
    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.supabase_key = SUPABASE_ANON_KEY
        self.storage_bucket = "images"
        
    async def upload_image_to_storage(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Krok 1: Upload pliku do Supabase Storage"""
        headers = {
            "Authorization": f"Bearer {self.supabase_key}",
            "apikey": self.supabase_key,
            "Content-Type": "application/json"
        }
        
        # Base64 encode dla uploadu
        b64_content = base64.b64encode(file_content).decode()
        
        storage_data = {
            "file": b64_content,
            "path": f"user_docs/{filename}"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/storage/v0/object/{self.storage_bucket}/{filename}",
                headers=headers,
                json=storage_data
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "storage_path": f"user_docs/{filename}",
                    "size": len(file_content)
                }
            else:
                return {
                    "success": False,
                    "error": f"Storage upload failed: {response.status_code} - {response.text}"
                }
    
    async def generate_clip_embedding(self, file_content: bytes) -> Optional[list[float]]:
        """Krok 2: Generowanie wektora CLIP (tymczasowo mock)"""
        # TODO: Zaimplementowac CLIP embedding
        # Na razie zwracam losowy wektor 512 wymiarow
        import random
        return [random.random() for _ in range(512)]
    
    async def save_image_embedding(self, storage_path: str, filename: str, 
                                 content_type: str, file_size: int, 
                                 embedding: list[float], metadata: Dict = None) -> bool:
        """Krok 3: Zapis wektora do bazy danych"""
        headers = {
            "Authorization": f"Bearer {self.supabase_key}",
            "apikey": self.supabase_key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        record = {
            "storage_path": storage_path,
            "filename": filename,
            "content_type": content_type,
            "file_size": file_size,
            "embedding": embedding,
            "metadata": metadata or {}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/image_embeddings",
                headers=headers,
                json=record
            )
            
            return response.status_code == 201
    
    async def process_image(self, file_content: bytes, filename: str, 
                          content_type: str) -> Dict[str, Any]:
        """Kompletny proces: Storage -> CLIP -> Baza"""
        try:
            # Krok 1: Upload do Storage
            storage_result = await self.upload_image_to_storage(file_content, filename)
            if not storage_result["success"]:
                return storage_result
            
            storage_path = storage_result["storage_path"]
            file_size = storage_result["size"]
            
            # Krok 2: Generowanie wektora CLIP
            embedding = await self.generate_clip_embedding(file_content)
            if not embedding:
                return {"success": False, "error": "Failed to generate embedding"}
            
            # Krok 3: Zapis do bazy
            success = await self.save_image_embedding(
                storage_path, filename, content_type, file_size, embedding
            )
            
            if success:
                return {
                    "success": True,
                    "storage_path": storage_path,
                    "embedding_dims": len(embedding),
                    "message": f"Image {filename} processed successfully"
                }
            else:
                return {"success": False, "error": "Failed to save embedding"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def search_similar_images(self, query_embedding: list[float], limit: int = 5) -> list:
        """Wyszukiwanie podobnych obrazów"""
        headers = {
            "Authorization": f"Bearer {self.supabase_key}",
            "apikey": self.supabase_key,
            "Content-Type": "application/json"
        }
        
        # Uzyj RPC function dla wyszukiwania wektorowego
        payload = {
            "query_embedding": query_embedding,
            "match_threshold": 0.5,
            "match_count": limit
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/rpc/search_similar_images",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return []

# Globalna instancja serwisu
image_service = ImageEmbeddingService()
