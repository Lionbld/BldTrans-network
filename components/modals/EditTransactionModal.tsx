import React, { useState, useEffect } from 'react';
import { X, Loader2, ShieldCheck, Key, ArrowRightLeft, Lock } from 'lucide-react';
import { Transfert, Client, Agent } from '../../types';
import ClientSearchSelect from '../ClientSearchSelect';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTx: Transfert | null;
    clients: Client[];
    agents: Agent[];
    isSuperadmin: boolean;
    onSubmit: (formData: any) => Promise<void>;
    isProcessing: boolean;
    onOpenClientModal: () => void;
}

const EditTransactionModal = ({
    isOpen,
    onClose,
    selectedTx,
    clients,
    agents,
    isSuperadmin,
    onSubmit,
    isProcessing,
    onOpenClientModal
}: EditTransactionModalProps) => {
    const [editFormData, setEditFormData] = useState({
        expediteur_id: '',
        destinataire_id: '',
        montant: '',
        frais: '',
        etat_trans: false,
        code: '',
        m_passe: '',
        date_transfert: '',
        date_servi: '',
        user_envoi: '',
        user_servi: ''
    });

    useEffect(() => {
        if (selectedTx) {
            const formatForInput = (isoString?: string | null) => {
                if (!isoString) return '';
                try {
                    return new Date(isoString).toISOString().slice(0, 16);
                } catch {
                    return '';
                }
            };

            setEditFormData({
                expediteur_id: String(selectedTx.expediteur_id || ''),
                destinataire_id: String(selectedTx.destinataire_id || ''),
                montant: String(selectedTx.montant ?? ''),
                frais: String(selectedTx.frais ?? ''),
                etat_trans: selectedTx.etat_trans,
                code: selectedTx.code || '',
                m_passe: selectedTx.m_passe || '',
                date_transfert: formatForInput(selectedTx.date_transfert),
                date_servi: formatForInput(selectedTx.date_servi),
                user_envoi: String(selectedTx.user_envoi || ''),
                user_servi: String(selectedTx.user_servi || '')
            });
        }
    }, [selectedTx]);

    if (!isOpen || !selectedTx) return null;

    const handleSwapClients = () => {
        setEditFormData(prev => ({
            ...prev,
            expediteur_id: prev.destinataire_id,
            destinataire_id: prev.expediteur_id
        }));
    };

    const isServedOriginally = selectedTx && !selectedTx.etat_trans;
    const isAmountLocked = isServedOriginally && !isSuperadmin;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(editFormData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fade-in" 
                onClick={() => !isProcessing && onClose()}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up z-10">
                {/* Fixed Header */}
                <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black dark:text-white uppercase tracking-tight">Édition Opération</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Réf: {selectedTx.code}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isProcessing}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {/* Expéditeur & Bénéficiaire avec Bouton Permuter */}
                    <div className="relative space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 items-start">
                        <div>
                            <ClientSearchSelect
                                clients={clients}
                                value={editFormData.expediteur_id}
                                defaultName={selectedTx.expediteur_name || (selectedTx as any).expediteur?.fullname}
                                onChange={(val) => setEditFormData({ ...editFormData, expediteur_id: val })}
                                label="Expéditeur"
                                placeholder="Rechercher par Nom ou Téléphone..."
                                onNewClient={onOpenClientModal}
                                labelColor="text-primary-600"
                                excludeId={editFormData.destinataire_id}
                            />
                        </div>

                        {/* Bouton Permuter / Swap */}
                        <div className="flex md:hidden justify-center my-1">
                            <button
                                type="button"
                                onClick={handleSwapClients}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-primary-600 rounded-full font-black text-xs uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-2 active:scale-95 transition-all shadow-sm"
                            >
                                <ArrowRightLeft size={14} /> Permuter Expéditeur & Bénéficiaire
                            </button>
                        </div>

                        <div>
                            <ClientSearchSelect
                                clients={clients}
                                value={editFormData.destinataire_id}
                                defaultName={selectedTx.destinataire_name || (selectedTx as any).destinataire?.fullname}
                                onChange={(val) => setEditFormData({ ...editFormData, destinataire_id: val })}
                                label="Bénéficiaire"
                                placeholder="Rechercher par Nom ou Téléphone..."
                                onNewClient={onOpenClientModal}
                                labelColor="text-emerald-600"
                                excludeId={editFormData.expediteur_id}
                            />
                        </div>

                        {/* Bouton Permuter Desktop Floating */}
                        <button
                            type="button"
                            onClick={handleSwapClients}
                            title="Inverser Expéditeur et Bénéficiaire"
                            className="hidden md:flex absolute left-1/2 top-9 -translate-x-1/2 z-20 w-9 h-9 bg-white dark:bg-slate-800 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 text-slate-500 rounded-full items-center justify-center border-2 border-slate-200 dark:border-slate-700 shadow-md active:scale-90 transition-all"
                        >
                            <ArrowRightLeft size={14} />
                        </button>
                    </div>

                    {/* Montant & Frais avec verrouillage si transaction déjà servie */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1">
                                    Montant ($) {isAmountLocked && <Lock size={12} className="text-amber-500" />}
                                </label>
                                <input
                                    type="number" 
                                    step="0.01" 
                                    required
                                    disabled={isAmountLocked}
                                    value={editFormData.montant}
                                    onChange={e => setEditFormData({ ...editFormData, montant: e.target.value })}
                                    className={`w-full px-5 py-3.5 rounded-2xl border-2 bg-white dark:bg-slate-800 text-sm font-black dark:text-white outline-none transition-all shadow-inner ${isAmountLocked ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/30 text-slate-500 cursor-not-allowed' : 'border-slate-100 dark:border-slate-700 focus:border-primary-500'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1">
                                    Frais ($) {isAmountLocked && <Lock size={12} className="text-amber-500" />}
                                </label>
                                <input
                                    type="number" 
                                    step="0.01" 
                                    required
                                    disabled={isAmountLocked}
                                    value={editFormData.frais}
                                    onChange={e => setEditFormData({ ...editFormData, frais: e.target.value })}
                                    className={`w-full px-5 py-3.5 rounded-2xl border-2 bg-white dark:bg-slate-800 text-sm font-black dark:text-white outline-none transition-all shadow-inner ${isAmountLocked ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/30 text-slate-500 cursor-not-allowed' : 'border-slate-100 dark:border-slate-700 focus:border-primary-500'}`}
                                />
                            </div>
                        </div>
                        {isAmountLocked && (
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-1.5">
                                <Lock size={12} className="shrink-0" />
                                <span>Transaction déjà payée : Seul un Superadmin peut modifier le montant et les frais pour garantir l'intégrité comptable.</span>
                            </p>
                        )}
                    </div>

                    {/* Statut Transaction */}
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                        <input
                            type="checkbox" 
                            id="edit-served-modal-component"
                            checked={editFormData.etat_trans}
                            onChange={e => setEditFormData({ ...editFormData, etat_trans: e.target.checked })}
                            className="w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-500 border-2 border-slate-300 transition-all cursor-pointer"
                        />
                        <label htmlFor="edit-served-modal-component" className="text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer uppercase tracking-wider">
                            Transaction en attente (décocher si déjà payée/servie)
                        </label>
                    </div>

                    {/* Section Superadmin */}
                    {isSuperadmin && (
                        <div className="p-6 bg-slate-50/80 dark:bg-slate-800/50 rounded-3xl border-2 border-primary-500/20 dark:border-primary-500/10 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck size={18} className="text-primary-600" />
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest">Mode Superadmin (Champs Avancés)</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Code Référence</label>
                                    <input
                                        type="text"
                                        value={editFormData.code}
                                        onChange={e => setEditFormData({ ...editFormData, code: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Mot de Passe / PIN Secret</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={editFormData.m_passe}
                                            onChange={e => setEditFormData({ ...editFormData, m_passe: e.target.value })}
                                            placeholder="Ex: 1234"
                                            className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none focus:border-primary-500"
                                        />
                                        <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Agent Envoi</label>
                                <select
                                    value={editFormData.user_envoi}
                                    onChange={e => setEditFormData({ ...editFormData, user_envoi: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none focus:border-primary-500"
                                >
                                    <option value="">Sélectionner un agent</option>
                                    {agents.map(a => (
                                        <option key={a.id} value={a.id}>{a.user_agent || `Agent #${a.id}`}</option>
                                    ))}
                                </select>
                            </div>

                            {!editFormData.etat_trans && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Date de paiement</label>
                                        <input
                                            type="datetime-local"
                                            value={editFormData.date_servi}
                                            onChange={e => setEditFormData({ ...editFormData, date_servi: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Agent Paiement</label>
                                        <select
                                            value={editFormData.user_servi}
                                            onChange={e => setEditFormData({ ...editFormData, user_servi: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white outline-none focus:border-primary-500"
                                        >
                                            <option value="">Sélectionner un agent</option>
                                            {agents.map(a => (
                                                <option key={a.id} value={a.id}>{a.user_agent || `Agent #${a.id}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 pb-2 flex gap-4 shrink-0">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isProcessing}
                            className="flex-1 py-4 px-6 rounded-2xl font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase text-[11px] tracking-widest"
                        >
                            Abandonner
                        </button>
                        <button 
                            type="submit" 
                            disabled={isProcessing} 
                            className="flex-[2] bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                            Sauvegarder Flux
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;
