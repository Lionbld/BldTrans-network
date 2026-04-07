import React, { useState } from 'react';
import { X, Loader2, ShieldCheck } from 'lucide-react';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (clientData: { fullname: string; phone: string; sexe: string; ids: string }) => Promise<void>;
    isProcessing: boolean;
}

const ClientModal = ({ isOpen, onClose, onSubmit, isProcessing }: ClientModalProps) => {
    const [clientFormData, setClientFormData] = useState({
        fullname: '',
        phone: '',
        sexe: 'M',
        ids: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(clientFormData);
        setClientFormData({ fullname: '', phone: '', sexe: 'M', ids: '' });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl animate-fade-in" onClick={() => !isProcessing && onClose()}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Nouveau Client</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2.5 bg-white rounded-full shadow-sm"><X size={28} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Nom Complet du Client</label>
                            <input
                                type="text" required
                                value={clientFormData.fullname}
                                onChange={e => setClientFormData({ ...clientFormData, fullname: e.target.value })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                placeholder="Prénom et NOM"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Numéro de Téléphone</label>
                            <input
                                type="tel"
                                value={clientFormData.phone}
                                onChange={e => setClientFormData({ ...clientFormData, phone: e.target.value })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                placeholder="+244..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Genre / Sexe</label>
                                <select
                                    value={clientFormData.sexe}
                                    onChange={e => setClientFormData({ ...clientFormData, sexe: e.target.value })}
                                    className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black outline-none shadow-inner cursor-pointer"
                                >
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">ID Système (IDS)</label>
                                <input
                                    type="text"
                                    value={clientFormData.ids}
                                    onChange={e => setClientFormData({ ...clientFormData, ids: e.target.value })}
                                    className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black outline-none shadow-inner"
                                    placeholder="Auto si vide"
                                />
                            </div>
                        </div>
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all mt-4">
                        {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                        Enregistrer dans la base
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
