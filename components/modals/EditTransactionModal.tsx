import React, { useState, useEffect } from 'react';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { Transfert, Client } from '../../types';
import ClientSearchSelect from '../ClientSearchSelect';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTx: Transfert | null;
    clients: Client[];
    onSubmit: (formData: any) => Promise<void>;
    isProcessing: boolean;
    onOpenClientModal: () => void;
}

const EditTransactionModal = ({
    isOpen,
    onClose,
    selectedTx,
    clients,
    onSubmit,
    isProcessing,
    onOpenClientModal
}: EditTransactionModalProps) => {
    const [editFormData, setEditFormData] = useState({
        expediteur_id: '',
        destinataire_id: '',
        montant: '',
        frais: '',
        etat_trans: false
    });

    useEffect(() => {
        if (selectedTx) {
            setEditFormData({
                expediteur_id: String(selectedTx.expediteur_id || ''),
                destinataire_id: String(selectedTx.destinataire_id || ''),
                montant: String(selectedTx.montant),
                frais: String(selectedTx.frais),
                etat_trans: selectedTx.etat_trans
            });
        }
    }, [selectedTx]);

    if (!isOpen || !selectedTx) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(editFormData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-fade-in" onClick={() => !isProcessing && onClose()}></div>
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Édition Opération</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2.5 bg-white rounded-full shadow-sm"><X size={28} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-50">
                        <div>
                            <ClientSearchSelect
                                clients={clients}
                                value={editFormData.expediteur_id}
                                onChange={(val) => setEditFormData({ ...editFormData, expediteur_id: val })}
                                label="Expéditeur"
                                placeholder="Rechercher un expéditeur..."
                                onNewClient={onOpenClientModal}
                                labelColor="text-primary-600"
                            />
                        </div>
                        <div>
                            <ClientSearchSelect
                                clients={clients}
                                value={editFormData.destinataire_id}
                                onChange={(val) => setEditFormData({ ...editFormData, destinataire_id: val })}
                                label="Bénéficiaire"
                                placeholder="Rechercher un bénéficiaire..."
                                onNewClient={onOpenClientModal}
                                labelColor="text-emerald-600"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 relative z-0">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Montant ($)</label>
                            <input
                                type="number" step="0.01" required
                                value={editFormData.montant}
                                onChange={e => setEditFormData({ ...editFormData, montant: e.target.value })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black outline-none shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Frais ($)</label>
                            <input
                                type="number" step="0.01" required
                                value={editFormData.frais}
                                onChange={e => setEditFormData({ ...editFormData, frais: e.target.value })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black outline-none shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm relative z-0">
                        <input
                            type="checkbox" id="edit-served-modal-component"
                            checked={editFormData.etat_trans}
                            onChange={e => setEditFormData({ ...editFormData, etat_trans: e.target.checked })}
                            className="w-8 h-8 rounded-xl text-primary-600 focus:ring-primary-500 border-2 border-slate-300 transition-all cursor-pointer"
                        />
                        <label htmlFor="edit-served-modal-component" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer uppercase tracking-widest">
                            Transaction servie / payée
                        </label>
                    </div>

                    <div className="pt-8 flex gap-6 relative z-0">
                        <button type="button" onClick={onClose} className="flex-1 py-6 px-8 rounded-[2.5rem] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase text-[11px] tracking-[0.3em]">Abandonner</button>
                        <button type="submit" disabled={isProcessing} className="flex-[2] bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                            Sauvegarder Flux
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;
