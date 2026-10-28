import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Send,
  CreditCard,
  Building,
  Plus,
  ArrowRight,
  Wallet,
  Activity,
  Calendar,
  Trophy,
  CheckCircle2,
  Clock,
  Zap,
  ArrowUpRight,
  DollarSign,
  Layers,
  Coins
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Transfert, Agence, Pays } from '../types';
import { useToast } from './ToastProvider';

type Period = 'today' | 'week' | 'month' | 'all';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  delay = "0"
}: {
  title: string,
  value: string,
  subtitle?: string,
  icon: any,
  colorScheme: 'indigo' | 'emerald' | 'amber' | 'purple',
  delay?: string
}) => {
  const styles = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/10',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500/20',
      glow: 'from-indigo-600/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'from-emerald-600/20'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
      glow: 'from-amber-600/20'
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/10',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/20',
      glow: 'from-purple-600/20'
    }
  }[colorScheme];

  return (
    <div
      className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl ${styles.bg} ${styles.text} flex items-center justify-center font-bold border ${styles.border} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} />
        </div>
        {subtitle && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" />
            {subtitle}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl xl:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">{value}</h3>
      </div>
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br ${styles.glow} to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [allTransfers, setAllTransfers] = useState<Transfert[]>([]);
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [chartMetric, setChartMetric] = useState<'volume' | 'count'>('volume');

  const getStartDate = (p: Period): Date | null => {
    const now = new Date();
    if (p === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (p === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (p === 'month') {
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    return null;
  };

  const fetchData = async (currentPeriod: Period) => {
    try {
      setLoading(true);

      let transfersQuery = supabase.from('transferts')
        .select(`
          *,
          expediteur:clients!expediteur_id(fullname),
          destinataire:clients!destinataire_id(fullname),
          agent_envoi:agents!user_envoi(user_agent, agence_agens, agence:agence(nom))
        `)
        .order('date_transfert', { ascending: false });

      const startDate = getStartDate(currentPeriod);
      if (startDate) {
        transfersQuery = transfersQuery.gte('date_transfert', startDate.toISOString());
      } else {
        transfersQuery = transfersQuery.limit(500);
      }

      const [agenciesRes, villesRes, paysRes, transfersRes] = await Promise.all([
        supabase.from('agence').select('*'),
        supabase.from('ville').select('*'),
        supabase.from('pays').select('*'),
        transfersQuery
      ]);

      if (agenciesRes.error) throw agenciesRes.error;
      if (transfersRes.error) throw transfersRes.error;

      const villeMap: Record<number, any> = {};
      (villesRes.data || []).forEach(v => villeMap[v.id] = v);

      const paysMap: Record<number, Pays> = {};
      (paysRes.data || []).forEach(p => paysMap[p.id] = p);

      const enrichedAgencies = (agenciesRes.data || []).map(a => {
        const v = a.ville_agence ? villeMap[a.ville_agence] : null;
        const p = v?.pays ? paysMap[v.pays] : null;
        return { ...a, pays: p };
      });

      setAgencies(enrichedAgencies);

      const formattedTransfers = (transfersRes.data || []).map(t => ({
        ...t,
        expediteur_name: t.expediteur?.fullname || 'Inconnu',
        destinataire_name: t.destinataire?.fullname || 'Inconnu',
        agence_name: t.agent_envoi?.agence?.nom || 'Agence Inconnue',
        agence_id: t.agent_envoi?.agence_agens || null
      }));

      setAllTransfers(formattedTransfers);
    } catch (error: any) {
      console.error("Erreur Dashboard:", error);
      showToast('error', 'Erreur de chargement', 'Impossible de synchroniser le tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
  }, [period]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime-transfers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transferts' },
        () => {
          fetchData(period);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period]);

  const filteredTransfers = allTransfers;

  const stats = useMemo(() => {
    // Envois = transferts créés dans la période (entrées en caisse: montant + frais)
    const totalEnvoisMontant = filteredTransfers.reduce((acc, curr) => acc + curr.montant, 0);
    const totalFees = filteredTransfers.reduce((acc, curr) => acc + curr.frais, 0);
    const totalVolume = totalEnvoisMontant + totalFees;
    const pendingTransfers = filteredTransfers.filter(t => t.etat_trans).length;
    const servedTransfers = filteredTransfers.filter(t => !t.etat_trans).length;
    const activeAgencies = agencies.filter(a => !a.verrou).length;

    // Multi-devises local total
    let totalLocalMap: Record<string, { montant: number, symbole: string }> = {};
    filteredTransfers.forEach(t => {
      if (t.envoi_recu_local && t.envoi_recu_local > 0) {
        // Optionnel : groupement par monnaie si disponible
        const key = 'Local';
        if (!totalLocalMap[key]) totalLocalMap[key] = { montant: 0, symbole: '' };
        totalLocalMap[key].montant += t.envoi_recu_local;
      }
    });

    return { totalVolume, totalEnvoisMontant, totalFees, pendingTransfers, servedTransfers, activeAgencies, totalLocalMap };
  }, [filteredTransfers, agencies]);

  const chartData = useMemo(() => {
    const periodData: Record<string, { date: string, volume: number, count: number }> = {};
    const sorted = [...allTransfers].sort((a, b) =>
      new Date(a.date_transfert || "").getTime() - new Date(b.date_transfert || "").getTime()
    );

    sorted.forEach(t => {
      if (!t.date_transfert) return;
      const d = new Date(t.date_transfert);
      let dateStr = '';

      if (period === 'today') {
        dateStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (period === 'week' || period === 'month') {
        dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      } else {
        dateStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      }

      if (!periodData[dateStr]) {
        periodData[dateStr] = { date: dateStr, volume: 0, count: 0 };
      }
      periodData[dateStr].volume += (t.montant + (t.frais || 0));
      periodData[dateStr].count += 1;
    });

    return Object.values(periodData);
  }, [allTransfers, period]);

  const topAgencies = useMemo(() => {
    const agencyStats: Record<string, { name: string, volume: number, count: number }> = {};

    filteredTransfers.forEach(t => {
      const key = t.agence_id ? String(t.agence_id) : (t.agence_name || 'Inconnu');
      const name = t.agence_name || 'Inconnu';
      if (!agencyStats[key]) {
        agencyStats[key] = { name, volume: 0, count: 0 };
      }
      agencyStats[key].volume += (t.montant + (t.frais || 0));
      agencyStats[key].count += 1;
    });

    return Object.values(agencyStats)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [filteredTransfers]);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center flex-col gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
          <Zap size={24} className="text-indigo-600 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Chargement des données analytiques...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-16">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-[#0f0f23] p-6 sm:p-8 text-white border border-indigo-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Zap size={14} className="text-indigo-400 animate-pulse" />
              <span>Réseau BLD Trans Operational (Multi-Devises USD + Local)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
              Vue globale & performance du réseau
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {stats.activeAgencies} sur {agencies.length} agences actuellement en ligne. {stats.pendingTransfers} transaction(s) en attente de retrait.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shrink-0">
            {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  period === p
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Global'}
              </button>
            ))}
          </div>
        </div>

        {/* Decorative ambient light */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Volume Envois"
          value={`$${stats.totalEnvoisMontant.toLocaleString()}`}
          subtitle={`${filteredTransfers.length} ops`}
          icon={Wallet}
          colorScheme="indigo"
          delay="0"
        />
        <StatCard
          title="Transferts Servis"
          value={stats.servedTransfers.toString()}
          subtitle={`${Math.round(filteredTransfers.length / (period === 'today' ? 1 : period === 'week' ? 7 : 30))}/jour`}
          icon={Send}
          colorScheme="emerald"
          delay="100"
        />
        <StatCard
          title="Commissions Générées"
          value={`$${stats.totalFees.toLocaleString()}`}
          subtitle="Frais Réseau"
          icon={Activity}
          colorScheme="purple"
          delay="200"
        />
        <StatCard
          title="Trans. en Attente"
          value={stats.pendingTransfers.toString()}
          subtitle={stats.pendingTransfers > 0 ? "Action requise" : "À jour"}
          icon={Clock}
          colorScheme={stats.pendingTransfers > 0 ? "amber" : "emerald"}
          delay="300"
        />
      </div>

      {/* Analytics Charts & Top Agencies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-500" />
                <span>Évolution du Flux Financier</span>
              </h3>
              <p className="text-xs text-slate-400">Progression globale selon la période sélectionnée</p>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold text-slate-500">
              <button
                onClick={() => setChartMetric('volume')}
                className={`px-3 py-1.5 rounded-lg transition-all ${chartMetric === 'volume' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'hover:text-slate-900 dark:hover:text-white'}`}
              >
                Volume ($)
              </button>
              <button
                onClick={() => setChartMetric('count')}
                className={`px-3 py-1.5 rounded-lg transition-all ${chartMetric === 'count' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'hover:text-slate-900 dark:hover:text-white'}`}
              >
                Nombre ops
              </button>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.2} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f0f23',
                    borderColor: '#1e293b',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: any) => [chartMetric === 'volume' ? `$${Number(value).toLocaleString()}` : `${value} ops`, chartMetric === 'volume' ? 'Volume' : 'Transactions']}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#indigoGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Agencies Ranking */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <span>Top Agences</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">Par Volume</span>
            </div>

            <div className="space-y-5">
              {topAgencies.map((agency, idx) => (
                <div key={agency.name} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                    idx === 1 ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' :
                    idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                    'bg-slate-100 dark:bg-slate-900 text-slate-400'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{agency.name}</span>
                      <span className="font-mono font-bold text-slate-500 dark:text-slate-400">${agency.volume.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                        style={{ width: `${(agency.volume / (topAgencies[0]?.volume || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {topAgencies.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Aucune agence enregistrée</p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/agencies')}
            className="w-full mt-6 py-2.5 px-4 bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            <span>Voir le réseau d'agences</span>
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Activity Timeline / Recent Transactions Table */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Activity size={20} className="text-indigo-500" />
              <span>Dernières Opérations Réseau</span>
            </h3>
            <p className="text-xs text-slate-400">Activité en direct des transferts et dépôts</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span>Tout afficher</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Référence / Date</th>
                <th className="px-6 py-4">Expéditeur &rarr; Destinataire</th>
                <th className="px-6 py-4">Agence</th>
                <th className="px-6 py-4 text-right">Montant ($)</th>
                <th className="px-6 py-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {allTransfers.slice(0, 6).map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => navigate('/transactions')}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs block">{tx.code}</span>
                    <span className="text-[11px] text-slate-400">{tx.date_transfert ? new Date(tx.date_transfert).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{tx.expediteur_name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <ArrowRight size={12} className="text-slate-500" />
                      <span>{tx.destinataire_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tx.agence_name}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">${tx.montant.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block">+${tx.frais} frais</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {!tx.etat_trans ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={14} /> Payé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock size={14} /> En attente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;