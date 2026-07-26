import React, { useState, useEffect } from 'react';
import { X, Loader2, User, Mail, Phone, Building, Send, Shield, ShieldAlert, Lock, ShieldCheck } from 'lucide-react';
import { Agent, Agence } from '../../types';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: any) => Promise<void>;
    isSubmitting: boolean;
    agencies: Agence[];
    agent: Agent | null;
    mode: 'create' | 'edit';
}

const UserModal = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    agencies,
    agent,
    mode
}: UserModalProps) => {
    const [formData, setFormData] = useState({
        user_agent: '',
        email: '',
        phone: '',
        password: '',
        agence_agens: '',
        envoi: true,
        admin: false,
        superadmin: false
    });

    useEffect(() => {
        if (agent && mode === 'edit') {
            setFormData({
                user_agent: agent.user_agent || '',
                email: agent.email || '',
                phone: agent.phone || '',
                password: '',
                agence_agens: agent.agence_agens?.toString() || '',
                envoi: agent.envoi,
                admin: agent.admin,
                superadmin: agent.superadmin || false
            });
        } else {
            setFormData({
                user_agent: '',
                email: '',
                phone: '',
                password: '',
                agence_agens: '',
                envoi: true,
                admin: false,
                superadmin: false
            });
        }
    }, [agent, mode, isOpen]);

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
                        {mode === 'create' ? 'Nouvel Agent' : 'Modifier Agent'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2.5 bg-white rounded-full shadow-sm transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Nom Complet</label>
                            <input
                                type="text" required
                                value={formData.user_agent}
                                onChange={e => setFormData({ ...formData, user_agent: e.target.value })}
                                className="w-full px-6 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                placeholder="Prénom et NOM"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Email</label>
                                <input
                                    type="email" required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-6 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Téléphone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-6 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {mode === 'create' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">
                                    Mot de passe initial (min. 6 caractères)
                                </label>
                                <input
                                    type="password" required minLength={6}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-6 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Agence Assignée</label>
                            <select
                                required
                                value={formData.agence_agens}
                                onChange={e => setFormData({ ...formData, agence_agens: e.target.value })}
                                className="w-full px-6 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                            >
                                <option value="">Sélectionner une agence...</option>
                                {agencies.map(v => (
                                    <option key={v.id} value={v.id}>{v.nom}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rôles & Permissions</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary-200 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.envoi}
                                        onChange={e => setFormData({ ...formData, envoi: e.target.checked })}
                                        className="w-5 h-5 rounded-md text-primary-600 focus:ring-primary-500 border-slate-300"
                                    />
                                    <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">Droit d'Envoi</span>
                                </label>

                                <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-purple-200 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.admin}
                                        onChange={e => setFormData({ ...formData, admin: e.target.checked })}
                                        className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 border-slate-300"
                                    />
                                    <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">Admin Agence</span>
                                </label>
                            </div>
                        </div>
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
                            {mode === 'create' ? 'Inscrire Agent' : 'Sauvegarder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
