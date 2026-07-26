import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Agence, DailyReportRPC, WeeklyReportRPC, MonthlyReportRPC, AgencyRankingEntry } from '../types';
import { useToast } from './ToastProvider';
import {
    Calendar, Building, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
    FileText, BarChart3, Wallet, Receipt, Loader2, DollarSign, RefreshCcw,
    Printer, CalendarDays, CalendarRange, Trophy, Percent, Activity, Download
} from 'lucide-react';
import {
    exportDailyPdf, exportWeeklyPdf, exportMonthlyPdf,
    type DailyPdfData,
} from '../utils/reportPdf';

// ——— CSV Export helper ———
function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ——— Tabs ———
const TABS = [
    { id: 'daily', label: 'Journalier', icon: CalendarDays },
    { id: 'weekly', label: 'Hebdomadaire', icon: CalendarRange },
    { id: 'monthly', label: 'Mensuel', icon: BarChart3 },
] as const;
type TabId = typeof TABS[number]['id'];

// ——— Helpers ———
const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().substring(0, 10);
const getMonday = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)); };

// ——— StatCard ———
const StatCard = ({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) => (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
        <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-slate-800/50`}>
            <Icon size={22} className={color} />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white truncate font-mono">{value}</p>
        </div>
    </div>
);

const EMPTY_DAILY: DailyReportRPC = {
    opening_balance: 0, total_envois_montant: 0, total_frais: 0,
    total_services_montant: 0, total_depenses: 0, total_mouv_plus: 0,
    total_mouv_minus: 0, nb_envois: 0, nb_services: 0, solde: 0,
    revenu_net: 0, agencies_detail: null
};
const EMPTY_WEEKLY: WeeklyReportRPC = {
    total_envois: 0, total_frais: 0, total_services: 0,
    total_depenses: 0, nb_envois: 0, nb_services: 0,
    revenu_net: 0, taux_service: 0, agencies_ranking: null
};
const EMPTY_MONTHLY: MonthlyReportRPC = {
    date_from: '', date_to: '', total_envois: 0, total_frais: 0,
    total_services: 0, total_depenses: 0, nb_envois: 0, nb_services: 0,
    nb_total: 0, revenu_net: 0, taux_service: 0, marge_nette: 0,
    moy_transaction: 0, agencies_ranking: null
};

const Reports = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<TabId>('daily');

    // Global
    const [agencies, setAgencies] = useState<Agence[]>([]);
    const [selectedAgency, setSelectedAgency] = useState<number | null>(null);

    // Dates
    const [selectedDate, setSelectedDate] = useState(today());
    const [weekStart, setWeekStart] = useState(() => getMonday(new Date()).toISOString().substring(0, 10));
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));

    // RPC results
    const [dailyData, setDailyData] = useState<DailyReportRPC>(EMPTY_DAILY);
    const [weeklyData, setWeeklyData] = useState<WeeklyReportRPC>(EMPTY_WEEKLY);
    const [monthlyData, setMonthlyData] = useState<MonthlyReportRPC>(EMPTY_MONTHLY);

    // Loading states per tab
    const [loadingAgencies, setLoadingAgencies] = useState(true);
    const [loadingDaily, setLoadingDaily] = useState(false);
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [loadingMonthly, setLoadingMonthly] = useState(false);

    // ——— Week end computed ———
    const weekEnd = useMemo(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 6);
        return d.toISOString().substring(0, 10);
    }, [weekStart]);

    // ——— Month label ———
    const monthLabel = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }, [selectedMonth]);

    const selectedAgencyName = selectedAgency ? agencies.find(a => a.id === selectedAgency)?.nom || null : null;

    useEffect(() => {
        const loadAgencies = async () => {
            setLoadingAgencies(true);
            try {
                const { data, error } = await supabase.from('agence').select('*').order('nom');
                if (error) throw error;
                setAgencies(data || []);
            } catch (err: any) {
                console.error("Erreur chargement agences (Reports):", err);
                showToast('error', 'Erreur chargement agences', err.message || 'Impossible de charger la liste des agences.');
            } finally {
                setLoadingAgencies(false);
            }
        };
        loadAgencies();
    }, []);

    const fetchDaily = useCallback(async () => {
        setLoadingDaily(true);
        try {
            const { data, error } = await supabase.rpc('get_daily_report', {
                p_date: selectedDate,
                p_agence_id: selectedAgency ?? null,
            });
            if (error) throw error;
            setDailyData(data as DailyReportRPC ?? EMPTY_DAILY);
        } catch (err: any) {
            console.error('Erreur get_daily_report:', err);
            showToast('error', 'Erreur rapport journalier', err.message || 'Vérifiez la fonction RPC.');
            setDailyData(EMPTY_DAILY);
        } finally {
            setLoadingDaily(false);
        }
    }, [selectedDate, selectedAgency]);

    const fetchWeekly = useCallback(async () => {
        setLoadingWeekly(true);
        try {
            const { data, error } = await supabase.rpc('get_weekly_report', {
                p_from: weekStart,
                p_to: weekEnd,
                p_agence_id: selectedAgency ?? null,
            });
            if (error) throw error;
            setWeeklyData(data as WeeklyReportRPC ?? EMPTY_WEEKLY);
        } catch (err: any) {
            console.error('Erreur get_weekly_report:', err);
            showToast('error', 'Erreur rapport hebdomadaire', err.message || 'Vérifiez la fonction RPC.');
            setWeeklyData(EMPTY_WEEKLY);
        } finally {
            setLoadingWeekly(false);
        }
    }, [weekStart, weekEnd, selectedAgency]);

    const fetchMonthly = useCallback(async () => {
        setLoadingMonthly(true);
        try {
            const [y, m] = selectedMonth.split('-').map(Number);
            const { data, error } = await supabase.rpc('get_monthly_report', {
                p_year: y,
                p_month: m,
                p_agence_id: selectedAgency ?? null,
            });
            if (error) throw error;
            setMonthlyData(data as MonthlyReportRPC ?? EMPTY_MONTHLY);
        } catch (err: any) {
            console.error('Erreur get_monthly_report:', err);
            showToast('error', 'Erreur rapport mensuel', err.message || 'Vérifiez la fonction RPC.');
            setMonthlyData(EMPTY_MONTHLY);
        } finally {
            setLoadingMonthly(false);
        }
    }, [selectedMonth, selectedAgency]);

    useEffect(() => { if (tab === 'daily') fetchDaily(); }, [tab, selectedDate, selectedAgency]);
    useEffect(() => { if (tab === 'weekly') fetchWeekly(); }, [tab, weekStart, weekEnd, selectedAgency]);
    useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [tab, selectedMonth, selectedAgency]);

    const handleTabChange = (newTab: TabId) => {
        setTab(newTab);
    };

    const handleRefresh = () => {
        showToast('info', 'Actualisation...', 'Recalcul en cours.');
        if (tab === 'daily') fetchDaily();
        else if (tab === 'weekly') fetchWeekly();
        else fetchMonthly();
    };

    const handleExportDaily = async () => {
        showToast('info', 'Préparation PDF...', 'Chargement des transactions en cours.');

        let transactions: DailyPdfData['transactions'] = [];
        try {
            const { data: txData, error: txError } = await supabase.rpc('get_daily_transactions', {
                p_date: selectedDate,
                p_agence_id: selectedAgency ?? null,
            });
            if (txError) throw txError;
            if (txData) {
                transactions = (txData as any[]).map(t => ({
                    code: t.code,
                    montant: Number(t.montant),
                    frais: Number(t.frais),
                    expediteur: t.expediteur,
                    destinataire: t.destinataire,
                    agent: t.agent,
                    type: t.type_op as 'envoi' | 'service',
                }));
            }
        } catch (err: any) {
            console.warn('get_daily_transactions non disponible, PDF sans détail lignes:', err.message);
        }

        const agenciesDetail = dailyData.agencies_detail?.map(a => ({
            name: a.name,
            report: a.opening_balance,
            envois: a.envois,
            services: a.services,
            depenses: a.depenses,
            mouvPlus: a.mouv_plus,
            mouvMinus: a.mouv_minus,
            solde: a.solde,
            nbEnvois: a.nb_envois,
            nbServices: a.nb_services,
        }));

        exportDailyPdf({
            agencyName: selectedAgencyName,
            date: selectedDate,
            report: dailyData.opening_balance,
            services: dailyData.total_services_montant,
            envois: dailyData.total_envois_montant,
            depenses: dailyData.total_depenses,
            mouvPlus: dailyData.total_mouv_plus,
            mouvMinus: dailyData.total_mouv_minus,
            solde: dailyData.solde,
            revenuNet: dailyData.revenu_net,
            totalEnvoisMontant: dailyData.total_envois_montant,
            totalServicesMontant: dailyData.total_services_montant,
            transactions,
            agenciesDetail,
        });
    };

    const handleExportWeekly = () => {
        const ranking = weeklyData.agencies_ranking?.map((a, i) => ({
            rang: i + 1, name: a.name, nbOps: a.nb_ops ?? (a.nb_envois + a.nb_services),
            volume: a.volume, revenu: a.revenu,
        }));
        exportWeeklyPdf({
            agencyName: selectedAgencyName,
            dateFrom: weekStart, dateTo: weekEnd,
            envois: weeklyData.total_envois,
            services: weeklyData.total_services,
            frais: weeklyData.total_frais,
            depenses: weeklyData.total_depenses,
            revenuNet: weeklyData.revenu_net,
            tauxService: weeklyData.taux_service,
            nbEnvois: weeklyData.nb_envois,
            nbServices: weeklyData.nb_services,
            agenciesRanking: ranking,
        });
    };

    const handleExportMonthly = () => {
        const ranking = monthlyData.agencies_ranking?.map((a, i) => ({
            position: i + 1, name: a.name, volume: a.volume, services: a.services, resultat: a.revenu,
            performance: a.volume > 0 ? `${((a.revenu / a.volume) * 100).toFixed(1)}%` : '0%',
        }));
        exportMonthlyPdf({
            agencyName: selectedAgencyName,
            monthLabel,
            envois: monthlyData.total_envois,
            services: monthlyData.total_services,
            frais: monthlyData.total_frais,
            depenses: monthlyData.total_depenses,
            revenuNet: monthlyData.revenu_net,
            tauxService: monthlyData.taux_service,
            margeNette: monthlyData.marge_nette,
            moyenneTransaction: monthlyData.moy_transaction,
            nbEnvois: monthlyData.nb_envois,
            nbServices: monthlyData.nb_services,
            nbTotal: monthlyData.nb_total,
            agenciesRanking: ranking,
        });
    };

    const handleExportCsvDaily = async () => {
        const agName = selectedAgencyName || 'Toutes';
        const details = dailyData.agencies_detail ?? [];
        showToast('info', 'Préparation CSV...', 'Chargement des détails en cours.');

        let transactions: DailyPdfData['transactions'] = [];
        try {
            const { data: txData, error: txError } = await supabase.rpc('get_daily_transactions', {
                p_date: selectedDate,
                p_agence_id: selectedAgency ?? null,
            });
            if (txError) throw txError;
            if (txData) {
                transactions = (txData as any[]).map(t => ({
                    code: t.code, montant: Number(t.montant), frais: Number(t.frais),
                    expediteur: t.expediteur, destinataire: t.destinataire, agent: t.agent, type: t.type_op as 'envoi' | 'service'
                }));
            }
        } catch (err: any) {
            console.warn('Erreur chargement transactions CSV:', err.message);
        }

        const esc = (v: string | number | undefined | null) => `"${String(v || '').replace(/"/g, '""')}"`;
        const lines: string[] = [];

        lines.push(`"Rapport Journalier du ${new Date(selectedDate).toLocaleDateString('fr-FR')}"`);
        lines.push("");
        lines.push('"RÉSUMÉ"');
        lines.push(['Agence', 'Report ($)', 'Nb Envois', 'Montant Envois ($)', 'Frais ($)', 'Nb Services', 'Montant Services ($)', 'Dépenses ($)', 'Mouv+ ($)', 'Mouv- ($)', 'Solde ($)'].map(esc).join(';'));

        const summaryRows = details.length > 0
            ? details.map(a => [a.name, a.opening_balance, a.nb_envois, a.envois, a.frais, a.nb_services, a.services, a.depenses, a.mouv_plus, a.mouv_minus, a.solde])
            : [['(Agence sélectionnée)', dailyData.opening_balance, dailyData.nb_envois, dailyData.total_envois_montant, dailyData.total_frais, dailyData.nb_services, dailyData.total_services_montant, dailyData.total_depenses, dailyData.total_mouv_plus, dailyData.total_mouv_minus, dailyData.solde]];

        summaryRows.forEach(r => lines.push(r.map(esc).join(';')));

        if (transactions.length > 0) {
            const envois = transactions.filter(t => t.type === 'envoi');
            const services = transactions.filter(t => t.type === 'service');

            lines.push("");
            lines.push('"DÉTAILS DES ENVOIS"');
            lines.push(['Code', 'Montant ($)', 'Frais ($)', 'Expéditeur', 'Destinataire', 'Agent Envoi'].map(esc).join(';'));
            envois.forEach(t => lines.push([t.code, t.montant, t.frais, t.expediteur, t.destinataire, t.agent].map(esc).join(';')));

            lines.push("");
            lines.push('"DÉTAILS DES SERVICES"');
            lines.push(['Code', 'Montant ($)', 'Frais ($)', 'Expéditeur', 'Destinataire', 'Agent Service'].map(esc).join(';'));
            services.forEach(t => lines.push([t.code, t.montant, t.frais, t.expediteur, t.destinataire, t.agent].map(esc).join(';')));
        }

        const csv = lines.join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `rapport-journalier-${selectedDate}-${agName}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportCsvWeekly = () => {
        const agName = selectedAgencyName || 'Toutes';
        const ranking = weeklyData.agencies_ranking ?? [];
        exportCsv(
            `rapport-hebdomadaire-${weekStart}-au-${weekEnd}-${agName}.csv`,
            ['Agence', 'Nb Envois', 'Volume ($)', 'Frais ($)', 'Nb Services', 'Services ($)', 'Dépenses ($)', 'Revenu ($)'],
            ranking.length > 0
                ? ranking.map(a => [a.name, a.nb_envois, a.volume, a.frais, a.nb_services, a.services, a.dep_total, a.revenu])
                : [['(Agence sélectionnée)', weeklyData.nb_envois, weeklyData.total_envois, weeklyData.total_frais, weeklyData.nb_services, weeklyData.total_services, weeklyData.total_depenses, weeklyData.revenu_net]]
        );
    };

    const handleExportCsvMonthly = () => {
        const agName = selectedAgencyName || 'Toutes';
        const ranking = monthlyData.agencies_ranking ?? [];
        exportCsv(
            `rapport-mensuel-${selectedMonth}-${agName}.csv`,
            ['Agence', 'Nb Envois', 'Volume ($)', 'Frais ($)', 'Nb Services', 'Services ($)', 'Dépenses ($)', 'Revenu ($)'],
            ranking.length > 0
                ? ranking.map(a => [a.name, a.nb_envois, a.volume, a.frais, a.nb_services, a.services, a.dep_total, a.revenu])
                : [['(Agence sélectionnée)', monthlyData.nb_envois, monthlyData.total_envois, monthlyData.total_frais, monthlyData.nb_services, monthlyData.total_services, monthlyData.total_depenses, monthlyData.revenu_net]]
        );
    };

    if (loadingAgencies) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Chargement des données...</p>
            </div>
        );
    }

    const isLoadingTab = (tab === 'daily' && loadingDaily) || (tab === 'weekly' && loadingWeekly) || (tab === 'monthly' && loadingMonthly);

    return (
        <div className="space-y-8 animate-fade-in pb-16">
            {/* Header & Mode Switch Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
                        Rapports & Audit Bilan
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Analyses consolidées et bilans comptables exportables
                    </p>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleTabChange(t.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    active
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon size={16} />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filter & Export Toolbar */}
            <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
                    {/* Agency Selector */}
                    <div className="relative min-w-[200px] flex-1">
                        <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={selectedAgency ?? ''}
                            onChange={e => setSelectedAgency(e.target.value ? Number(e.target.value) : null)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Toutes les agences</option>
                            {agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                        </select>
                    </div>

                    {/* Date Pickers */}
                    {tab === 'daily' && (
                        <div className="relative min-w-[170px]">
                            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                    {tab === 'weekly' && (
                        <div className="relative min-w-[170px]">
                            <CalendarRange size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="week"
                                value={(() => { const d = new Date(weekStart); const jan4 = new Date(d.getFullYear(), 0, 4); const wk = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7); return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`; })()}
                                onChange={e => { if (e.target.value) { const [y, w] = e.target.value.split('-W').map(Number); const jan4 = new Date(y, 0, 4); const d = new Date(jan4.getTime() + (w - 1) * 7 * 86400000); setWeekStart(getMonday(d).toISOString().substring(0, 10)); } }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                    {tab === 'monthly' && (
                        <div className="relative min-w-[170px]">
                            <CalendarDays size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={handleRefresh}
                        className={`p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all ${isLoadingTab ? 'animate-spin' : ''}`}
                        title="Actualiser"
                    >
                        <RefreshCcw size={18} />
                    </button>
                    <button
                        onClick={tab === 'daily' ? handleExportCsvDaily : tab === 'weekly' ? handleExportCsvWeekly : handleExportCsvMonthly}
                        className="btn-secondary text-xs px-3.5 py-2"
                    >
                        <Download size={15} /> CSV
                    </button>
                    <button
                        onClick={tab === 'daily' ? handleExportDaily : tab === 'weekly' ? handleExportWeekly : handleExportMonthly}
                        className="btn-primary text-xs px-4 py-2"
                    >
                        <Printer size={15} /> PDF
                    </button>
                </div>
            </div>

            {/* Tab Body */}
            <div className="relative">
                {isLoadingTab && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-[#060612]/70 rounded-3xl backdrop-blur-xs">
                        <Loader2 size={36} className="animate-spin text-indigo-600" />
                    </div>
                )}
                {tab === 'daily' && <DailyTab data={dailyData} date={selectedDate} />}
                {tab === 'weekly' && <WeeklyTab data={weeklyData} from={weekStart} to={weekEnd} />}
                {tab === 'monthly' && <MonthlyTab data={monthlyData} monthLabel={monthLabel} />}
            </div>
        </div>
    );
};

// ===== DAILY TAB =====
const DailyTab = ({ data, date }: { data: DailyReportRPC; date: string }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Report veille" value={`${fmt(data.opening_balance)} $`} icon={FileText} color="text-slate-500" bg="bg-slate-500/10" />
            <StatCard label="Volume Envois" value={`${fmt(data.total_envois_montant)} $`} icon={TrendingUp} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" />
            <StatCard label="Volume Services" value={`${fmt(data.total_services_montant)} $`} icon={Activity} color="text-purple-600 dark:text-purple-400" bg="bg-purple-500/10" />
            <StatCard label="Frais Réseau" value={`${fmt(data.total_frais)} $`} icon={DollarSign} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Mouvements +" value={`${fmt(data.total_mouv_plus)} $`} icon={ArrowUpCircle} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard label="Mouvements -" value={`${fmt(data.total_mouv_minus)} $`} icon={ArrowDownCircle} color="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" />
            <StatCard label="Solde en Main" value={`${fmt(data.solde)} $`} icon={Wallet} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" />
            <StatCard label="Revenu Net" value={`${fmt(data.revenu_net)} $`} icon={TrendingDown} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
        </div>

        {/* Agency Breakdown Table */}
        {data.agencies_detail && data.agencies_detail.length > 0 && (
            <div className="glass-card rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base font-display">Détail du Bilan par Agence</h3>
                    <p className="text-xs text-slate-400">Synthèse du {fmtDate(date)}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Agence</th>
                                <th className="px-5 py-3 text-right">Report ($)</th>
                                <th className="px-5 py-3 text-right">Envois ($)</th>
                                <th className="px-5 py-3 text-right">Frais ($)</th>
                                <th className="px-5 py-3 text-right">Services ($)</th>
                                <th className="px-5 py-3 text-right">Dépenses ($)</th>
                                <th className="px-5 py-3 text-right">Mouv+ ($)</th>
                                <th className="px-5 py-3 text-right">Mouv- ($)</th>
                                <th className="px-5 py-3 text-right">Solde ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                            {data.agencies_detail.map(a => (
                                <tr key={a.agence_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                    <td className="px-5 py-3.5 font-bold font-sans text-slate-900 dark:text-white">{a.name}</td>
                                    <td className="px-5 py-3.5 text-right text-slate-500">{fmt(a.opening_balance)}</td>
                                    <td className="px-5 py-3.5 text-right text-slate-700 dark:text-slate-300">{fmt(a.envois)}</td>
                                    <td className="px-5 py-3.5 text-right text-emerald-600 font-bold">{fmt(a.frais)}</td>
                                    <td className="px-5 py-3.5 text-right text-purple-600">{fmt(a.services)}</td>
                                    <td className="px-5 py-3.5 text-right text-red-500">{fmt(a.depenses)}</td>
                                    <td className="px-5 py-3.5 text-right text-green-500">{fmt(a.mouv_plus)}</td>
                                    <td className="px-5 py-3.5 text-right text-orange-500">{fmt(a.mouv_minus)}</td>
                                    <td className={`px-5 py-3.5 text-right font-extrabold ${a.solde >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>{fmt(a.solde)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

// ===== WEEKLY TAB =====
const WeeklyTab = ({ data, from, to }: { data: WeeklyReportRPC; from: string; to: string }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Envois" value={`${fmt(data.total_envois)} $`} icon={TrendingUp} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" />
            <StatCard label="Total Services" value={`${fmt(data.total_services)} $`} icon={Activity} color="text-purple-600 dark:text-purple-400" bg="bg-purple-500/10" />
            <StatCard label="Frais Collectés" value={`${fmt(data.total_frais)} $`} icon={DollarSign} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard label="Total Dépenses" value={`${fmt(data.total_depenses)} $`} icon={Receipt} color="text-red-500" bg="bg-red-500/10" />
            <StatCard label="Revenu Net" value={`${fmt(data.revenu_net)} $`} icon={Wallet} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" />
            <StatCard label="Taux de Service" value={`${Number(data.taux_service).toFixed(1)}%`} icon={Percent} color="text-amber-500" bg="bg-amber-500/10" />
        </div>
        {data.agencies_ranking && data.agencies_ranking.length > 0 && <AgencyLeaderboard agencies={data.agencies_ranking} mode="weekly" />}
    </div>
);

// ===== MONTHLY TAB =====
const MonthlyTab = ({ data, monthLabel }: { data: MonthlyReportRPC; monthLabel: string }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Envois" value={`${fmt(data.total_envois)} $`} icon={TrendingUp} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" />
            <StatCard label="Total Services" value={`${fmt(data.total_services)} $`} icon={Activity} color="text-purple-600 dark:text-purple-400" bg="bg-purple-500/10" />
            <StatCard label="Frais Collectés" value={`${fmt(data.total_frais)} $`} icon={DollarSign} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard label="Revenu Net" value={`${fmt(data.revenu_net)} $`} icon={Wallet} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" />
        </div>
        {data.agencies_ranking && data.agencies_ranking.length > 0 && <AgencyLeaderboard agencies={data.agencies_ranking} mode="monthly" />}
    </div>
);

// ===== AGENCY LEADERBOARD =====
const AgencyLeaderboard = ({ agencies, mode }: { agencies: AgencyRankingEntry[]; mode: 'weekly' | 'monthly' }) => (
    <div className="glass-card rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base font-display">Classement des Agences</h3>
        </div>
        <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Agence</th>
                    <th className="px-5 py-3 text-right">Volume ($)</th>
                    <th className="px-5 py-3 text-right">Revenu ($)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                {agencies.map((a, i) => (
                    <tr key={a.agence_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-bold font-sans text-slate-400">#{i + 1}</td>
                        <td className="px-5 py-3.5 font-bold font-sans text-slate-900 dark:text-white">{a.name}</td>
                        <td className="px-5 py-3.5 text-right text-slate-900 dark:text-white font-bold">{fmt(a.volume)}</td>
                        <td className={`px-5 py-3.5 text-right font-extrabold ${a.revenu >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(a.revenu)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default Reports;
