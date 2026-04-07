import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Transfert, Agence, Agent, Client } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import ClientModal from './modals/ClientModal';
import EditTransactionModal from './modals/EditTransactionModal';
import {
    Search,
    X,
    Printer,
    CheckCircle,
    CheckCircle2,
    Loader2,
    Edit3,
    DollarSign,
    UserCheck,
    ArrowRight,
    ShieldCheck,
    UserPlus,
    User,
    MapPin,
    RefreshCcw
} from 'lucide-react';

const Transactions = () => {
    const { showToast } = useToast();
    const [transactions, setTransactions] = useState<Transfert[]>([]);
    const [agencies, setAgencies] = useState<Agence[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedTx, setSelectedTx] = useState<Transfert | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmServeId, setConfirmServeId] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [agsRes, agntsRes, clntsRes] = await Promise.all([
                supabase.from('agence').select('*'),
                supabase.from('agents').select('*'),
                // Fix: Limit clients fetched instead of fetching the entire database
                supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(200)
            ]);

            setAgencies(agsRes.data || []);
            setAgents(agntsRes.data || []);
            setClients(clntsRes.data || []);

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

        setIsProcessing(true);
        const { error } = await supabase
            .from('transferts')
            .update({
                expediteur_id: parseInt(formData.expediteur_id),
                destinataire_id: parseInt(formData.destinataire_id),
                montant: parseFloat(formData.montant),
                frais: parseFloat(formData.frais),
                etat_trans: formData.etat_trans,
                was_modified: true
            })
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
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `
      <html>
        <head>
          <title>Reçu BLD - ${tx.code}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .receipt { border: 2px solid #2563eb; padding: 30px; max-width: 450px; margin: 0 auto; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px; }
            .amount { font-size: 42px; font-weight: 900; color: #1e293b; text-align: center; margin: 20px 0; border: 1px dashed #e2e8f0; padding: 10px; border-radius: 12px; }
            .data-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .label { font-weight: 700; color: #64748b; }
            .val { font-weight: 800; color: #1e293b; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1 style="margin:0; color:#2563eb; letter-spacing:-0.025em;">BLD TRANS NETWORK</h1>
              <p style="margin:5px 0; font-weight:bold; color:#64748b;">CODE RÉFÉRENCE: ${tx.code}</p>
            </div>
            <div class="amount">$${tx.montant.toLocaleString()}</div>
            <div class="data-row"><span class="label">EXPÉDITEUR:</span> <span class="val">${tx.expediteur_name}</span></div>
            <div class="data-row"><span class="label">BÉNÉFICIAIRE:</span> <span class="val">${tx.destinataire_name}</span></div>
            <div class="data-row"><span class="label">AGENCE:</span> <span class="val">${tx.agence_name}</span></div>
            <hr style="border:0; border-top:1px solid #f1f5f9; margin:20px 0;">
            <div class="data-row"><span class="label">FRAIS RÉSEAU:</span> <span class="val">$${tx.frais}</span></div>
            <div class="data-row"><span class="label">DATE OPÉRATION:</span> <span class="val">${new Date(tx.date_transfert!).toLocaleString()}</span></div>
            <div class="footer">Document généré automatiquement. Merci de votre confiance.</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const filteredTx = transactions.filter(t => {
        const searchLower = search.toLowerCase();
        return (
            (t.code && t.code.toLowerCase().includes(searchLower)) ||
            (t.expediteur_name && t.expediteur_name.toLowerCase().includes(searchLower)) ||
            (t.destinataire_name && t.destinataire_name.toLowerCase().includes(searchLower)) ||
            String(t.expediteur_id).includes(searchLower) ||
            String(t.destinataire_id).includes(searchLower)
        );
    });

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 animate-fade-in">
            {/* Table Section */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-500">
                {/* Advanced Toolbar */}
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un Nom, Code ou ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:border-primary-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={() => fetchInitialData()}
                            className="p-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-primary-600 transition-all shadow-sm active:rotate-180"
                            title="Actualiser les données"
                        >
                            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-4 text-primary-600" size={56} />
                            <p className="font-black uppercase tracking-widest text-[10px]">Chargement des flux...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="px-8 py-6">Réf / Date</th>
                                    <th className="px-8 py-6">Expéditeur (Nom)</th>
                                    <th className="px-8 py-6">Bénéficiaire (Nom)</th>
                                    <th className="px-8 py-6">Agence</th>
                                    <th className="px-8 py-6 text-right">Montant</th>
                                    <th className="px-8 py-6 text-center">État</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredTx.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        onClick={() => setSelectedTx(tx)}
                                        className={`group cursor-pointer transition-all duration-300 ${selectedTx?.id === tx.id ? 'bg-primary-50/70 dark:bg-primary-900/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="font-mono font-black text-primary-600 text-sm mb-1">{tx.code}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{tx.date_transfert ? new Date(tx.date_transfert).toLocaleDateString() : '-'}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-none mb-1.5 uppercase">
                                                        {tx.expediteur_name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase opacity-60">ID: {tx.expediteur_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                                                    <ArrowRight size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-none mb-1.5 uppercase">
                                                        {tx.destinataire_name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase opacity-60">ID: {tx.destinataire_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-slate-700 dark:text-slate-300 font-black text-xs mb-1 uppercase">{tx.agence_name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">Par: {tx.agent_envoi_name}</div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="font-black text-slate-900 dark:text-white text-xl tracking-tighter">${tx.montant.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-black">Frais: ${tx.frais}</div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${!tx.etat_trans ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {!tx.etat_trans ? 'Terminé' : 'Attente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Detail Slide-over Panel */}
            <div className={`
        fixed inset-y-0 right-0 z-40 w-full md:w-[460px] bg-white dark:bg-slate-900 border-l-2 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-500 ease-in-out transform
        lg:relative lg:translate-x-0 lg:shadow-none lg:rounded-[2.5rem] lg:border-2
        ${selectedTx ? 'translate-x-0' : 'translate-x-full lg:hidden'}
      `}>
                {selectedTx && (
                    <>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 lg:rounded-t-[2.5rem]">
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">Détails Opération</h3>
                                <p className="text-[10px] font-black text-primary-600 bg-primary-50 px-3 py-1 rounded-lg inline-block mt-2 uppercase tracking-widest shadow-sm">Réf: {selectedTx.code}</p>
                            </div>
                            <button onClick={() => setSelectedTx(null)} className="p-3.5 text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-200 shadow-sm">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 space-y-8">
                            {/* Financial Summary Card */}
                            <div className="p-10 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 text-center">Montant Disponible</p>
                                    <h2 className="text-6xl font-black text-center mb-8 tracking-tighter shadow-sm">${selectedTx.montant.toLocaleString()}</h2>
                                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                                        <div>
                                            <p className="text-[9px] uppercase text-slate-500 font-black mb-1">Commission Réseau</p>
                                            <p className="text-base font-black">$ {selectedTx.frais}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] uppercase text-slate-500 font-black mb-1">Total Déboursé</p>
                                            <p className="text-base font-black text-primary-400">$ {selectedTx.montant + selectedTx.frais}</p>
                                        </div>
                                    </div>
                                </div>
                                <DollarSign size={160} className="absolute -right-12 -bottom-12 opacity-5 text-white rotate-12" />
                            </div>

                            {/* Parties Details */}
                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary-200 transition-colors group">
                                    <div className="flex items-center gap-2 mb-4">
                                        <User size={14} className="text-primary-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expéditeur d'Origine</span>
                                    </div>
                                    <p className="text-lg font-black dark:text-white leading-tight mb-1">{selectedTx.expediteur_name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Identité unique: {selectedTx.expediteur_id}</p>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-200 transition-colors group">
                                    <div className="flex items-center gap-2 mb-4">
                                        <ArrowRight size={14} className="text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bénéficiaire Final</span>
                                    </div>
                                    <p className="text-lg font-black dark:text-white leading-tight mb-1">{selectedTx.destinataire_name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Identité unique: {selectedTx.destinataire_id}</p>
                                </div>
                            </div>

                            {/* Logistics */}
                            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700 shadow-sm grid grid-cols-1 gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center shrink-0">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Point de collecte</p>
                                        <p className="text-sm font-black dark:text-white">{selectedTx.agence_name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedTx.agent_envoi_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${!selectedTx.etat_trans ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <UserCheck size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Responsable versement</p>
                                        <p className="text-sm font-black dark:text-white">{selectedTx.agent_servi_name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-none mt-1">
                                            {selectedTx.date_servi ? `Effectué le ${new Date(selectedTx.date_servi).toLocaleDateString()}` : 'Versement en attente'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Actions */}
                        <div className="p-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-4 lg:rounded-b-[2.5rem] bg-slate-50/30 backdrop-blur-sm">
                            {selectedTx.etat_trans && (
                                <button
                                    onClick={() => setConfirmServeId(selectedTx.id)}
                                    disabled={isProcessing}
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary-500/40 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <CheckCircle2 size={22} />
                                    Effectuer le Versement Net
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-4.5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-primary-500 hover:text-primary-600 transition-all active:scale-95 shadow-sm"
                                >
                                    <Edit3 size={18} /> Éditer flux
                                </button>
                                <button
                                    onClick={() => handlePrint(selectedTx)}
                                    className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-4.5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-primary-500 hover:text-primary-600 transition-all active:scale-95 shadow-sm"
                                >
                                    <Printer size={18} /> Imprimer Reçu
                                </button>
                            </div>

                            <button
                                onClick={() => setConfirmDeleteId(selectedTx.id)}
                                className="w-full text-red-500 py-2.5 text-[10px] font-black uppercase hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all tracking-[0.3em] border border-transparent hover:border-red-200"
                            >
                                Supprimer définitivement
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modals extraits */}
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
                onSubmit={handleUpdateTransaction}
                isProcessing={isProcessing}
                onOpenClientModal={() => setIsClientModalOpen(true)}
            />

            {/* Modal: Confirmation de Suppression */}
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

            {/* Modal: Confirmation de Versement */}
            <ConfirmModal
                isOpen={!!confirmServeId}
                title="Confirmer le versement ?"
                message="Êtes-vous sûr de vouloir marquer cette transaction comme payée ? Le statut passera en 'Terminé'."
                confirmLabel="Confirmer le Paiement"
                isLoading={isProcessing}
                onConfirm={() => confirmServeId && handleServe(confirmServeId)}
                onCancel={() => setConfirmServeId(null)}
            />
        </div>
    );
};

export default Transactions;