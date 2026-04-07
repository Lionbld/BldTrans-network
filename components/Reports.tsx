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
    exportDailyPdf, exportWeeklyPdf, exportMonthlyPdf
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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-5 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
        <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center shrink-0 shadow-inner`}>
            <Icon size={24} className={color} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black mb-1">{label}</p>
            <p className="text-xl font-black text-slate-900 dark:text-white truncate tracking-tighter">{value}</p>
        </div>
    </div>
);

// ——— Empty state ———
const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-16 text-slate-400 dark:text-slate-600">
        <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
        <p className="font-black uppercase tracking-widest text-xs">{label}</p>
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

    // ——— Load agencies list (once) ———
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

    // ——— Fetch daily report from RPC ———
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

    // ——— Fetch weekly report from RPC ———
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

    // ——— Fetch monthly report from RPC ———
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

    // Fetch active tab data when dependencies change
    useEffect(() => { if (tab === 'daily') fetchDaily(); }, [tab, selectedDate, selectedAgency]);
    useEffect(() => { if (tab === 'weekly') fetchWeekly(); }, [tab, weekStart, weekEnd, selectedAgency]);
    useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [tab, selectedMonth, selectedAgency]);

    // Also fetch on tab switch if we don't have data
    const handleTabChange = (newTab: TabId) => {
        setTab(newTab);
    };

    // ——— Manual refresh ———
    const handleRefresh = () => {
        showToast('info', 'Actualisation...', 'Recalcul en cours.');
        if (tab === 'daily') fetchDaily();
        else if (tab === 'weekly') fetchWeekly();
        else fetchMonthly();
    };

    // ——— PDF EXPORT ———
    const handleExportDaily = () => {
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
            services: dailyData.nb_services,
            envois: dailyData.nb_envois,
            depenses: dailyData.total_depenses,
            mouvPlus: dailyData.total_mouv_plus,
            mouvMinus: dailyData.total_mouv_minus,
            solde: dailyData.solde,
            revenuNet: dailyData.revenu_net,
            totalEnvoisMontant: dailyData.total_envois_montant,
            totalServicesMontant: dailyData.total_services_montant,
            transactions: [],
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

    // ——— CSV EXPORT ———
    const handleExportCsvDaily = () => {
        const agName = selectedAgencyName || 'Toutes';
        const details = dailyData.agencies_detail ?? [];
        exportCsv(
            `rapport-journalier-${selectedDate}-${agName}.csv`,
            ['Agence', 'Nb Envois', 'Montant Envois ($)', 'Frais ($)', 'Nb Services', 'Montant Services ($)', 'Dépenses ($)', 'Mouv+ ($)', 'Mouv- ($)', 'Solde ($)'],
            details.length > 0
                ? details.map(a => [a.name, a.nb_envois, a.envois, a.frais, a.nb_services, a.services, a.depenses, a.mouv_plus, a.mouv_minus, a.solde])
                : [['(Agence sélectionnée)', dailyData.nb_envois, dailyData.total_envois_montant, dailyData.total_frais, dailyData.nb_services, dailyData.total_services_montant, dailyData.total_depenses, dailyData.total_mouv_plus, dailyData.total_mouv_minus, dailyData.solde]]
        );
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
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 size={56} className="animate-spin text-primary-600" />
                <p className="font-black uppercase tracking-widest text-xs text-slate-400">Chargement...</p>
            </div>
        );
    }

    const isLoadingTab = (tab === 'daily' && loadingDaily) || (tab === 'weekly' && loadingWeekly) || (tab === 'monthly' && loadingMonthly);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Centre de Rapports</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest">Synthèse par période • Journalier · Hebdomadaire · Mensuel</p>
                </div>
                <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-200/50 dark:border-slate-800 overflow-x-auto">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button key={t.id} onClick={() => handleTabChange(t.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${active ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                                <Icon size={16} />{t.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row gap-4 items-center">
                <div className="flex flex-wrap items-center gap-4 flex-1 w-full">
                    {/* Agency */}
                    <div className="relative min-w-[200px] flex-1">
                        <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select value={selectedAgency ?? ''} onChange={e => setSelectedAgency(e.target.value ? Number(e.target.value) : null)}
                            className="w-full pl-12 pr-6 py-3.5 text-sm font-bold rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all appearance-none cursor-pointer">
                            <option value="">Toutes les agences</option>
                            {agencies.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                        </select>
                    </div>
                    {/* Date selector per tab */}
                    {tab === 'daily' && (
                        <div className="relative flex-1 min-w-[180px]">
                            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 text-sm font-black rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all" />
                        </div>
                    )}
                    {tab === 'weekly' && (
                        <div className="relative flex-1 min-w-[180px]">
                            <CalendarRange size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="week" value={(() => { const d = new Date(weekStart); const jan4 = new Date(d.getFullYear(), 0, 4); const wk = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7); return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`; })()}
                                onChange={e => { if (e.target.value) { const [y, w] = e.target.value.split('-W').map(Number); const jan4 = new Date(y, 0, 4); const d = new Date(jan4.getTime() + (w - 1) * 7 * 86400000); setWeekStart(getMonday(d).toISOString().substring(0, 10)); } }}
                                className="w-full pl-12 pr-4 py-3.5 text-sm font-black rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all" />
                        </div>
                    )}
                    {tab === 'monthly' && (
                        <div className="relative flex-1 min-w-[180px]">
                            <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 text-sm font-black rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all" />
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRefresh}
                        className={`p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary-600 transition-all active:scale-90 shadow-sm ${isLoadingTab ? 'animate-spin pointer-events-none' : ''}`}
                        title="Actualiser">
                        <RefreshCcw size={20} />
                    </button>
                    <button onClick={tab === 'daily' ? handleExportCsvDaily : tab === 'weekly' ? handleExportCsvWeekly : handleExportCsvMonthly}
                        className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-600/20">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={tab === 'daily' ? handleExportDaily : tab === 'weekly' ? handleExportWeekly : handleExportMonthly}
                        className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary-600/20">
                        <Printer size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Tab content with loader overlay */}
            <div className="relative">
                {isLoadingTab && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 rounded-[2rem] backdrop-blur-sm">
                        <Loader2 size={40} className="animate-spin text-primary-600" />
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
    <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Report de la veille" value={`${fmt(data.opening_balance)} $`} icon={FileText} color="text-slate-600" bg="bg-slate-100 dark:bg-slate-800" />
            <StatCard label="Total Envois (montant)" value={`${fmt(data.total_envois_montant)} $`} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Total Services" value={`${fmt(data.total_services_montant)} $`} icon={Activity} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-900/20" />
            <StatCard label="Frais Collectés" value={`${fmt(data.total_frais)} $`} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Mouvements +" value={`${fmt(data.total_mouv_plus)} $`} icon={ArrowUpCircle} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
            <StatCard label="Mouvements -" value={`${fmt(data.total_mouv_minus)} $`} icon={ArrowDownCircle} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-900/20" />
            <StatCard label="Solde en Main" value={`${fmt(data.solde)} $`} icon={Wallet} color="text-primary-600" bg="bg-primary-50 dark:bg-primary-900/20" />
            <StatCard label="Revenu Net" value={`${fmt(data.revenu_net)} $`} icon={TrendingDown} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
        </div>
        {/* Counts summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { l: 'Total Dépenses', v: `${fmt(data.total_depenses)} $` },
                { l: 'Nb Envois', v: String(data.nb_envois) },
                { l: 'Nb Services', v: String(data.nb_services) },
                { l: 'Solde Final', v: `${fmt(data.solde)} $` },
            ].map(x => (
                <div key={x.l} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{x.v}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{x.l}</p>
                </div>
            ))}
        </div>
        {/* Formule recap */}
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Formule Solde en Main</p>
            <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
                {fmt(data.opening_balance)} (report)
                {' + '}{fmt(data.total_envois_montant)} (envois)
                {' + '}{fmt(data.total_frais)} (frais)
                {' − '}{fmt(data.total_services_montant)} (services)
                {' + '}{fmt(data.total_mouv_plus)} (mouv+)
                {' − '}{fmt(data.total_mouv_minus)} (mouv−)
                {' − '}{fmt(data.total_depenses)} (dép.)
                {' = '}<strong className="text-primary-600">{fmt(data.solde)} $</strong>
            </p>
        </div>
        {/* Agency breakdown */}
        {data.agencies_detail && data.agencies_detail.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Détail par Agence</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{fmtDate(date)}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80">
                            <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                <th className="px-6 py-4">Agence</th>
                                <th className="px-6 py-4 text-right">Envois ($)</th>
                                <th className="px-6 py-4 text-right">Frais ($)</th>
                                <th className="px-6 py-4 text-right">Services ($)</th>
                                <th className="px-6 py-4 text-right">Dépenses ($)</th>
                                <th className="px-6 py-4 text-right">Mouv+ ($)</th>
                                <th className="px-6 py-4 text-right">Mouv- ($)</th>
                                <th className="px-6 py-4 text-right">Solde ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.agencies_detail.map(a => (
                                <tr key={a.agence_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{a.name}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">{fmt(a.envois)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">{fmt(a.frais)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-violet-600 tabular-nums">{fmt(a.services)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-red-500 tabular-nums">{fmt(a.depenses)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">{fmt(a.mouv_plus)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-orange-500 tabular-nums">{fmt(a.mouv_minus)}</td>
                                    <td className={`px-6 py-4 text-right font-black tabular-nums ${a.solde >= 0 ? 'text-primary-600' : 'text-red-600'}`}>{fmt(a.solde)}</td>
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
    <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Envois" value={`${fmt(data.total_envois)} $`} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Total Services" value={`${fmt(data.total_services)} $`} icon={Activity} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-900/20" />
            <StatCard label="Frais Collectés" value={`${fmt(data.total_frais)} $`} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
            <StatCard label="Total Dépenses" value={`${fmt(data.total_depenses)} $`} icon={Receipt} color="text-red-500" bg="bg-red-50 dark:bg-red-900/20" />
            <StatCard label="Revenu Net" value={`${fmt(data.revenu_net)} $`} icon={Wallet} color="text-primary-600" bg="bg-primary-50 dark:bg-primary-900/20" />
            <StatCard label="Taux de Service" value={`${Number(data.taux_service).toFixed(1)}%`} icon={Percent} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
        </div>
        {/* Stats table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Statistiques Détaillées</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Semaine du {fmtDate(from)} au {fmtDate(to)}</p>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80"><tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    <th className="px-8 py-5">Métrique</th><th className="px-8 py-5 text-right">Montant ($)</th><th className="px-8 py-5 text-right">Nombre</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                        { m: 'Total Envois', v: data.total_envois, n: data.nb_envois },
                        { m: 'Total Services', v: data.total_services, n: data.nb_services },
                        { m: 'Frais Collectés', v: data.total_frais, n: '—' },
                        { m: 'Total Dépenses', v: data.total_depenses, n: '—' },
                        { m: 'Revenu Net', v: data.revenu_net, n: '—', bold: true },
                    ].map(r => (
                        <tr key={r.m} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className={`px-8 py-5 ${r.bold ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`}>{r.m}</td>
                            <td className={`px-8 py-5 text-right tabular-nums ${r.bold ? 'font-black text-primary-600 text-lg' : 'font-bold text-slate-900 dark:text-white'}`}>{fmt(r.v)}</td>
                            <td className="px-8 py-5 text-right font-bold text-slate-400">{r.n}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* Agency leaderboard */}
        {data.agencies_ranking && data.agencies_ranking.length > 0 && <AgencyLeaderboard agencies={data.agencies_ranking} mode="weekly" />}
    </div>
);

// ===== MONTHLY TAB =====
const MonthlyTab = ({ data, monthLabel }: { data: MonthlyReportRPC; monthLabel: string }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Envois" value={`${fmt(data.total_envois)} $`} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label="Total Services" value={`${fmt(data.total_services)} $`} icon={Activity} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-900/20" />
            <StatCard label="Frais Collectés" value={`${fmt(data.total_frais)} $`} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
            <StatCard label="Total Dépenses" value={`${fmt(data.total_depenses)} $`} icon={Receipt} color="text-red-500" bg="bg-red-50 dark:bg-red-900/20" />
            <StatCard label="Revenu Net" value={`${fmt(data.revenu_net)} $`} icon={Wallet} color="text-primary-600" bg="bg-primary-50 dark:bg-primary-900/20" />
            <StatCard label="Taux de Service" value={`${Number(data.taux_service).toFixed(1)}%`} icon={Percent} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
            <StatCard label="Marge Nette" value={`${Number(data.marge_nette).toFixed(1)}%`} icon={TrendingUp} color="text-cyan-600" bg="bg-cyan-50 dark:bg-cyan-900/20" />
            <StatCard label="Moy. / Transaction" value={`${fmt(data.moy_transaction)} $`} icon={BarChart3} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20" />
        </div>
        {/* Analysis table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Analyse Détaillée</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{monthLabel}</p>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80"><tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    <th className="px-8 py-5">Indicateur</th><th className="px-8 py-5 text-right">Valeur</th><th className="px-8 py-5">Détail</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                        { i: "Volume d'Affaires", v: data.total_envois + data.total_services, d: `${data.nb_total} transactions` },
                        { i: 'Envois', v: data.total_envois, d: `${data.nb_envois} opérations` },
                        { i: 'Services', v: data.total_services, d: `${data.nb_services} opérations` },
                        { i: 'Frais Collectés', v: data.total_frais, d: '—' },
                        { i: 'Dépenses', v: data.total_depenses, d: '—' },
                        { i: 'Résultat Net', v: data.revenu_net, d: `Marge : ${Number(data.marge_nette).toFixed(1)}%`, bold: true },
                    ].map(r => (
                        <tr key={r.i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className={`px-8 py-5 ${r.bold ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`}>{r.i}</td>
                            <td className={`px-8 py-5 text-right tabular-nums ${r.bold ? 'font-black text-primary-600 text-lg' : 'font-bold text-slate-900 dark:text-white'}`}>{fmt(r.v)} $</td>
                            <td className="px-8 py-5 font-medium text-slate-400 text-sm">{r.d}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {data.agencies_ranking && data.agencies_ranking.length > 0 && <AgencyLeaderboard agencies={data.agencies_ranking} mode="monthly" />}
    </div>
);

// ===== AGENCY LEADERBOARD =====
const AgencyLeaderboard = ({ agencies, mode }: { agencies: AgencyRankingEntry[]; mode: 'weekly' | 'monthly' }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Trophy size={20} className="text-amber-500" />
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Classement des Agences</h3>
        </div>
        <table className="w-full text-left">
            <thead className="bg-blue-50 dark:bg-blue-900/20"><tr className="text-slate-500 font-black uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">#</th><th className="px-8 py-5">Agence</th>
                {mode === 'weekly' ? <><th className="px-8 py-5 text-right">Opérations</th><th className="px-8 py-5 text-right">Volume ($)</th><th className="px-8 py-5 text-right">Revenu ($)</th></> :
                    <><th className="px-8 py-5 text-right">Volume ($)</th><th className="px-8 py-5 text-right">Services ($)</th><th className="px-8 py-5 text-right">Résultat ($)</th><th className="px-8 py-5">Performance</th></>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agencies.map((a, i) => (
                    <tr key={a.agence_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-8 py-5 font-black text-slate-400">{i + 1}</td>
                        <td className="px-8 py-5 font-black text-slate-900 dark:text-white">{a.name}</td>
                        {mode === 'weekly' ? <>
                            <td className="px-8 py-5 text-right font-bold text-slate-600 dark:text-slate-300">{(a.nb_ops ?? (a.nb_envois + a.nb_services))}</td>
                            <td className="px-8 py-5 text-right font-bold text-slate-900 dark:text-white tabular-nums">{fmt(a.volume)}</td>
                            <td className={`px-8 py-5 text-right font-black tabular-nums ${a.revenu >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(a.revenu)}</td>
                        </> : <>
                            <td className="px-8 py-5 text-right font-bold text-slate-900 dark:text-white tabular-nums">{fmt(a.volume)}</td>
                            <td className="px-8 py-5 text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums">{fmt(a.services)}</td>
                            <td className={`px-8 py-5 text-right font-black tabular-nums ${a.revenu >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(a.revenu)}</td>
                            <td className="px-8 py-5 font-bold text-slate-400">{a.volume > 0 ? `${((a.revenu / a.volume) * 100).toFixed(1)}%` : '0%'}</td>
                        </>}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default Reports;
