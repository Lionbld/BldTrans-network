import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Transfert, Agence, Agent, Client } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import ClientModal from './modals/ClientModal';
import EditTransactionModal from './modals/EditTransactionModal';
import { exportReceiptPdf } from '../utils/reportPdf';
import {
    Search,
    X,
    Printer,
    CheckCircle2,
    Loader2,
    Edit3,
    DollarSign,
    UserCheck,
    ArrowRight,
    User,
    MapPin,
    RefreshCcw,
    Key,
    Filter,
    Clock,
    ChevronLeft,
    ChevronRight,
    CreditCard
} from 'lucide-react';

const PAGE_SIZE = 15;

const Transactions = () => {
    const { showToast } = useToast();
    const [transactions, setTransactions] = useState<Transfert[]>([]);
    const [agencies, setAgencies] = useState<Agence[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedTx, setSelectedTx] = useState<Transfert | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuperadmin, setIsSuperadmin] = useState(false);
    const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmServeId, setConfirmServeId] = useState<number | null>(null);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'served'>('all');
    const [agencyFilter, setAgencyFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const currentUserId = authData.user?.id;

            const [agsRes, agntsRes, clntsRes] = await Promise.all([
                supabase.from('agence').select('*'),
                supabase.from('agents').select('*'),
                supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(200)
            ]);

            const loadedAgents = agntsRes.data || [];
            setAgencies(agsRes.data || []);
            setAgents(loadedAgents);
            setClients(clntsRes.data || []);

            if (currentUserId) {
                const currentAgent = loadedAgents.find((a: Agent) => a.user_id === currentUserId);
                if (currentAgent) {
                    setCurrentAgentId(currentAgent.id);
                    if (currentAgent.superadmin) {
                        setIsSuperadmin(true);
                    }
                }
            }

            await fetchTransactions();
        } catch (err: any) {
            console.error("Erreur d'initialisation:", err);
            showToast('error', 'Erreur critique', err.message || 'Impossible de charger les données initiales.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transferts')
                .select(`
                    *,
                    expediteur:clients!expediteur_id(fullname),
                    destinataire:clients!destinataire_id(fullname),
                    agent_envoi:agents!user_envoi(user_agent, agence:agence(nom)),
                    agent_servi:agents!user_servi(user_agent)
                `)
                .order('date_transfert', { ascending: false });

            if (error) throw error;

            if (data) {
                const formatted = data.map(t => ({
                    ...t,
                    expediteur_name: t.expediteur?.fullname || 'Inconnu',
                    destinataire_name: t.destinataire?.fullname || 'Inconnu',
                    agence_name: t.agent_envoi?.agence?.nom || 'Agence Inconnue',
                    agent_envoi_name: t.agent_envoi?.user_agent || `Agent #${t.user_envoi}`,
                    agent_servi_name: t.agent_servi?.user_agent || (t.user_servi ? `Agent #${t.user_servi}` : 'Non servi')
                }));

                setTransactions(formatted);

                if (selectedTx) {
                    const updated = formatted.find(x => x.id === selectedTx.id);
                    if (updated) setSelectedTx(updated);
                }
            }
        } catch (e: any) {
            console.error("Erreur fetchTransactions:", e);
            showToast('error', 'Erreur réseau', e.message || 'Erreur lors du chargement des transferts.');
        }
    };

    const handleUpdateTransaction = async (formData: any) => {
        if (!selectedTx) return;

        const expId = parseInt(formData.expediteur_id);
        const destId = parseInt(formData.destinataire_id);
        const montant = parseFloat(formData.montant);
        const frais = parseFloat(formData.frais);

        if (expId === destId) {
            showToast('error', 'Sélection invalide', 'L\'expéditeur et le bénéficiaire doivent être des personnes différentes.');
            return;
        }

        if (isNaN(montant) || montant <= 0) {
            showToast('error', 'Montant invalide', 'Le montant doit être supérieur à 0.');
            return;
        }

        if (isNaN(frais) || frais < 0) {
            showToast('error', 'Frais invalides', 'Les frais ne peuvent pas être négatifs.');
            return;
        }

        setIsProcessing(true);
        const updateData: any = {
            expediteur_id: expId,
            destinataire_id: destId,
            montant: montant,
            frais: frais,
            etat_trans: formData.etat_trans,
            was_modified: true
        };

        if (formData.m_passe !== undefined) updateData.m_passe = formData.m_passe;

        // Auto-gestion du changement de statut (Servi vs En attente)
        const isChangingToServed = selectedTx.etat_trans && !formData.etat_trans;
        const isChangingToPending = !selectedTx.etat_trans && formData.etat_trans;

        if (isChangingToServed) {
            updateData.date_servi = formData.date_servi || new Date().toISOString();
            if (formData.user_servi) {
                updateData.user_servi = parseInt(formData.user_servi);
            } else if (currentAgentId) {
                updateData.user_servi = currentAgentId;
            }
        } else if (isChangingToPending) {
            updateData.date_servi = null;
            updateData.user_servi = null;
        }

        if (isSuperadmin) {
            if (formData.code) updateData.code = formData.code;
            if (formData.user_envoi) updateData.user_envoi = parseInt(formData.user_envoi);
        }

        const { error } = await supabase
            .from('transferts')
            .update(updateData)
            .eq('id', selectedTx.id);

        if (error) {
            showToast('error', 'Erreur de mise à jour', error.message);
        } else {
            showToast('success', 'Flux mis à jour', `La transaction ${selectedTx.code} a été modifiée.`);
            setIsEditModalOpen(false);
            await fetchInitialData();
        }
        setIsProcessing(false);
    };

    const handleCreateClient = async (clientData: any) => {
        setIsProcessing(true);
        const newIds = clientData.ids ? parseInt(clientData.ids) : Math.floor(10000000 + Math.random() * 90000000);

        const { error } = await supabase.from('clients').insert([{
            fullname: clientData.fullname,
            phone: clientData.phone,
            sexe: clientData.sexe,
            ids: newIds
        }]);

        if (error) {
            showToast('error', 'Erreur client', error.message);
        } else {
            showToast('success', 'Client créé', `${clientData.fullname} a été ajouté à la base.`);
            setIsClientModalOpen(false);
            await fetchInitialData();
        }
        setIsProcessing(false);
    };

    const handleServe = async (id: number) => {
        setIsProcessing(true);
        const { error } = await supabase
            .from('transferts')
            .update({
                etat_trans: false,
                date_servi: new Date().toISOString(),
                user_servi: 1
            })
            .eq('id', id);

        if (error) {
            showToast('error', 'Erreur versement', error.message);
        } else {
            showToast('success', 'Versement effectué', 'La transaction est désormais marquée comme terminée.');
            await fetchTransactions();
        }
        setIsProcessing(false);
        setConfirmServeId(null);
    };

    const handleDelete = async (id: number) => {
        setIsProcessing(true);
        const { error } = await supabase.from('transferts').delete().eq('id', id);
        if (error) {
            showToast('error', 'Erreur suppression', error.message);
        } else {
            showToast('warning', 'Flux supprimé', 'L\'enregistrement a été retiré de la base de données.');
            setSelectedTx(null);
            await fetchTransactions();
        }
        setIsProcessing(false);
        setConfirmDeleteId(null);
    };

    const handlePrint = (tx: Transfert) => {
        exportReceiptPdf({
            code: tx.code,
            montant: tx.montant,
            frais: tx.frais,
            expediteurName: tx.expediteur_name || 'Inconnu',
            destinataireName: tx.destinataire_name || 'Inconnu',
            agenceName: tx.agence_name || 'Inconnu',
            agentName: tx.etat_trans ? (tx.agent_envoi_name || 'Inconnu') : (tx.agent_servi_name || 'Inconnu'),
            mPasse: tx.m_passe || null,
            dateOp: (tx.etat_trans ? tx.date_transfert : (tx.date_servi || tx.date_transfert)) || '',
            isServed: !tx.etat_trans
        });
    };

    const filteredTx = transactions.filter(t => {
        const searchLower = search.toLowerCase();
        const matchesSearch = (
            (t.code && t.code.toLowerCase().includes(searchLower)) ||
            (t.expediteur_name && t.expediteur_name.toLowerCase().includes(searchLower)) ||
            (t.destinataire_name && t.destinataire_name.toLowerCase().includes(searchLower)) ||
            String(t.expediteur_id).includes(searchLower) ||
            String(t.destinataire_id).includes(searchLower)
        );

        const matchesStatus =
            statusFilter === 'all' ? true :
            statusFilter === 'pending' ? t.etat_trans :
            !t.etat_trans;

        const matchesAgency =
            agencyFilter === 'all' ? true :
            t.agence_name === agencyFilter;

        return matchesSearch && matchesStatus && matchesAgency;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredTx.length / PAGE_SIZE) || 1;
    const paginatedTx = filteredTx.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)] gap-6 animate-fade-in pb-4">
            
            {/* Table & Filters Section */}
            <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden min-w-0">

                {/* Toolbar Filters */}
                <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher par Code, Expéditeur, Bénéficiaire, ID..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                                onClick={() => fetchInitialData()}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                                title="Actualiser"
                            >
                                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Pills & Agency Select */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            <button
                                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'all'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Tous ({transactions.length})
                            </button>
                            <button
                                onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'pending'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                En attente ({transactions.filter(t => t.etat_trans).length})
                            </button>
                            <button
                                onClick={() => { setStatusFilter('served'); setCurrentPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === 'served'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Servis ({transactions.filter(t => !t.etat_trans).length})
                            </button>
                        </div>

                        {/* Agency Selector */}
                        <select
                            value={agencyFilter}
                            onChange={(e) => { setAgencyFilter(e.target.value); setCurrentPage(1); }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Toutes les agences</option>
                            {agencies.map(a => (
                                <option key={a.id} value={a.nom || ''}>{a.nom}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={40} />
                            <p className="text-xs font-bold uppercase tracking-widest">Chargement des transactions...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                    <th className="px-6 py-3.5">Référence / Date</th>
                                    <th className="px-6 py-3.5">Expéditeur</th>
                                    <th className="px-6 py-3.5">Bénéficiaire</th>
                                    <th className="px-6 py-3.5">Agence / Agent</th>
                                    <th className="px-6 py-3.5 text-right">Montant ($)</th>
                                    <th className="px-6 py-3.5 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {paginatedTx.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        onClick={() => setSelectedTx(tx)}
                                        className={`group cursor-pointer transition-colors ${
                                            selectedTx?.id === tx.id
                                                ? 'bg-indigo-500/10 dark:bg-indigo-500/15'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">{tx.code}</span>
                                                {tx.was_modified && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20" title="Cette transaction a été modifiée">
                                                        Modifié
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-slate-400 block mt-0.5">{tx.date_transfert ? new Date(tx.date_transfert).toLocaleDateString() : '-'}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="font-semibold text-slate-900 dark:text-white text-xs">{tx.expediteur_name}</div>
                                            <span className="text-[10px] text-slate-400">ID: {tx.expediteur_id}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="font-semibold text-slate-900 dark:text-white text-xs">{tx.destinataire_name}</div>
                                            <span className="text-[10px] text-slate-400">ID: {tx.destinataire_id}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{tx.agence_name}</span>
                                            <span className="text-[10px] text-slate-400">{tx.agent_envoi_name}</span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">${tx.montant.toLocaleString()}</span>
                                            <span className="text-[10px] text-slate-400 block">+${tx.frais} frais</span>
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                                !tx.etat_trans
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {!tx.etat_trans ? 'Terminé' : 'En attente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {paginatedTx.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                                            Aucune transaction trouvée.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Affichage {paginatedTx.length} sur {filteredTx.length} résultats
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-semibold">
                            Page {currentPage} sur {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Slide-over Panel */}
            <div className={`
                fixed inset-y-0 right-0 z-50 w-full md:w-[460px] bg-white dark:bg-[#0f0f23] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform
                lg:relative lg:translate-x-0 lg:shadow-none lg:rounded-3xl lg:border
                ${selectedTx ? 'translate-x-0' : 'translate-x-full lg:hidden'}
            `}>
                {selectedTx && (
                    <>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">Fiche Transaction</h3>
                                <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">Code: {selectedTx.code}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            
                            {/* Financial Highlight Card */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-[#060612] text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block mb-2 text-center">Montant du Transfert</span>
                                <h2 className="text-4xl font-extrabold text-center font-mono tracking-tight mb-6">${selectedTx.montant.toLocaleString()}</h2>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
                                    <div>
                                        <span className="text-slate-400 block">Frais de réseau</span>
                                        <span className="font-mono font-bold text-white">${selectedTx.frais}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-400 block">Total prélevé</span>
                                        <span className="font-mono font-bold text-emerald-400">${selectedTx.montant + selectedTx.frais}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Security PIN Code if present */}
                            {selectedTx.m_passe && (
                                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        <Key size={16} />
                                        <span>Code secret de retrait</span>
                                    </div>
                                    <span className="font-mono font-extrabold text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl text-sm border border-amber-500/20">
                                        {selectedTx.m_passe}
                                    </span>
                                </div>
                            )}

                            {/* Expediteur & Destinataire */}
                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Expéditeur</span>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTx.expediteur_name}</p>
                                    <p className="text-xs text-slate-500">ID Client: #{selectedTx.expediteur_id}</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Bénéficiaire</span>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTx.destinataire_name}</p>
                                    <p className="text-xs text-slate-500">ID Client: #{selectedTx.destinataire_id}</p>
                                </div>
                            </div>

                            {/* Logistics & Agents */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Agence d'émission</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{selectedTx.agence_name} ({selectedTx.agent_envoi_name})</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                                    <span className="text-slate-400 block">Statut du retrait</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{selectedTx.agent_servi_name}</span>
                                    {selectedTx.date_servi && (
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Payé le {new Date(selectedTx.date_servi).toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Slide-over Actions */}
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                            {selectedTx.etat_trans && (
                                <button
                                    onClick={() => setConfirmServeId(selectedTx.id)}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                                >
                                    <CheckCircle2 size={18} />
                                    <span>Valider le retrait (Servir)</span>
                                </button>
                            )}

                            <div className="flex gap-3">
                                {isSuperadmin && (
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Edit3 size={16} /> Éditer
                                    </button>
                                )}
                                <button
                                    onClick={() => handlePrint(selectedTx)}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Printer size={16} /> Imprimer reçu
                                </button>
                            </div>

                            {isSuperadmin && (
                                <button
                                    onClick={() => setConfirmDeleteId(selectedTx.id)}
                                    className="w-full text-red-500 hover:text-red-600 text-xs font-semibold py-2 transition-colors"
                                >
                                    Supprimer cette transaction
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSubmit={handleCreateClient}
                isProcessing={isProcessing}
            />

            <EditTransactionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                selectedTx={selectedTx}
                clients={clients}
                agents={agents}
                isSuperadmin={isSuperadmin}
                onSubmit={handleUpdateTransaction}
                isProcessing={isProcessing}
                onOpenClientModal={() => setIsClientModalOpen(true)}
            />

            <ConfirmModal
                isOpen={!!confirmDeleteId}
                title="Supprimer ce flux ?"
                message="Cette action est irréversible. Toutes les données liées à cette transaction seront définitivement effacées."
                confirmLabel="Supprimer"
                type="danger"
                isLoading={isProcessing}
                onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                onCancel={() => setConfirmDeleteId(null)}
            />

            <ConfirmModal
                isOpen={!!confirmServeId}
                title="Confirmer le versement ?"
                message="Êtes-vous sûr de vouloir marquer cette transaction comme payée ?"
                confirmLabel="Confirmer le Paiement"
                isLoading={isProcessing}
                onConfirm={() => confirmServeId && handleServe(confirmServeId)}
                onCancel={() => setConfirmServeId(null)}
            />
        </div>
    );
};

export default Transactions;