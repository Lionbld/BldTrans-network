-- ================================================================
-- MIGRATION : Fonctions RPC de Rapports Multi-Devises (Backend Supabase)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ================================================================

-- ================================================================
-- FONCTION 1 : Rapport Journalier (MULTI-DEVISES)
-- Formule solde USD :
--   opening_balance + (envois.montant + envois.frais) - services.montant + mouv+ - mouv- - dépenses + change_usd_plus - change_usd_minus
-- Formule solde LOCAL :
--   opening_balance_local + envois_net_local - services_net_local - dépenses_local + change_local_plus - change_local_minus
-- ================================================================
CREATE OR REPLACE FUNCTION get_daily_report(
  p_date      date,
  p_agence_id integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  WITH
  -- Envois du jour
  envois AS (
    SELECT
      t.id, t.montant, t.frais,
      COALESCE(t.envoi_recu_local, 0) AS recu_local,
      COALESCE(t.envoi_rendu_local, 0) AS rendu_local,
      t.date_transfert, a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_envoi
    WHERE t.date_transfert::date = p_date
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  -- Services du jour
  services AS (
    SELECT
      t.id, t.montant,
      COALESCE(t.service_donne_local, 0) AS donne_local,
      COALESCE(t.service_recu_local, 0) AS recu_local,
      t.date_servi, a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_servi
    WHERE t.etat_trans = false
      AND t.date_servi::date = p_date
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  -- Dépenses du jour
  dep AS (
    SELECT id, montant, COALESCE(montant_local, 0) AS montant_local, agence_depense AS agence_id
    FROM depense
    WHERE created_at::date = p_date
      AND (p_agence_id IS NULL OR agence_depense = p_agence_id)
  ),
  -- Mouvements + du jour (USD uniquement)
  mp AS (
    SELECT id, montant, agence_mouvplus AS agence_id
    FROM mouvementplus
    WHERE date_mouvement::date = p_date
      AND (p_agence_id IS NULL OR agence_mouvplus = p_agence_id)
  ),
  -- Mouvements - du jour (USD uniquement)
  mm AS (
    SELECT id, montant, agence_mouvmoins AS agence_id
    FROM mouvementminus
    WHERE date_mouvement::date = p_date
      AND (p_agence_id IS NULL OR agence_mouvmoins = p_agence_id)
  ),
  -- Report (solde d'ouverture) du jour
  dr AS (
    SELECT agence_id, opening_balance, COALESCE(opening_balance_local, 0) AS opening_balance_local
    FROM daily_reports
    WHERE date_report::date = p_date
      AND (p_agence_id IS NULL OR agence_id = p_agence_id)
  ),
  -- Mouvements de change
  mc AS (
    SELECT id, agence_id, montant_usd, montant_local, sens
    FROM mouvement_change
    WHERE created_at::date = p_date
      AND (p_agence_id IS NULL OR agence_id = p_agence_id)
  ),
  -- Agrégats globaux
  agg AS (
    SELECT
      COALESCE(SUM(e.montant + e.frais), 0)                      AS total_envois_montant,
      COALESCE(SUM(e.frais), 0)                                  AS total_frais,
      COALESCE(SUM(e.recu_local - e.rendu_local), 0)             AS total_envois_local,
      COALESCE((SELECT SUM(s.montant) FROM services s), 0)       AS total_services_montant,
      COALESCE((SELECT SUM(s.donne_local - s.recu_local) FROM services s), 0) AS total_services_local,
      COALESCE((SELECT SUM(d.montant) FROM dep d), 0)            AS total_depenses,
      COALESCE((SELECT SUM(d.montant_local) FROM dep d), 0)      AS total_depenses_local,
      COALESCE((SELECT SUM(m.montant) FROM mp m), 0)             AS total_mouv_plus,
      COALESCE((SELECT SUM(m.montant) FROM mm m), 0)             AS total_mouv_minus,
      COALESCE((SELECT SUM(r.opening_balance) FROM dr r), 0)     AS opening_balance,
      COALESCE((SELECT SUM(r.opening_balance_local) FROM dr r), 0) AS opening_balance_local,
      
      -- Changes USD
      COALESCE((SELECT SUM(m.montant_usd) FROM mc m WHERE m.sens = 'local_vers_usd'), 0) AS change_usd_plus,
      COALESCE((SELECT SUM(m.montant_usd) FROM mc m WHERE m.sens = 'usd_vers_local'), 0) AS change_usd_minus,
      -- Changes Local
      COALESCE((SELECT SUM(m.montant_local) FROM mc m WHERE m.sens = 'usd_vers_local'), 0) AS change_local_plus,
      COALESCE((SELECT SUM(m.montant_local) FROM mc m WHERE m.sens = 'local_vers_usd'), 0) AS change_local_minus,
      
      COUNT(e.id)                                                AS nb_envois,
      COALESCE((SELECT COUNT(s.id) FROM services s), 0)          AS nb_services
    FROM envois e
  ),
  -- Classement par agence (pour mode "toutes agences")
  ranking AS (
    SELECT
      ag.id AS agence_id,
      ag.nom AS agence_nom,
      p.monnaie AS monnaie,
      p.symbole AS symbole,
      p.taux_change AS taux_change,
      COALESCE(SUM(e.montant + e.frais), 0)                              AS envois_montant,
      COALESCE(SUM(e.frais), 0)                                          AS frais_total,
      COALESCE(SUM(e.recu_local - e.rendu_local), 0)                     AS envois_local,
      COALESCE((SELECT SUM(s.montant) FROM services s WHERE s.agence_id = ag.id), 0) AS services_total,
      COALESCE((SELECT SUM(s.donne_local - s.recu_local) FROM services s WHERE s.agence_id = ag.id), 0) AS services_local,
      COALESCE((SELECT SUM(d.montant) FROM dep d WHERE d.agence_id = ag.id), 0) AS depenses_total,
      COALESCE((SELECT SUM(d.montant_local) FROM dep d WHERE d.agence_id = ag.id), 0) AS depenses_local,
      COALESCE((SELECT SUM(m.montant) FROM mp m WHERE m.agence_id = ag.id), 0) AS mouv_plus_total,
      COALESCE((SELECT SUM(m.montant) FROM mm m WHERE m.agence_id = ag.id), 0) AS mouv_minus_total,
      COALESCE((SELECT opening_balance FROM dr r WHERE r.agence_id = ag.id LIMIT 1), 0) AS opening_balance,
      COALESCE((SELECT opening_balance_local FROM dr r WHERE r.agence_id = ag.id LIMIT 1), 0) AS opening_balance_local,
      
      COALESCE((SELECT SUM(m.montant_usd) FROM mc m WHERE m.agence_id = ag.id AND m.sens = 'local_vers_usd'), 0) AS change_usd_plus,
      COALESCE((SELECT SUM(m.montant_usd) FROM mc m WHERE m.agence_id = ag.id AND m.sens = 'usd_vers_local'), 0) AS change_usd_minus,
      COALESCE((SELECT SUM(m.montant_local) FROM mc m WHERE m.agence_id = ag.id AND m.sens = 'usd_vers_local'), 0) AS change_local_plus,
      COALESCE((SELECT SUM(m.montant_local) FROM mc m WHERE m.agence_id = ag.id AND m.sens = 'local_vers_usd'), 0) AS change_local_minus,

      COUNT(e.id)                                                         AS nb_envois,
      COALESCE((SELECT COUNT(s.id) FROM services s WHERE s.agence_id = ag.id), 0) AS nb_services
    FROM agence ag
    LEFT JOIN ville v ON ag.ville_agence = v.id
    LEFT JOIN pays p ON v.pays = p.id
    LEFT JOIN envois e ON e.agence_id = ag.id
    WHERE p_agence_id IS NULL
    GROUP BY ag.id, ag.nom, p.monnaie, p.symbole, p.taux_change
  )
  SELECT json_build_object(
    'opening_balance',        agg.opening_balance,
    'total_envois_montant',   agg.total_envois_montant,
    'total_frais',            agg.total_frais,
    'total_services_montant', agg.total_services_montant,
    'total_depenses',         agg.total_depenses,
    'total_mouv_plus',        agg.total_mouv_plus,
    'total_mouv_minus',       agg.total_mouv_minus,
    
    'opening_balance_local',  agg.opening_balance_local,
    'total_envois_local',     agg.total_envois_local,
    'total_services_local',   agg.total_services_local,
    'total_depenses_local',   agg.total_depenses_local,
    'change_usd_plus',        agg.change_usd_plus,
    'change_usd_minus',       agg.change_usd_minus,
    'change_local_plus',      agg.change_local_plus,
    'change_local_minus',     agg.change_local_minus,

    'nb_envois',              agg.nb_envois,
    'nb_services',            agg.nb_services,
    
    -- Solde USD = opening + envois - services + mouv+ - mouv- - depenses + change_usd_plus - change_usd_minus
    'solde',
      agg.opening_balance
      + agg.total_envois_montant
      - agg.total_services_montant
      + agg.total_mouv_plus
      - agg.total_mouv_minus
      - agg.total_depenses
      + agg.change_usd_plus
      - agg.change_usd_minus,
      
    -- Solde LOCAL = opening_local + envois_local - services_local - depenses_local + change_local_plus - change_local_minus
    'solde_local',
      agg.opening_balance_local
      + agg.total_envois_local
      - agg.total_services_local
      - agg.total_depenses_local
      + agg.change_local_plus
      - agg.change_local_minus,

    'revenu_net',             agg.total_frais - agg.total_depenses,
    
    'agencies_detail',
      CASE WHEN p_agence_id IS NULL THEN (
        SELECT json_agg(
          json_build_object(
            'agence_id',       r.agence_id,
            'name',            r.agence_nom,
            'monnaie',         r.monnaie,
            'symbole',         r.symbole,
            'taux_change',     r.taux_change,
            
            'opening_balance', r.opening_balance,
            'envois',          r.envois_montant,
            'frais',           r.frais_total,
            'services',        r.services_total,
            'depenses',        r.depenses_total,
            'mouv_plus',       r.mouv_plus_total,
            'mouv_minus',      r.mouv_minus_total,
            
            'opening_balance_local', r.opening_balance_local,
            'envois_local',          r.envois_local,
            'services_local',        r.services_local,
            'depenses_local',        r.depenses_local,
            
            'change_usd_plus',       r.change_usd_plus,
            'change_usd_minus',      r.change_usd_minus,
            'change_local_plus',     r.change_local_plus,
            'change_local_minus',    r.change_local_minus,
            
            'nb_envois',       r.nb_envois,
            'nb_services',     r.nb_services,
            
            'solde',
              r.opening_balance
              + r.envois_montant
              - r.services_total
              + r.mouv_plus_total
              - r.mouv_minus_total
              - r.depenses_total
              + r.change_usd_plus
              - r.change_usd_minus,
              
            'solde_local',
              r.opening_balance_local
              + r.envois_local
              - r.services_local
              - r.depenses_local
              + r.change_local_plus
              - r.change_local_minus
          ) ORDER BY (r.envois_montant + r.frais_total) DESC
        )
        FROM ranking r
      ) ELSE NULL END
  ) INTO v_result
  FROM agg;

  RETURN v_result;
END;
$$;
