import { createClient } from '@supabase/supabase-js'

// Haetaan Supabasen URL ja anon key ympäristömuuttujista
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Varmistetaan, että muuttujat on asetettu
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or anon key is missing. Make sure to set them in your .env.local file.");
}

// Luodaan ja exportataan Supabase client, jota käytetään koko sovelluksessa
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
