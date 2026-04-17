import os
import json
from supabase import create_client, Client

# Supabase credentials (z environment variables lub hardcoded dla testu)
SUPABASE_URL = "https://fwsxhfkqjkxqzjvmpbha.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3c3hoZmtxamt4cXpqdm1wYmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY0MTM1NzEsImV4cCI6MjA0MTk4OTU3MX0.5Y8Q8r0vQJ2k7mTQZpQn7h6J2x8K9mY2fX3W4Z5l6c"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Check profiles table
try:
    result = supabase.table('profiles').select('*').limit(10).execute()
    print("Profiles from Supabase:")
    for profile in result.data:
        print(f"  ID: {profile.get('id')}, Email: {profile.get('email')}, Role: {profile.get('role')}")
except Exception as e:
    print(f"Error accessing profiles: {e}")

# Check if superadmin exists
try:
    result = supabase.table('profiles').select('*').eq('email', 'superadmin@palkamtm.pl').execute()
    print(f"\nSuperadmin check: {result.data}")
except Exception as e:
    print(f"Error checking superadmin: {e}")
