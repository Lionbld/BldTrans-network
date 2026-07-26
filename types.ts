
// Matching public.agence
export interface Agence {
  id: number;
  created_at: string;
  nom: string | null;
  adresse: string | null;
  ville_agence: number | null; // FK to ville
  phone: string | null;
  verrou: boolean;
  limite_quotidienne: number | null; // null = pas de restriction
  // Computed/Joined fields for UI
  ville_name?: string;
  ville?: { name: string };
  balance?: number; // Calculated from movements
  usage_today?: number; // Calculated from RPC
  report_matin?: number; // Opening balance / Report du matin
  volume_today?: number; // Total volume réalisé dans la journée
  agents_count?: number; // Nombre d'agents rattachés à cette agence
}

// Matching public.agents
export interface Agent {
  id: number;
  user_id: string | null; // uuid
  agence_agens: number | null; // FK to agence
  phone: string;
  email: string;
  created_at: string;
  envoi: boolean; // Permission d'effectuer des envois de transferts
  admin: boolean;
  user_agent: string | null; // Nom complet (peut être null avant saisie)
  superadmin: boolean;
}

// Matching public.clients
export interface Client {
  id: number;
  fullname: string;
  phone: string | null;
  created_at: string;
  sexe: string | null;
  ids: number; // Unique ID used for foreign keys in transferts
}

// Matching public.transferts
export interface Transfert {
  id: number;
  code: string;
  etat_trans: boolean; // true = EN ATTENTE (non servi), false = déjà servi
  expediteur_id: number | null; // FK to clients.ids
  destinataire_id: number | null; // FK to clients.ids
  montant: number;
  frais: number;
  date_transfert: string | null;
  date_servi: string | null;
  m_passe: string | null;
  user_envoi: number; // FK to agents
  user_servi: number | null; // FK to agents
  was_modified: boolean;

  // UI Helper (Legacy/Manual)
  expediteur_name?: string;
  destinataire_name?: string;
  agence_name?: string;
  agence_id?: number | null; // Computed: extracted from agent_envoi.agence_agens for unique grouping
  agent_envoi_name?: string;
  agent_servi_name?: string;

  // Joined fields from Supabase
  expediteur?: { fullname: string };
  destinataire?: { fullname: string };
  agent_envoi?: { user_agent: string | null; agence_agens: number | null };
  agent_servi?: { user_agent: string | null };
  agence?: { nom: string | null };
}

// Matching public.ville
export interface Ville {
  id: number;
  name: string;
  pays: number | null;
}

// Matching public.daily_reports
export interface DailyReport {
  id: number;
  agence_id: number;
  date_report: string;
  opening_balance: number;
  closing_balance: number;
  total_transfers: number;
  total_amount: number;
  total_fees: number;
  agent_id: number | null;
  created_at?: string;
  // UI
  agence_name?: string;
}

// Matching public.depense
export interface Depense {
  id: number;
  created_at: string;
  montant: number;
  motif: string;
  agence_depense: number | null;
  // UI
  agence_name?: string;
}

// NOTE: L'app agent (bld-trans) utilise un type `Mouvement` unifié avec `type: 'plus'|'minus'`.
// Cette app admin conserve volontairement deux interfaces séparées (Option A - décision de synchronisation).
// Matching public.mouvementplus
export interface MouvementPlus {
  id: number;
  montant: number;
  date_mouvement: string;
  agence_mouvplus: number;
  motif: string;
  // UI
  agence_name?: string;
}

// Matching public.mouvementminus
export interface MouvementMinus {
  id: number;
  montant: number;
  date_mouvement: string;
  agence_mouvmoins: number;
  motif: string;
  // UI
  agence_name?: string;
}

// Matching public.report
export interface Report {
  id: number;
  description: string;
  date_creation: string | null;
  agence_report: number;
  montant: number;
  // UI
  agence_name?: string;
}

// ================================================================
// Types de retour des fonctions RPC de rapports (backend Supabase)
// ================================================================

export interface AgencyDailyDetail {
  agence_id: number;
  name: string;
  opening_balance: number;
  envois: number;      // montant total des envois
  frais: number;       // frais total des envois
  services: number;    // montant total des services
  depenses: number;
  mouv_plus: number;
  mouv_minus: number;
  nb_envois: number;
  nb_services: number;
  solde: number;
}

export interface DailyReportRPC {
  opening_balance: number;
  total_envois_montant: number;
  total_frais: number;
  total_services_montant: number;
  total_depenses: number;
  total_mouv_plus: number;
  total_mouv_minus: number;
  nb_envois: number;
  nb_services: number;
  solde: number;
  revenu_net: number;
  agencies_detail: AgencyDailyDetail[] | null;
}

export interface AgencyRankingEntry {
  agence_id: number;
  name: string;
  volume: number;
  frais: number;
  services: number;
  nb_envois: number;
  nb_services: number;
  nb_ops?: number;
  dep_total: number;
  revenu: number;
}

export interface WeeklyReportRPC {
  total_envois: number;
  total_frais: number;
  total_services: number;
  total_depenses: number;
  nb_envois: number;
  nb_services: number;
  revenu_net: number;
  taux_service: number;
  agencies_ranking: AgencyRankingEntry[] | null;
}

export interface MonthlyReportRPC {
  date_from: string;
  date_to: string;
  total_envois: number;
  total_frais: number;
  total_services: number;
  total_depenses: number;
  nb_envois: number;
  nb_services: number;
  nb_total: number;
  revenu_net: number;
  taux_service: number;
  marge_nette: number;
  moy_transaction: number;
  agencies_ranking: AgencyRankingEntry[] | null;
}

// Matching public.system_settings
export interface SystemSettings {
  id: number;
  network_name?: string;
  support_phone?: string;
  maintenance_mode: boolean;
  commission_percent: number;
  frais_fixe_min: number;
  // NOTE: limite_quotidienne_agent supprimée — la limite est désormais par agence (table agence)
  montant_max_envoi: number;
  montant_max_versement: number;
  created_at?: string;
  updated_at?: string;
}

// Résultat de la RPC check_agency_daily_limit
export interface AgencyLimitStatus {
  allowed: boolean;
  limite: number | null;
  total_today: number;
  remaining: number | null;
}
