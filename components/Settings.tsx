import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Globe,
    ShieldCheck,
    Palette,
    Bell,
    Database,
    Monitor,
    Smartphone,
    CreditCard,
    Percent,
    Lock,
    Smartphone as Phone,
    Save,
    RefreshCcw,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { supabase } from '../supabaseClient';
import { SystemSettings } from '../types';

const Settings = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'security' | 'appearance'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [settings, setSettings] = useState<SystemSettings>({
        id: 1,
        maintenance_mode: false,
        commission_percent: 5,
        frais_fixe_min: 2,
        montant_max_envoi: 5000,
        montant_max_versement: 3000
    });

    const tabs = [
        { id: 'general', label: 'Général', icon: Globe },
        { id: 'financial', label: 'Financier', icon: CreditCard },
        { id: 'security', label: 'Sécurité', icon: ShieldCheck },
        { id: 'appearance', label: 'Apparence', icon: Palette },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                console.warn('Could not fetch settings (maybe table not created yet):', error);
            } else if (data) {
                setSettings(data);
            }
        } catch (e) {
            console.error('Fetch settings error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Check if settings table exists by doing an update
            const { error } = await supabase
                .from('system_settings')
                .upsert([settings]);

            if (error) {
                showToast('error', 'Erreur', `Impossible de sauvegarder: ${error.message}`);
                setIsSaving(false);
                return;
            }

            // NOTE: Le mode maintenance agit UNIQUEMENT via system_settings.maintenance_mode
            // La colonne 'verrou' est réservée à la fermeture individuelle de fin de journée par agence.
            // L'application agent vérifie maintenance_mode en temps réel via Realtime pour bloquer l'accès global.

            showToast('success', 'Configuration enregistrée', 'Les paramètres et règles métier ont été appliqués avec succès.');
        } catch (e: any) {
            showToast('error', 'Erreur système', e.message || 'Erreur non gérée.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: keyof SystemSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <RefreshCcw className="animate-spin text-primary-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configuration Système</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest">Paramétrer les règles métier et l'interface</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>Sauvegarder les changements</span>
                </button>
            </header>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-72 space-y-2">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${active
                                        ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm p-10">

                    {activeTab === 'general' && (
                        <div className="space-y-10 animate-fade-in">
                            <section>
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <Monitor className="text-primary-500" size={24} /> Identité du Réseau
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nom de l'Organisation</label>
                                        <input type="text" defaultValue="BLD TRANS NETWORK" className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-sm font-black focus:border-primary-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contact Support Central</label>
                                        <input type="tel" defaultValue="+244 923 000 000" className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-sm font-black focus:border-primary-500 outline-none transition-all" />
                                    </div>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <Database className="text-emerald-500" size={24} /> Maintenance & Data
                                </h3>
                                <div className="p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/20 flex flex-col md:flex-row items-center gap-6">
                                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h4 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">Mode Maintenance Système</h4>
                                        <p className="text-xs text-amber-700 dark:text-amber-500/80 font-bold mt-1">
                                            Bloque l'accès à <strong>tous les agents</strong>, indépendamment du statut individuel des agences. Le verrouillage fin de journée (par agence) reste inchangé.
                                        </p>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer" onClick={() => handleChange('maintenance_mode', !settings.maintenance_mode)}>
                                        <input type="checkbox" className="sr-only peer" checked={settings.maintenance_mode} readOnly />
                                        <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-10 animate-fade-in">
                            <section>
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <Percent className="text-blue-500" size={24} /> Paramètres de Commission
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pourcentage Réseau Standard (%)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={settings.commission_percent} 
                                                onChange={(e) => handleChange('commission_percent', parseFloat(e.target.value))}
                                                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-sm font-black focus:border-primary-500 outline-none transition-all" 
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Frais Fixe Minimum ($)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={settings.frais_fixe_min} 
                                                onChange={(e) => handleChange('frais_fixe_min', parseFloat(e.target.value))}
                                                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-sm font-black focus:border-primary-500 outline-none transition-all" 
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <CreditCard className="text-primary-500" size={24} /> Limites de Transaction
                                </h3>
                                <div className="space-y-6">
                                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border-2 border-blue-100 dark:border-blue-900/20 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight">Limite Quotidienne — Configurée par Agence</p>
                                            <p className="text-[11px] text-blue-700 dark:text-blue-400/80 font-bold mt-1">
                                                La limite quotidienne de transfert n'est plus globale. Elle est définie individuellement pour chaque agence dans le panneau <strong>Agences</strong>.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Montant Max / Envoi ($)</label>
                                            <input 
                                                type="number" 
                                                value={settings.montant_max_envoi} 
                                                onChange={(e) => handleChange('montant_max_envoi', parseFloat(e.target.value))}
                                                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-sm font-black focus:border-primary-500 outline-none transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Montant Max / Versement ($)</label>
                                            <input 
                                                type="number" 
                                                value={settings.montant_max_versement} 
                                                onChange={(e) => handleChange('montant_max_versement', parseFloat(e.target.value))}
                                                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-sm font-black focus:border-primary-500 outline-none transition-all" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-10 animate-fade-in">
                            <section>
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <Lock className="text-red-500" size={24} /> Politique d'Acces
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-xs font-black dark:text-white uppercase tracking-tight">Authentification à deux facteurs (2FA)</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Requis pour tous les super-agents</p>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-xs font-black dark:text-white uppercase tracking-tight">Expiration Session Automatique</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Déconnexion après 30 min d'inactivité</p>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <ShieldCheck className="text-emerald-500" size={24} /> Logs & Audit
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conservation de l'historique complet</p>
                                <div className="flex gap-4">
                                    <button className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all">Télécharger l'Audit de Sécurité</button>
                                    <button className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all">Vider le Cache Système</button>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-10 animate-fade-in">
                            <section>
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <Palette className="text-purple-500" size={24} /> Personnalisation Interface
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Couleur Accentuation</p>
                                        <div className="flex gap-4">
                                            <button className="w-10 h-10 rounded-full bg-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/40"></button>
                                            <button className="w-10 h-10 rounded-full bg-emerald-500 hover:scale-110 transition-transform"></button>
                                            <button className="w-10 h-10 rounded-full bg-purple-500 hover:scale-110 transition-transform"></button>
                                            <button className="w-10 h-10 rounded-full bg-amber-500 hover:scale-110 transition-transform"></button>
                                            <button className="w-10 h-10 rounded-full bg-slate-900 hover:scale-110 transition-transform"></button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Style de Sidebar</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button className="p-4 bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 rounded-2xl text-[10px] font-black uppercase text-primary-600 tracking-tight">Moderne</button>
                                            <button className="p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-tight">Classique</button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <Smartphone className="text-slate-400" size={24} /> Expérience Mobile
                                </h3>
                                <div className="flex items-center justify-between p-6 bg-primary-600 rounded-[2.5rem] text-white shadow-xl shadow-primary-500/20">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                                            <Phone size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight leading-none">Notification Push Mobile</p>
                                            <p className="text-[10px] font-bold opacity-60 uppercase mt-1">Alertes temps-réel sur les nouveaux transferts</p>
                                        </div>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer scale-125">
                                        <input type="checkbox" defaultChecked className="sr-only peer" />
                                        <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40"></div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Settings;
