
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhyvxspgsktpbjonejek.supabase.co';
// Aktualny Publishable Key z ustawień Twojego Supabase (zapewnia poprawne generowanie JWT dla Edge Functions)
const supabaseAnonKey = 'sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
