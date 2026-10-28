import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, ArrowUpCircle, ArrowDownCircle, FileText, Loader2, ArrowLeftRight } from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  agencyName: string;
  tauxParDefaut?: number;
  monnaieLocale?: string;
  symboleLocal?: string;
}

type MovementType = 'report' | 'plus' | 'minus' | 'change';

const CashMovementModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  agencyName,
  tauxParDefaut = 1,
  monnaieLocale = 'FC',
  symboleLocal = 'FC'
}: CashMovementModalProps) => {
  const [type, setType] = useState<MovementType>('plus');
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Specific state for 'change'
  const [sensChange, setSensChange] = useState<'usd_vers_local' | 'local_vers_usd'>('usd_vers_local');
  const [tauxApplique, setTauxApplique] = useState<string>(tauxParDefaut ? tauxParDefaut.toString() : '1');
  const [montantLocalCalculated, setMontantLocalCalculated] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setMontant('');
      setMotif('');
      setError(null);
      setTauxApplique(tauxParDefaut ? tauxParDefaut.toString() : '1');
    }
  }, [isOpen, tauxParDefaut]);

  useEffect(() => {
    if (type === 'change') {
      const valUsd = parseFloat(montant) || 0;
      const taux = parseFloat(tauxApplique) || 1;
      setMontantLocalCalculated(valUsd * taux);
    }
  }, [montant, tauxApplique, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(montant);
    if (isNaN(val) || val <= 0) {
      setError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    if (type !== 'change' && !motif.trim()) {
      setError('Veuillez saisir un motif ou une description.');
      return;
    }

    if (type === 'change') {
      const taux = parseFloat(tauxApplique);
      if (isNaN(taux) || taux <= 0) {
        setError('Veuillez entrer un taux de change valide.');
        return;
      }

      try {
        await onSubmit({
          type: 'change',
          montant_usd: val,
          montant_local: montantLocalCalculated,
          sens: sensChange,
          taux_applique: taux,
          motif: motif || `Mouvement de change ${sensChange === 'usd_vers_local' ? 'USD vers Local' : 'Local vers USD'}`
        });
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue.');
      }
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
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-0.5">{agencyName}</p>
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
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'plus', label: 'Mouv +', icon: ArrowUpCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { id: 'minus', label: 'Mouv -', icon: ArrowDownCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              { id: 'report', label: 'Report', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { id: 'change', label: 'Change', icon: ArrowLeftRight, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id as MovementType)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                  type === item.id 
                    ? `border-indigo-500 ${item.bg} scale-105 shadow-md` 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                }`}
              >
                <item.icon size={20} className={type === item.id ? item.color : 'text-slate-400'} />
                <span className={`text-[9px] font-black uppercase tracking-wider ${type === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {type === 'change' && (
              <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <label className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block">
                  Sens de la Conversion
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSensChange('usd_vers_local')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      sensChange === 'usd_vers_local'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    💵 USD &rarr; 💴 {monnaieLocale}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSensChange('local_vers_usd')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      sensChange === 'local_vers_usd'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    💴 {monnaieLocale} &rarr; 💵 USD
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-4 mb-2 block">
                {type === 'change' ? 'Montant USD à convertir' : 'Montant ($)'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0.00"
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-lg font-black focus:border-indigo-500 outline-none transition-all shadow-inner font-mono"
              />
            </div>

            {type === 'change' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2 mb-1 block">Taux Appliqué</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tauxApplique}
                    onChange={(e) => setTauxApplique(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-black focus:border-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2 mb-1 block">
                    Équivalent Local ({symboleLocal})
                  </label>
                  <div className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-black font-mono flex items-center">
                    {montantLocalCalculated.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-4 mb-2 block">
                Motif / Description {type === 'change' ? '(Optionnel)' : ''}
              </label>
              <textarea
                required={type !== 'change'}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={type === 'report' ? "Report de solde journalier..." : type === 'change' ? "Précisez si besoin..." : "Précisez l'origine ou la nature..."}
                rows={2}
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-medium focus:border-indigo-500 outline-none transition-all shadow-inner resize-none"
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
