-- ================================================================
-- CORRECTIF RLS : table system_settings
-- Problème : la politique INSERT est manquante → upsert bloqué
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Supprimer les anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Lecture publique des parametres"   ON public.system_settings;
DROP POLICY IF EXISTS "Mise a jour des parametres"        ON public.system_settings;

-- 2. Recréer les politiques complètes (SELECT + INSERT + UPDATE)

-- Lecture : tout le monde peut lire
CREATE POLICY "system_settings_select"
  ON public.system_settings
  FOR SELECT
  USING (true);

-- Insertion : autorisée (la contrainte CHECK id=1 protège déjà le singleton)
CREATE POLICY "system_settings_insert"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (id = 1);

-- Mise à jour : autorisée (seule la ligne id=1 peut être modifiée)
CREATE POLICY "system_settings_update"
  ON public.system_settings
  FOR UPDATE
  USING (id = 1)
  WITH CHECK (id = 1);

-- 3. S'assurer que la ligne singleton existe (évite tout upsert manquant)
INSERT INTO public.system_settings (
  id, maintenance_mode, commission_percent, frais_fixe_min,
  limite_quotidienne_agent, montant_max_envoi, montant_max_versement
)
VALUES (1, false, 5, 2, 10000, 5000, 3000)
ON CONFLICT (id) DO NOTHING;
