
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhyvxspgsktpbjonejek.supabase.co';
// Aktualny Publishable Key z ustawień Twojego Supabase (zapewnia poprawne generowanie JWT dla Edge Functions)
// Klucz anon (Legacy JWT) - zapewnia pełną kompatybilność z RLS i politykami bazy
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeXZ4c3Bnc2t0cGJqb25lamVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODA3MzYsImV4cCI6MjA4OTY1NjczNn0.jQOwDd9T1b7xBj88EyKuokme2sEHLKm1A_96ed_BCKA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
