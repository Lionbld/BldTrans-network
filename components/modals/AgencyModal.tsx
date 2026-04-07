import React, { useState } from 'react';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { Ville, Agence } from '../../types';

interface AgencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: any) => Promise<void>;
    isSubmitting: boolean;
    villes: Ville[];
    agency: Agence | null;
    mode: 'create' | 'edit';
}

const AgencyModal = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    villes,
    agency,
    mode
}: AgencyModalProps) => {
    const [formData, setFormData] = useState<{
        nom: string;
        adresse: string;
        ville_agence: string;
        phone: string;
        verrou: boolean;
        limite_quotidienne: number | '';
    }>({
        nom: '',
        adresse: '',
        ville_agence: '',
        phone: '',
        verrou: false,
        limite_quotidienne: ''
    });

    React.useEffect(() => {
        if (agency && mode === 'edit') {
            setFormData({
                nom: agency.nom || '',
                adresse: agency.adresse || '',
                ville_agence: agency.ville_agence?.toString() || '',
                phone: agency.phone || '',
                verrou: agency.verrou,
                limite_quotidienne: agency.limite_quotidienne ?? ''
            });
        } else {
            setFormData({ nom: '', adresse: '', ville_agence: '', phone: '', verrou: false, limite_quotidienne: '' });
        }
    }, [agency, mode, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-fade-in" onClick={() => !isSubmitting && onClose()}></div>
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">
                        {mode === 'create' ? 'Nouvelle Agence' : 'Modifier Agence'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2.5 bg-white rounded-full shadow-sm transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Nom de la succursale</label>
                            <input
                                type="text" required
                                value={formData.nom}
                                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                placeholder="Ex: BLD - Central"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Adresse Physique</label>
                            <input
                                type="text" required
                                value={formData.adresse}
                                onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                placeholder="Localisation précise"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Ville</label>
                                <select
                                    required
                                    value={formData.ville_agence}
                                    onChange={e => setFormData({ ...formData, ville_agence: e.target.value })}
                                    className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                >
                                    <option value="">Sélectionner...</option>
                                    {villes.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Contact</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                    placeholder="+244..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Limite Quotidienne ($)</label>
                            <input
                                type="number" required min="0" step="0.01"
                                value={formData.limite_quotidienne}
                                onChange={e => setFormData({ ...formData, limite_quotidienne: e.target.value ? parseFloat(e.target.value) : '' })}
                                className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                placeholder="Définit le max cumulé d'envoi par jour"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => setFormData({ ...formData, verrou: !formData.verrou })}>
                        <input
                            type="checkbox"
                            checked={formData.verrou}
                            onChange={e => setFormData({ ...formData, verrou: e.target.checked })}
                            className="w-6 h-6 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer uppercase tracking-widest">
                            Marquer comme suspendue
                        </label>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 px-6 rounded-[2rem] font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase text-[10px] tracking-widest"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                            {mode === 'create' ? 'Confirmer Création' : 'Sauvegarder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgencyModal;
