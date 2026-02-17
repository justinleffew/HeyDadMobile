import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://extfuvnhdbmpcxeecnqc.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4dGZ1dm5oZGJtcGN4ZWVjbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMjEyNDcsImV4cCI6MjA2Mzc5NzI0N30.RCoJBL9cQXENlP8F_YWB340D4_Bkj4JgSi5vqs3oGFQ"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
