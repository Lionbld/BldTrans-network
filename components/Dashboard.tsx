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
  Filter,
  CheckCircle2,
  Clock
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
import { Transfert, Agence } from '../types';

type Period = 'today' | 'week' | 'month' | 'all';

const StatCard = ({
  title,
  value,
  trend,
  icon: Icon,
  colorClass,
  bgClass,
  delay = "0"
}: {
  title: string,
  value: string,
  trend?: string,
  icon: any,
  colorClass: string,
  bgClass: string,
  delay?: string
}) => (
  <div 
    className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-500 group relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div className={`w-14 h-14 ${bgClass} ${colorClass} rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform duration-500`}>
        <Icon size={28} />
      </div>
      {trend && (
        <span className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <TrendingUp size={10} className="text-emerald-500" />
          {trend}
        </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase mb-2">{title}</p>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h2>
    </div>
    {/* Decorative background shape */}
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${bgClass} opacity-[0.03] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [allTransfers, setAllTransfers] = useState<Transfert[]>([]);
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [agenciesRes, transfersRes] = await Promise.all([
        supabase.from('agence').select('*'),
        supabase.from('transferts')
          .select(`
            *,
            expediteur:clients!expediteur_id(fullname),
            destinataire:clients!destinataire_id(fullname),
            agent_envoi:agents!user_envoi(user_agent, agence:agence(nom))
          `)
          .order('date_transfert', { ascending: false })
          .limit(500)
      ]);

      if (agenciesRes.error) throw agenciesRes.error;
      if (transfersRes.error) throw transfersRes.error;

      setAgencies(agenciesRes.data || []);

      const formattedTransfers = (transfersRes.data || []).map(t => ({
        ...t,
        expediteur_name: t.expediteur?.fullname || 'Inconnu',
        destinataire_name: t.destinataire?.fullname || 'Inconnu',
        agence_name: t.agent_envoi?.agence?.nom || 'Agence Inconnue'
      }));

      setAllTransfers(formattedTransfers);
    } catch (error) {
      console.error("Erreur critique Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = useMemo(() => {
    if (period === 'all') return allTransfers;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let cutoff: Date;
    if (period === 'today') {
      cutoff = startOfToday;
    } else if (period === 'week') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else { // month
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    return allTransfers.filter(t => {
      if (!t.date_transfert) return false;
      return new Date(t.date_transfert) >= cutoff;
    });
  }, [allTransfers, period]);

  const stats = useMemo(() => {
    const totalVolume = filteredTransfers.reduce((acc, curr) => acc + curr.montant, 0);
    const totalFees = filteredTransfers.reduce((acc, curr) => acc + curr.frais, 0);
    const pendingTransfers = filteredTransfers.filter(t => !t.etat_trans).length;
    const activeAgencies = agencies.filter(a => !a.verrou).length;

    return { totalVolume, totalFees, pendingTransfers, activeAgencies };
  }, [filteredTransfers, agencies]);

  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string, volume: number, count: number }> = {};
    const sorted = [...allTransfers].sort((a, b) => 
      new Date(a.date_transfert || "").getTime() - new Date(b.date_transfert || "").getTime()
    );

    const last15DaysTransfers = sorted.filter(t => {
      if (!t.date_transfert) return false;
      const d = new Date(t.date_transfert);
      const diff = Date.now() - d.getTime();
      return diff <= 15 * 24 * 60 * 60 * 1000;
    });

    last15DaysTransfers.forEach(t => {
      if (!t.date_transfert) return;
      const dateStr = new Date(t.date_transfert).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, volume: 0, count: 0 };
      }
      dailyData[dateStr].volume += t.montant;
      dailyData[dateStr].count += 1;
    });

    return Object.values(dailyData);
  }, [allTransfers]);

  const topAgencies = useMemo(() => {
    const agencyStats: Record<string, { name: string, volume: number, count: number }> = {};
    
    filteredTransfers.forEach(t => {
      const name = t.agence_name || 'Inconnu';
      if (!agencyStats[name]) {
        agencyStats[name] = { name, volume: 0, count: 0 };
      }
      agencyStats[name].volume += t.montant;
      agencyStats[name].count += 1;
    });

    return Object.values(agencyStats)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [filteredTransfers]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-500 flex-col gap-4">
        <div className="relative">
          <div className="animate-spin h-16 w-16 border-4 border-primary-600 border-t-transparent rounded-full opacity-20"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity size={24} className="text-primary-600 animate-pulse" />
          </div>
        </div>
        <div className="space-y-1 text-center">
          <p className="font-black uppercase tracking-[0.3em] text-xs text-slate-900 dark:text-white">Synchronisation</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Chargement des données temps réel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-primary-600 rounded-full"></div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Performance</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] ml-5">
            Tableau de bord stratégique du réseau
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900/50 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-xl">
          {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Global'}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
          <button
            onClick={() => navigate('/transactions')}
            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={14} />
            Nouveau
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-primary-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden md:col-span-2 lg:col-span-1 group">
          <div className="relative z-10 h-full flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                <Wallet size={28} className="text-primary-400" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-sm text-emerald-300">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> {period.toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase mb-2">Volume Total</p>
              <h2 className="text-4xl font-black tracking-tighter">${stats.totalVolume.toLocaleString()}</h2>
            </div>
          </div>
          <CreditCard className="absolute -right-10 -bottom-10 opacity-10 w-48 h-48 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700 blur-[1px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        </div>

        <StatCard
          title="Transactions"
          value={filteredTransfers.length.toString()}
          trend={`${Math.round(filteredTransfers.length / (period === 'today' ? 1 : period === 'week' ? 7 : 30))} / j`}
          icon={Send}
          colorClass="text-blue-600"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
          delay="100"
        />
        <StatCard
          title="Commissions"
          value={`$${stats.totalFees.toLocaleString()}`}
          trend="Profit Net"
          icon={Activity}
          colorClass="text-purple-600"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
          delay="200"
        />
        <StatCard
          title="En Attente"
          value={stats.pendingTransfers.toString()}
          trend="Priorité"
          icon={Clock}
          colorClass={stats.pendingTransfers > 0 ? "text-amber-600" : "text-emerald-600"}
          bgClass={stats.pendingTransfers > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}
          delay="300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-500" /> Flux Financier (15 Jours)
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">Analyse de la tendance des volumes</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
              <span className="px-4 py-1.5 bg-white dark:bg-slate-900 rounded-full shadow-sm">Volume ($)</span>
              <span className="px-4 py-1.5 opacity-40">Transactions</span>
            </div>
          </div>
          
          <div className="h-[300px] w-full mt-4 -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: 'none', 
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ borderBottom: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col">
          <div className="mb-8">
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" /> Top Agences
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight pr-4">Classement par volume généré</p>
          </div>

          <div className="flex-grow space-y-6">
            {topAgencies.map((agency, idx) => (
              <div key={agency.name} className="flex items-center gap-4 group">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${
                  idx === 0 ? 'bg-amber-100 text-amber-600' :
                  idx === 1 ? 'bg-slate-100 text-slate-500' :
                  idx === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-slate-50 text-slate-400'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase truncate pr-4">{agency.name}</span>
                    <span className="text-[10px] font-black text-slate-400">${agency.volume.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-600 rounded-full transition-all duration-1000"
                      style={{ width: `${(agency.volume / (topAgencies[0]?.volume || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {topAgencies.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase opacity-50">
                Aucune donnée
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/agencies')}
            className="mt-8 text-[9px] font-black uppercase tracking-[0.2em] text-primary-600 hover:text-primary-700 flex items-center justify-center gap-2 py-3 border border-dashed border-primary-200 dark:border-primary-900/50 rounded-2xl hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
          >
            Détails Réseau <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
              <Activity size={16} className="text-primary-500" /> Journal d'Activité
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">Dernières opérations enregistrées</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-primary-600 text-[10px] font-black hover:underline flex items-center gap-2 uppercase tracking-widest bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-xl hover:bg-primary-100 transition-all border border-primary-100 dark:border-primary-900/30"
          >
            Historique Complet <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
              <tr>
                <th className="px-8 py-6">Réf / Agence</th>
                <th className="px-8 py-6 border-l border-slate-200 dark:border-slate-700/50">Flux Financier</th>
                <th className="px-8 py-6 text-right">Montant</th>
                <th className="px-8 py-6 text-center">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allTransfers.slice(0, 5).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => navigate('/transactions')}>
                  <td className="px-8 py-6">
                    <div className="font-mono text-[11px] font-black text-primary-600 mb-1 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
                      {tx.code}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight ml-3">{tx.agence_name}</div>
                  </td>
                  <td className="px-8 py-6 border-l border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10 group-hover:bg-primary-50/10 transition-colors">
                    <div className="flex flex-col justify-center">
                      <span className="text-slate-900 dark:text-white font-black text-[13px] uppercase tracking-tight leading-tight">
                        {tx.expediteur_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-1.5 tracking-tight flex items-center gap-2">
                        <ArrowRight size={10} className="text-slate-300" />
                        <span className="uppercase text-slate-500 dark:text-slate-400">{tx.destinataire_name}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="font-black text-slate-900 dark:text-white text-base tracking-tight">${tx.montant.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5">${tx.frais.toLocaleString()} frais</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center">
                      {tx.etat_trans ? (
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Récupéré
                        </span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={12} /> En Attente
                        </span>
                      )}
                    </div>
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