import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Send,
  CreditCard,
  Building,
  Plus,
  ArrowRight,
  Wallet,
  Activity
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Transfert, Agence } from '../types';

const StatCard = ({
  title,
  value,
  trend,
  icon: Icon,
  colorClass,
  bgClass
}: {
  title: string,
  value: string,
  trend?: string,
  icon: any,
  colorClass: string,
  bgClass: string
}) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 ${bgClass} ${colorClass} rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform`}>
        <Icon size={28} />
      </div>
      {trend && (
        <span className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-500">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase mb-2">{title}</p>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h2>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfert[]>([]);
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);

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
          .limit(5)
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

      setTransfers(formattedTransfers);
    } catch (error) {
      console.error("Erreur critique Dashboard:", error);
      // En production, on pourrait afficher un message d'erreur plus explicite ici
    } finally {
      setLoading(false);
    }
  };


  const totalVolume = transfers.reduce((acc, curr) => acc + curr.montant, 0);
  const totalFees = transfers.reduce((acc, curr) => acc + curr.frais, 0);
  const activeAgencies = agencies.filter(a => !a.verrou).length;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-500 flex-col gap-4">
        <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        <p className="font-black uppercase tracking-widest text-xs">Chargement du Tableau de Bord...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Vue d'ensemble</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Performance du réseau en temps réel
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/transactions')}
            className="px-6 py-4 bg-primary-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Nouveau Transfert
          </button>
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Main Volume Card */}
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-primary-900/20 relative overflow-hidden md:col-span-2 lg:col-span-1 group cursor-default">
          <div className="relative z-10 h-full flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Wallet size={24} className="text-white" />
              </div>
              <span className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-sm text-emerald-300">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Live
              </span>
            </div>
            <div>
              <p className="text-primary-200 text-[10px] font-black tracking-[0.2em] uppercase mb-2">Volume Global</p>
              <h2 className="text-4xl font-black tracking-tighter">${totalVolume.toLocaleString()}</h2>
            </div>
          </div>
          <CreditCard className="absolute -right-6 -bottom-6 opacity-10 w-40 h-40 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500" />
        </div>

        <StatCard
          title="Transactions"
          value={transfers.length.toString()}
          trend="Flux Récents"
          icon={Send}
          colorClass="text-blue-600"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="Commissions"
          value={`$${totalFees.toLocaleString()}`}
          trend="Revenus Nets"
          icon={Activity}
          colorClass="text-purple-600"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          title="Réseau Actif"
          value={activeAgencies.toString()}
          trend={`${agencies.length} Total`}
          icon={Building}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50 dark:bg-emerald-900/20"
        />
      </div>

      {/* Recent Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
            <Activity size={16} className="text-primary-500" /> Activité Récente
          </h3>
          <button
            onClick={() => navigate('/transactions')}
            className="text-primary-600 text-[10px] font-black hover:underline flex items-center gap-1 uppercase tracking-widest bg-primary-50 px-3 py-1.5 rounded-xl hover:bg-primary-100 transition-colors"
          >
            Tout voir <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
              <tr>
                <th className="px-8 py-6">Réf / Agence</th>
                <th className="px-8 py-6 border-l-2 border-primary-500/10 pl-8">Flux Financier</th>
                <th className="px-8 py-6 text-right">Montant</th>
                <th className="px-8 py-6 text-center">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transfers.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => navigate('/transactions')}>
                  <td className="px-8 py-6">
                    <div className="font-mono text-xs font-black text-primary-600 mb-1">{tx.code}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{tx.agence_name}</div>
                  </td>
                  {/* Column: FLUX FINANCIER (Highlighted) */}
                  <td className="px-8 py-6 border-l-2 border-primary-500/10 bg-slate-50/30 dark:bg-slate-800/20 group-hover:bg-primary-50/10 transition-colors">
                    <div className="flex flex-col justify-center h-full">
                      {/* Top Line: Sender Name (Bold) */}
                      <span className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight leading-tight">
                        {tx.expediteur_name}
                      </span>
                      {/* Bottom Line: "vers Beneficiary" (Gray) */}
                      <span className="text-[10px] text-slate-400 font-bold mt-1.5 tracking-tight flex items-center gap-1">
                        <span className="opacity-70">vers</span>
                        <span className="uppercase text-slate-500 dark:text-slate-400">{tx.destinataire_name}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white text-lg tracking-tight">${tx.montant.toLocaleString()}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${tx.etat_trans
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                      {tx.etat_trans ? 'Terminé' : 'Attente'}
                    </span>
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