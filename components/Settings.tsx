import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Globe,
    ShieldCheck,
    Palette,
    CreditCard,
    Percent,
    Lock,
    Save,
    RefreshCcw,
    AlertTriangle,
    Monitor,
    Database,
    Smartphone
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
        network_name: 'BLD TRANS NETWORK',
        support_phone: '+244 923 000 000',
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
                console.warn('Could not fetch settings:', error);
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
            const { error } = await supabase
                .from('system_settings')
                .upsert([settings]);

            if (error) {
                showToast('error', 'Erreur', `Impossible de sauvegarder: ${error.message}`);
                setIsSaving(false);
                return;
            }

            showToast('success', 'Configuration enregistrée', 'Les paramètres ont été appliqués.');
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
                <RefreshCcw className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
                        Configuration du Système
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Règles métier, commissions globales et préférences réseau
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary shrink-0 self-start sm:self-auto text-xs px-5 py-2.5"
                >
                    {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Enregistrer la configuration</span>
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Navigation Sidebar Tabs */}
                <div className="w-full lg:w-64 space-y-1.5 shrink-0">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                                    active
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                                        : 'glass-card text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Card */}
                <div className="flex-1 glass-card rounded-3xl p-6 sm:p-8">

                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 mb-4">
                                    <Monitor className="text-indigo-500" size={20} />
                                    <span>Identité Réseau</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">Nom du réseau</label>
                                        <input
                                            type="text"
                                            value={settings.network_name || ''}
                                            onChange={(e) => handleChange('network_name', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">Contact Support Central</label>
                                        <input
                                            type="tel"
                                            value={settings.support_phone || ''}
                                            onChange={(e) => handleChange('support_phone', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 mb-4">
                                    <Database className="text-emerald-500" size={20} />
                                    <span>Maintenance Global</span>
                                </h3>

                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={24} className="text-amber-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Mode Maintenance Système</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Bloque l'accès agents à l'échelle du réseau entier.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.maintenance_mode}
                                        onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
                                        className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 mb-4">
                                    <Percent className="text-indigo-500" size={20} />
                                    <span>Commissions & Ratios Réseau</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">Commission standard (%)</label>
                                        <input
                                            type="number"
                                            value={settings.commission_percent}
                                            onChange={(e) => handleChange('commission_percent', parseFloat(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">Frais fixe minimum ($)</label>
                                        <input
                                            type="number"
                                            value={settings.frais_fixe_min}
                                            onChange={(e) => handleChange('frais_fixe_min', parseFloat(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 mb-4">
                                    <CreditCard className="text-indigo-500" size={20} />
                                    <span>Plafonds Max d'Envoi / Retrait</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">Montant Max par Envoi ($)</label>
                                        <input
                                            type="number"
                                            value={settings.montant_max_envoi}
                                            onChange={(e) => handleChange('montant_max_envoi', parseFloat(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">Montant Max par Versement ($)</label>
                                        <input
                                            type="number"
                                            value={settings.montant_max_versement}
                                            onChange={(e) => handleChange('montant_max_versement', parseFloat(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-fade-in text-xs">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 mb-4">
                                <Lock className="text-red-500" size={20} />
                                <span>Politique de Sécurité Réseau</span>
                            </h3>

                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Expiration de Session Automatique</p>
                                        <p className="text-slate-400 text-[11px]">Déconnexion de sécurité après 30 minutes d'inactivité.</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Authentification Multi-facteurs (2FA)</p>
                                        <p className="text-slate-400 text-[11px]">Requis pour tous les super-administrateurs.</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-fade-in text-xs">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 mb-4">
                                <Palette className="text-purple-500" size={20} />
                                <span>Thème & Branding</span>
                            </h3>
                            <p className="text-slate-400">
                                L'application s'adapte automatiquement aux préférences système ou manuellement via le sélecteur de mode (Clair/Sombre) disponible en bas à gauche.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
