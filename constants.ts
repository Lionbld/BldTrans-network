import { Agence, Agent, Client, Transfert, Ville, Depense, MouvementPlus, MouvementMinus, DailyReport, Report } from './types';

// Mock Cities
export const MOCK_CITIES: Ville[] = [
  { id: 1, name: 'Luanda', pays: 1 },
  { id: 2, name: 'Benguela', pays: 1 },
  { id: 3, name: 'Lisbon', pays: 2 },
  { id: 4, name: 'Paris', pays: 3 },
];

// Mock Agencies
export const MOCK_AGENCIES: Agence[] = [
  { id: 101, created_at: '2023-01-01', nom: 'Luanda Central', adresse: 'Av. Deauville', ville_agence: 1, phone: '+244 923 000 000', verrou: false, balance: 124500.00, ville_name: 'Luanda', limite_quotidienne: null },
  { id: 102, created_at: '2023-02-15', nom: 'Viana Hub', adresse: 'Estrada de Catete', ville_agence: 1, phone: '+244 923 111 111', verrou: false, balance: 45200.50, ville_name: 'Luanda', limite_quotidienne: null },
  { id: 103, created_at: '2023-03-10', nom: 'Lobito Express', adresse: 'Zona Portuária', ville_agence: 2, phone: '+244 923 222 222', verrou: true, balance: 0.00, ville_name: 'Benguela', limite_quotidienne: null },
  { id: 104, created_at: '2023-05-20', nom: 'Paris Nord', adresse: 'Rue de Dunkerque', ville_agence: 4, phone: '+33 1 00 00 00 00', verrou: false, balance: 12050.00, ville_name: 'Paris', limite_quotidienne: null },
];

// Mock Clients
export const MOCK_CLIENTS: Client[] = [
  { id: 1, fullname: 'Jean Pierre', phone: '+244 911 222 333', created_at: '2023-01-01', sexe: 'M', ids: 1001 },
  { id: 2, fullname: 'Marie Curie', phone: '+33 6 12 34 56 78', created_at: '2023-01-02', sexe: 'F', ids: 1002 },
  { id: 3, fullname: 'Ahmed Bakayoko', phone: '+244 922 333 444', created_at: '2023-01-05', sexe: 'M', ids: 1003 },
  { id: 4, fullname: 'Sofia Costa', phone: '+351 91 234 5678', created_at: '2023-01-10', sexe: 'F', ids: 1004 },
];

// Mock Agents
export const MOCK_AGENTS: Agent[] = [
  { id: 1, user_id: 'uuid-1', agence_agens: 101, phone: '999999999', email: 'admin@bld.com', created_at: '2023-01-01', envoi: true, admin: true, user_agent: 'Miguel Musico', superadmin: true },
  { id: 2, user_id: 'uuid-2', agence_agens: 102, phone: '888888888', email: 'sarah@bld.com', created_at: '2023-02-01', envoi: true, admin: false, user_agent: 'Sarah Mendes', superadmin: false },
];

// Mock Transactions
export const MOCK_TRANSFERS: Transfert[] = [
  {
    id: 1,
    code: 'TRX-82910',
    etat_trans: true, // Served/Completed
    expediteur_id: 1001,
    destinataire_id: 1002,
    montant: 1200.00,
    frais: 60.00,
    date_transfert: '2023-10-24T10:30:00Z',
    date_servi: '2023-10-24T14:30:00Z',
    m_passe: '******',
    user_envoi: 1,
    user_servi: 2,
    was_modified: false,
    expediteur_name: 'Jean Pierre',
    destinataire_name: 'Marie Curie',
    agence_name: 'Luanda Central'
  },
  {
    id: 2,
    code: 'TRX-82911',
    etat_trans: false, // Pending
    expediteur_id: 1003,
    destinataire_id: 1004,
    montant: 450.00,
    frais: 25.00,
    date_transfert: '2023-10-25T09:15:00Z',
    date_servi: null,
    m_passe: '******',
    user_envoi: 2,
    user_servi: null,
    was_modified: false,
    expediteur_name: 'Ahmed Bakayoko',
    destinataire_name: 'Sofia Costa',
    agence_name: 'Viana Hub'
  },
  {
    id: 3,
    code: 'TRX-82912',
    etat_trans: false, // Pending
    expediteur_id: 1002,
    destinataire_id: 1001,
    montant: 3150.00,
    frais: 150.00,
    date_transfert: '2023-10-25T11:45:00Z',
    date_servi: null,
    m_passe: '******',
    user_envoi: 1,
    user_servi: null,
    was_modified: false,
    expediteur_name: 'Marie Curie',
    destinataire_name: 'Jean Pierre',
    agence_name: 'Luanda Central'
  },
  {
    id: 4,
    code: 'TRX-82913',
    etat_trans: true,
    expediteur_id: 1004,
    destinataire_id: 1003,
    montant: 800.00,
    frais: 40.00,
    date_transfert: '2023-10-23T16:20:00Z',
    date_servi: '2023-10-24T09:00:00Z',
    m_passe: '******',
    user_envoi: 2,
    user_servi: 1,
    was_modified: false,
    expediteur_name: 'Sofia Costa',
    destinataire_name: 'Ahmed Bakayoko',
    agence_name: 'Viana Hub'
  }
];

// Mock Dépenses
export const MOCK_DEPENSES: Depense[] = [
  { id: 1, created_at: '2023-10-24T08:00:00Z', montant: 150.00, motif: 'Fournitures bureau', agence_depense: 101, agence_name: 'Luanda Central' },
  { id: 2, created_at: '2023-10-24T10:30:00Z', montant: 300.00, motif: 'Électricité mensuelle', agence_depense: 102, agence_name: 'Viana Hub' },
  { id: 3, created_at: '2023-10-25T09:15:00Z', montant: 75.00, motif: 'Transport agent', agence_depense: 101, agence_name: 'Luanda Central' },
  { id: 4, created_at: '2023-10-25T14:00:00Z', montant: 500.00, motif: 'Réparation imprimante', agence_depense: 104, agence_name: 'Paris Nord' },
];

// Mock Mouvements Entrants
export const MOCK_MOUVEMENTS_PLUS: MouvementPlus[] = [
  { id: 1, montant: 50000.00, date_mouvement: '2023-10-24T07:00:00Z', agence_mouvplus: 101, motif: 'Approvisionnement caisse', agence_name: 'Luanda Central' },
  { id: 2, montant: 20000.00, date_mouvement: '2023-10-24T07:30:00Z', agence_mouvplus: 102, motif: 'Approvisionnement caisse', agence_name: 'Viana Hub' },
  { id: 3, montant: 10000.00, date_mouvement: '2023-10-25T08:00:00Z', agence_mouvplus: 104, motif: 'Virement siège', agence_name: 'Paris Nord' },
];

// Mock Mouvements Sortants
export const MOCK_MOUVEMENTS_MINUS: MouvementMinus[] = [
  { id: 1, montant: 5000.00, date_mouvement: '2023-10-24T12:00:00Z', agence_mouvmoins: 101, motif: 'Retrait caisse', agence_name: 'Luanda Central' },
  { id: 2, montant: 3000.00, date_mouvement: '2023-10-24T15:00:00Z', agence_mouvmoins: 102, motif: 'Transfert inter-agence', agence_name: 'Viana Hub' },
  { id: 3, montant: 1500.00, date_mouvement: '2023-10-25T11:00:00Z', agence_mouvmoins: 101, motif: 'Retrait opérationnel', agence_name: 'Luanda Central' },
];

// Mock Rapports Journaliers
export const MOCK_DAILY_REPORTS: DailyReport[] = [
  { id: 1, agence_id: 101, date_report: '2023-10-24', opening_balance: 100000, closing_balance: 124500, total_transfers: 15, total_amount: 25000, total_fees: 1200, agent_id: 1, agence_name: 'Luanda Central' },
  { id: 2, agence_id: 102, date_report: '2023-10-24', opening_balance: 30000, closing_balance: 45200.50, total_transfers: 8, total_amount: 12000, total_fees: 650, agent_id: 2, agence_name: 'Viana Hub' },
  { id: 3, agence_id: 101, date_report: '2023-10-25', opening_balance: 124500, closing_balance: 118000, total_transfers: 12, total_amount: 18500, total_fees: 950, agent_id: 1, agence_name: 'Luanda Central' },
  { id: 4, agence_id: 104, date_report: '2023-10-25', opening_balance: 8000, closing_balance: 12050, total_transfers: 5, total_amount: 8000, total_fees: 400, agent_id: null, agence_name: 'Paris Nord' },
];

// Mock Rapports d'Activité
export const MOCK_REPORTS: Report[] = [
  { id: 1, description: 'Journée chargée, 15 transferts traités sans incident.', date_creation: '2023-10-24T17:00:00Z', agence_report: 101, montant: 25000, agence_name: 'Luanda Central' },
  { id: 2, description: 'Problème réseau entre 14h-15h, 2 transferts en attente.', date_creation: '2023-10-24T17:30:00Z', agence_report: 102, montant: 12000, agence_name: 'Viana Hub' },
  { id: 3, description: 'RAS. Activité normale.', date_creation: '2023-10-25T17:00:00Z', agence_report: 101, montant: 18500, agence_name: 'Luanda Central' },
  { id: 4, description: 'Nouveau client important - transfert de 5000€.', date_creation: '2023-10-25T16:45:00Z', agence_report: 104, montant: 8000, agence_name: 'Paris Nord' },
];
