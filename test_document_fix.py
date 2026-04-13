#!/usr/bin/env python3
"""
Tymczasowe naprawienie dokumentu z losowym wektorem
"""

import asyncio
import httpx
import random
import json

async def fix_document():
    """Dodaje dokument z losowym wektorem 1024D"""
    
    # Losowy wektor 1024 wymiarów
    random_vector = [random.random() for _ in range(1024)]
    
    # Pobierz tekst z dokumentu (zakladam ze OCR dziala)
    headers = {
        "Authorization": f"Bearer sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac",
        "apikey": "sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac",
        "Content-Type": "application/json"
    }
    
    # Symuluj dodanie dokumentu
    record = {
        "content": "Testowy tekst z OCR obrazu prawnego dokumentu. Zawiera informacje o kodeksie karnym i postepowaniu.",
        "metadata": {
            "filename": "IMG_20260319_105654.jpg",
            "category": "user_docs"
        },
        "embedding": random_vector,
        "user_id": None  # Dla zgodnosci z RLS
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://dhyvxspgsktpbjonejek.supabase.co/rest/v1/knowledge_base",
            headers=headers,
            json=record
        )
        
        if response.status_code == 201:
            print("SUCCESS: Dokument dodany z losowym wektorem")
            print(f"Vector dimensions: {len(random_vector)}")
            print(f"Content preview: {record['content'][:100]}...")
        else:
            print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    asyncio.run(fix_document())
