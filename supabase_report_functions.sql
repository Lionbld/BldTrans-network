-- ================================================================
-- MIGRATION : Fonctions RPC de Rapports (Backend Supabase)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ================================================================

-- ================================================================
-- FONCTION 1 : Rapport Journalier
-- Formule solde :
--   opening_balance + (envois.montant + envois.frais) - services.montant + mouv+ - mouv- - dépenses
-- Formule revenu net :
--   frais_envois - dépenses
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
  -- Envois du jour (filtre par agence via agents.agence_agens)
  envois AS (
    SELECT
      t.id, t.code, t.montant, t.frais,
      t.date_transfert, t.user_envoi,
      a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_envoi
    WHERE t.date_transfert::date = p_date
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  -- Services du jour = transferts payés (etat_trans = false) filtrés par date_servi
  services AS (
    SELECT
      t.id, t.code, t.montant,
      t.date_servi, t.user_servi,
      a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_servi
    WHERE t.etat_trans = false
      AND t.date_servi::date = p_date
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  -- Dépenses du jour
  dep AS (
    SELECT id, montant, motif, created_at, agence_depense
    FROM depense
    WHERE created_at::date = p_date
      AND (p_agence_id IS NULL OR agence_depense = p_agence_id)
  ),
  -- Mouvements + du jour
  mp AS (
    SELECT id, montant, motif, date_mouvement, agence_mouvplus
    FROM mouvementplus
    WHERE date_mouvement::date = p_date
      AND (p_agence_id IS NULL OR agence_mouvplus = p_agence_id)
  ),
  -- Mouvements - du jour
  mm AS (
    SELECT id, montant, motif, date_mouvement, agence_mouvmoins
    FROM mouvementminus
    WHERE date_mouvement::date = p_date
      AND (p_agence_id IS NULL OR agence_mouvmoins = p_agence_id)
  ),
  -- Report (solde d'ouverture) du jour
  dr AS (
    SELECT agence_id, opening_balance, date_report
    FROM daily_reports
    WHERE date_report::date = p_date
      AND (p_agence_id IS NULL OR agence_id = p_agence_id)
  ),
  -- Agrégats globaux
  agg AS (
    SELECT
      COALESCE(SUM(e.montant), 0)                               AS total_envois_montant,
      COALESCE(SUM(e.frais), 0)                                  AS total_frais,
      COALESCE((SELECT SUM(s.montant) FROM services s), 0)      AS total_services_montant,
      COALESCE((SELECT SUM(d.montant) FROM dep d), 0)           AS total_depenses,
      COALESCE((SELECT SUM(m.montant) FROM mp m), 0)            AS total_mouv_plus,
      COALESCE((SELECT SUM(m.montant) FROM mm m), 0)            AS total_mouv_minus,
      COALESCE((SELECT SUM(r.opening_balance) FROM dr r), 0)    AS opening_balance,
      COUNT(e.id)                                                AS nb_envois,
      COALESCE((SELECT COUNT(s.id) FROM services s), 0)         AS nb_services
    FROM envois e
  ),
  -- Classement par agence (pour mode "toutes agences")
  ranking AS (
    SELECT
      ag.id AS agence_id,
      ag.nom AS agence_nom,
      COALESCE(SUM(e.montant), 0)                                        AS envois_montant,
      COALESCE(SUM(e.frais), 0)                                          AS frais_total,
      COALESCE((SELECT SUM(s.montant) FROM services s WHERE s.agence_id = ag.id), 0) AS services_total,
      COALESCE((SELECT SUM(d.montant) FROM dep d WHERE d.agence_depense = ag.id), 0) AS depenses_total,
      COALESCE((SELECT SUM(m.montant) FROM mp m WHERE m.agence_mouvplus = ag.id), 0) AS mouv_plus_total,
      COALESCE((SELECT SUM(m.montant) FROM mm m WHERE m.agence_mouvmoins = ag.id), 0) AS mouv_minus_total,
      COALESCE((SELECT opening_balance FROM dr r WHERE r.agence_id = ag.id LIMIT 1), 0) AS opening_balance,
      COUNT(e.id)                                                         AS nb_envois,
      COALESCE((SELECT COUNT(s.id) FROM services s WHERE s.agence_id = ag.id), 0) AS nb_services
    FROM agence ag
    LEFT JOIN envois e ON e.agence_id = ag.id
    WHERE p_agence_id IS NULL
    GROUP BY ag.id, ag.nom
  )
  SELECT json_build_object(
    'opening_balance',        agg.opening_balance,
    'total_envois_montant',   agg.total_envois_montant,
    'total_frais',            agg.total_frais,
    'total_services_montant', agg.total_services_montant,
    'total_depenses',         agg.total_depenses,
    'total_mouv_plus',        agg.total_mouv_plus,
    'total_mouv_minus',       agg.total_mouv_minus,
    'nb_envois',              agg.nb_envois,
    'nb_services',            agg.nb_services,
    -- Solde = opening + (envois montant+frais) - services montant + mouv+ - mouv- - depenses
    'solde',
      agg.opening_balance
      + agg.total_envois_montant
      + agg.total_frais
      - agg.total_services_montant
      + agg.total_mouv_plus
      - agg.total_mouv_minus
      - agg.total_depenses,
    'revenu_net',             agg.total_frais - agg.total_depenses,
    'agencies_detail',
      CASE WHEN p_agence_id IS NULL THEN (
        SELECT json_agg(
          json_build_object(
            'agence_id',    r.agence_id,
            'name',         r.agence_nom,
            'opening_balance', r.opening_balance,
            'envois',       r.envois_montant,
            'frais',        r.frais_total,
            'services',     r.services_total,
            'depenses',     r.depenses_total,
            'mouv_plus',    r.mouv_plus_total,
            'mouv_minus',   r.mouv_minus_total,
            'nb_envois',    r.nb_envois,
            'nb_services',  r.nb_services,
            'solde',
              r.opening_balance
              + r.envois_montant
              + r.frais_total
              - r.services_total
              + r.mouv_plus_total
              - r.mouv_minus_total
              - r.depenses_total
          ) ORDER BY r.envois_montant DESC
        )
        FROM ranking r
        WHERE r.nb_envois > 0 OR r.nb_services > 0 OR r.depenses_total > 0
      ) ELSE NULL END
  ) INTO v_result
  FROM agg;

  RETURN v_result;
END;
$$;


-- ================================================================
-- FONCTION 2 : Rapport Hebdomadaire
-- ================================================================
CREATE OR REPLACE FUNCTION get_weekly_report(
  p_from      date,
  p_to        date,
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
  envois AS (
    SELECT t.montant, t.frais, t.id, a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_envoi
    WHERE t.date_transfert::date BETWEEN p_from AND p_to
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  services AS (
    SELECT t.montant, t.id, a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_servi
    WHERE t.etat_trans = false
      AND t.date_servi::date BETWEEN p_from AND p_to
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  dep AS (
    SELECT d.montant, d.agence_depense
    FROM depense d
    WHERE d.created_at::date BETWEEN p_from AND p_to
      AND (p_agence_id IS NULL OR d.agence_depense = p_agence_id)
  ),
  agg AS (
    SELECT
      COALESCE(SUM(e.montant), 0)                           AS total_envois,
      COALESCE(SUM(e.frais), 0)                              AS total_frais,
      COUNT(e.id)                                            AS nb_envois,
      COALESCE((SELECT SUM(s.montant) FROM services s), 0)  AS total_services,
      COALESCE((SELECT COUNT(s.id)   FROM services s), 0)   AS nb_services,
      COALESCE((SELECT SUM(d.montant) FROM dep d), 0)       AS total_depenses
    FROM envois e
  ),
  ranking AS (
    SELECT
      ag.id   AS agence_id,
      ag.nom  AS agence_nom,
      COALESCE(SUM(e.montant), 0)                                        AS volume,
      COALESCE(SUM(e.frais),   0)                                        AS frais,
      COUNT(e.id)                                                         AS nb_envois,
      COALESCE((SELECT COUNT(s.id) FROM services s WHERE s.agence_id = ag.id), 0)  AS nb_services,
      COALESCE((SELECT SUM(s.montant) FROM services s WHERE s.agence_id = ag.id), 0) AS services_vol,
      COALESCE((SELECT SUM(d.montant) FROM dep d WHERE d.agence_depense = ag.id), 0) AS dep_total
    FROM agence ag
    LEFT JOIN envois e ON e.agence_id = ag.id
    WHERE p_agence_id IS NULL
    GROUP BY ag.id, ag.nom
  )
  SELECT json_build_object(
    'total_envois',   agg.total_envois,
    'total_frais',    agg.total_frais,
    'total_services', agg.total_services,
    'total_depenses', agg.total_depenses,
    'nb_envois',      agg.nb_envois,
    'nb_services',    agg.nb_services,
    'revenu_net',     agg.total_frais - agg.total_depenses,
    'taux_service',
      CASE WHEN agg.nb_envois > 0
        THEN ROUND((agg.nb_services::numeric / agg.nb_envois) * 100, 2)
        ELSE 0
      END,
    'agencies_ranking',
      CASE WHEN p_agence_id IS NULL THEN (
        SELECT json_agg(
          json_build_object(
            'agence_id',   r.agence_id,
            'name',        r.agence_nom,
            'volume',      r.volume,
            'frais',       r.frais,
            'services',    r.services_vol,
            'nb_envois',   r.nb_envois,
            'nb_services', r.nb_services,
            'nb_ops',      r.nb_envois + r.nb_services,
            'dep_total',   r.dep_total,
            'revenu',      r.frais - r.dep_total
          ) ORDER BY r.volume DESC
        )
        FROM ranking r
        WHERE r.nb_envois > 0 OR r.nb_services > 0
      ) ELSE NULL END
  ) INTO v_result
  FROM agg;

  RETURN v_result;
END;
$$;


-- ================================================================
-- FONCTION 3 : Rapport Mensuel
-- ================================================================
CREATE OR REPLACE FUNCTION get_monthly_report(
  p_year      integer,
  p_month     integer,
  p_agence_id integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_from date;
  v_to   date;
  v_result json;
BEGIN
  v_from := make_date(p_year, p_month, 1);
  v_to   := (v_from + interval '1 month - 1 day')::date;

  WITH
  envois AS (
    SELECT t.montant, t.frais, t.id, a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_envoi
    WHERE t.date_transfert::date BETWEEN v_from AND v_to
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  services AS (
    SELECT t.montant, t.id, a.agence_agens AS agence_id
    FROM transferts t
    JOIN agents a ON a.id = t.user_servi
    WHERE t.etat_trans = false
      AND t.date_servi::date BETWEEN v_from AND v_to
      AND (p_agence_id IS NULL OR a.agence_agens = p_agence_id)
  ),
  dep AS (
    SELECT d.montant, d.agence_depense
    FROM depense d
    WHERE d.created_at::date BETWEEN v_from AND v_to
      AND (p_agence_id IS NULL OR d.agence_depense = p_agence_id)
  ),
  agg AS (
    SELECT
      COALESCE(SUM(e.montant), 0)                           AS total_envois,
      COALESCE(SUM(e.frais), 0)                              AS total_frais,
      COUNT(e.id)                                            AS nb_envois,
      COALESCE((SELECT SUM(s.montant) FROM services s), 0)  AS total_services,
      COALESCE((SELECT COUNT(s.id)   FROM services s), 0)   AS nb_services,
      COALESCE((SELECT SUM(d.montant) FROM dep d), 0)       AS total_depenses
    FROM envois e
  ),
  ranking AS (
    SELECT
      ag.id   AS agence_id,
      ag.nom  AS agence_nom,
      COALESCE(SUM(e.montant), 0)                                        AS volume,
      COALESCE(SUM(e.frais),   0)                                        AS frais,
      COUNT(e.id)                                                         AS nb_envois,
      COALESCE((SELECT COUNT(s.id) FROM services s WHERE s.agence_id = ag.id), 0)  AS nb_services,
      COALESCE((SELECT SUM(s.montant) FROM services s WHERE s.agence_id = ag.id), 0) AS services_vol,
      COALESCE((SELECT SUM(d.montant) FROM dep d WHERE d.agence_depense = ag.id), 0) AS dep_total
    FROM agence ag
    LEFT JOIN envois e ON e.agence_id = ag.id
    WHERE p_agence_id IS NULL
    GROUP BY ag.id, ag.nom
  )
  SELECT json_build_object(
    'date_from',       v_from,
    'date_to',         v_to,
    'total_envois',    agg.total_envois,
    'total_frais',     agg.total_frais,
    'total_services',  agg.total_services,
    'total_depenses',  agg.total_depenses,
    'nb_envois',       agg.nb_envois,
    'nb_services',     agg.nb_services,
    'nb_total',        agg.nb_envois + agg.nb_services,
    'revenu_net',      agg.total_frais - agg.total_depenses,
    'taux_service',
      CASE WHEN agg.nb_envois > 0
        THEN ROUND((agg.nb_services::numeric / agg.nb_envois) * 100, 2)
        ELSE 0
      END,
    'marge_nette',
      CASE WHEN agg.total_frais > 0
        THEN ROUND(((agg.total_frais - agg.total_depenses)::numeric / agg.total_frais) * 100, 2)
        ELSE 0
      END,
    'moy_transaction',
      CASE WHEN (agg.nb_envois + agg.nb_services) > 0
        THEN ROUND((agg.total_envois + agg.total_services)::numeric / (agg.nb_envois + agg.nb_services), 2)
        ELSE 0
      END,
    'agencies_ranking',
      CASE WHEN p_agence_id IS NULL THEN (
        SELECT json_agg(
          json_build_object(
            'agence_id',   r.agence_id,
            'name',        r.agence_nom,
            'volume',      r.volume,
            'frais',       r.frais,
            'services',    r.services_vol,
            'nb_envois',   r.nb_envois,
            'nb_services', r.nb_services,
            'dep_total',   r.dep_total,
            'revenu',      r.frais - r.dep_total
          ) ORDER BY r.volume DESC
        )
        FROM ranking r
        WHERE r.nb_envois > 0 OR r.nb_services > 0
      ) ELSE NULL END
  ) INTO v_result
  FROM agg;

  RETURN v_result;
END;
$$;


-- ================================================================
-- GRANTS : permettre aux utilisateurs d'appeler les fonctions
-- ================================================================
GRANT EXECUTE ON FUNCTION get_daily_report(date, integer)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_report(date, date, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_report(integer, integer, integer) TO anon, authenticated;
