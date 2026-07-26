import { createClient } from '@supabase/supabase-js';

// Configuration du client Supabase
// Les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont obligatoires.
// Créez un fichier .env.local à la racine du projet avec ces valeurs.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[bld-trans-network] Variables d\'environnement manquantes : ' +
    'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises. ' +
    'Créez un fichier .env.local à la racine du projet.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Client secondaire isolé sans persistance de session pour permettre
// à un administrateur d'inscrire de nouveaux agents sans être déconnecté.
export const createIsolatedAuthClient = () => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};