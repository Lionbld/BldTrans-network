import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Loader2, Calendar, RefreshCcw, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { MouvementChange } from '../../types';

interface ExchangeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenceId: number | null;
  agenceName: string;
}

const ExchangeHistoryModal = ({ isOpen, onClose, agenceId, agenceName }: ExchangeHistoryModalProps) => {
  const [movements, setMovements] = useState<MouvementChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen && agenceId) {
      fetchHistory();
    }
  }, [isOpen, agenceId, startDate, endDate]);

  const fetchHistory = async () => {
    if (!agenceId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('mouvement_change')
        .select('*')
        .eq('agence_id', agenceId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements(data || []);
    } catch (e) {
      console.error('Erreur chargement historique change:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Historique des Changes</h2>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-0.5">{agenceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Date Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/40 flex flex-wrap items-center gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none"
              placeholder="Date début"
            />
          </div>
          <span className="text-slate-400 font-bold">&rarr;</span>
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none"
              placeholder="Date fin"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              Réinitialiser
            </button>
          )}
          <button
            onClick={fetchHistory}
            className="p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-colors"
            title="Actualiser"
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        {/* Body Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-xs font-bold uppercase tracking-wider">Chargement des opérations...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ArrowLeftRight size={40} className="mx-auto opacity-30" />
              <p className="text-xs font-semibold">Aucun mouvement de change enregistré pour cette période.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date & Heure</th>
                    <th className="px-4 py-3">Sens de l'opération</th>
                    <th className="px-4 py-3 text-right">Montant USD</th>
                    <th className="px-4 py-3 text-right">Montant Local</th>
                    <th className="px-4 py-3 text-right">Taux Appliqué</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-500 font-sans">
                        {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        {m.sens === 'usd_vers_local' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            💵 USD &rarr; 💴 Local
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            💴 Local &rarr; 💵 USD
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        ${fmt(m.montant_usd)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {fmt(m.montant_local)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {fmt(m.taux_applique)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExchangeHistoryModal;
