import { createClient } from '@supabase/supabase-js';

// Configuration du client Supabase
// Utilisez les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hgghahkssvmyodhtwnmh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZ2hhaGtzc3ZteW9kaHR3bm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTM2NzQsImV4cCI6MjA2MDI4OTY3NH0.0QiYdmT8t1V2_6PLfBFctaSooVXt3YyBvauwOxAbTL8';

export const supabase = createClient(supabaseUrl, supabaseKey);