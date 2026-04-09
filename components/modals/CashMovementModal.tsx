import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, ArrowUpCircle, ArrowDownCircle, FileText, Loader2 } from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  agencyName: string;
}

type MovementType = 'report' | 'plus' | 'minus';

const CashMovementModal = ({ isOpen, onClose, onSubmit, isSubmitting, agencyName }: CashMovementModalProps) => {
  const [type, setType] = useState<MovementType>('plus');
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMontant('');
      setMotif('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(montant);
    if (isNaN(val) || val <= 0) {
      setError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    if (!motif.trim()) {
      setError('Veuillez saisir un motif ou une description.');
      return;
    }

    try {
      await onSubmit({ type, montant: val, motif });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestion de Caisse</h2>
            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-widest mt-0.5">{agencyName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold animate-shake">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'plus', label: 'Mouv +', icon: ArrowUpCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { id: 'minus', label: 'Mouv -', icon: ArrowDownCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              { id: 'report', label: 'Report', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id as MovementType)}
                className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                  type === item.id 
                    ? `border-primary-500 ${item.bg} scale-105 shadow-lg` 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                }`}
              >
                <item.icon size={24} className={type === item.id ? item.color : 'text-slate-400'} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${type === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-4 mb-2 block">Montant ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0.00"
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-lg font-black focus:border-primary-500 outline-none transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-4 mb-2 block">Motif / Description</label>
              <textarea
                required
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={type === 'report' ? "Report de solde journalier..." : "Précisez l'origine ou la nature..."}
                rows={3}
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-medium focus:border-primary-500 outline-none transition-all shadow-inner resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Save size={18} className="group-hover:rotate-12 transition-transform" />
                <span>Enregistrer l'opération</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CashMovementModal;
