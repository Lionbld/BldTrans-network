import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Agence, Ville } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import AgencyModal from './modals/AgencyModal';
import {
  MapPin,
  Search,
  Plus,
  MoreVertical,
  X,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Loader2,
  Phone,
  Building,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import CashMovementModal from './modals/CashMovementModal';

const Agencies = () => {
  const { showToast } = useToast();
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAgency, setSelectedAgency] = useState<Agence | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: agenciesData, error: agenciesError } = await supabase
        .from('agence')
        .select('*')
        .order('id', { ascending: true });

      const { data: villesData } = await supabase
        .from('ville')
        .select('*');

      const { data: reportsData } = await supabase
        .from('daily_reports')
        .select('agence_id, closing_balance, date_report')
        .order('date_report', { ascending: false })
        .limit(100);

      const sourceReports = reportsData || [];

      const enriched = (agenciesData || []).map(a => {
        const latestReport = sourceReports.find(r => String(r.agence_id) === String(a.id));
        return {
          ...a,
          balance: latestReport ? Number(latestReport.closing_balance) : 0
        };
      });
      setAgencies(enriched);

      if (villesData) {
        setVilles(villesData);
      }
    } catch (e: any) {
      console.error("Erreur Agences:", e);
      showToast('error', 'Erreur réseau', e.message || 'Impossible de charger les agences.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedAgency(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agency: Agence) => {
    setModalMode('edit');
    setSelectedAgency(agency);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleAgencySubmit = async (formData: any) => {
    setIsSubmitting(true);

    const payload = {
      nom: formData.nom,
      adresse: formData.adresse,
      ville_agence: formData.ville_agence ? parseInt(formData.ville_agence) : null,
      phone: formData.phone,
      verrou: formData.verrou,
      limite_quotidienne: formData.limite_quotidienne !== '' ? parseFloat(formData.limite_quotidienne) : null
    };

    let error;
    if (modalMode === 'create') {
      const { error: err } = await supabase.from('agence').insert([payload]);
      error = err;
    } else {
      const { error: err } = await supabase.from('agence').update(payload).eq('id', selectedAgency?.id);
      error = err;
    }

    if (error) {
      showToast('error', 'Erreur agence', error.message);
    } else {
      showToast('success', 'Réseau mis à jour', `L'agence ${formData.nom} a été ${modalMode === 'create' ? 'créée' : 'modifiée'}.`);
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleToggleLock = async (agency: Agence) => {
    setActiveMenu(null);
    const { error } = await supabase
      .from('agence')
      .update({ verrou: !agency.verrou })
      .eq('id', agency.id);

    if (!error) {
      showToast('info', 'Statut modifié', `L'agence ${agency.nom} est désormais ${!agency.verrou ? 'verrouillée' : 'active'}.`);
      fetchData();
    } else {
      showToast('error', 'Action impossible', error.message);
    }
  };

  const handleOpenCash = (agency: Agence) => {
    setSelectedAgency(agency);
    setIsCashModalOpen(true);
    setActiveMenu(null);
  };

  const handleCashMovementSubmit = async (data: { type: string, montant: number, motif: string }) => {
    if (!selectedAgency) return;
    setIsSubmitting(true);

    try {
      let table = '';
      let payload: any = {
        montant: data.montant
      };

      if (data.type === 'report') {
        table = 'report';
        payload.agence_report = selectedAgency.id;
        payload.description = data.motif;
        payload.date_creation = new Date().toISOString();
      } else if (data.type === 'plus') {
        table = 'mouvementplus';
        payload.agence_mouvplus = selectedAgency.id;
        payload.motif = data.motif;
        payload.date_mouvement = new Date().toISOString();
      } else { // minus
        table = 'mouvementminus';
        payload.agence_mouvmoins = selectedAgency.id;
        payload.motif = data.motif;
        payload.date_mouvement = new Date().toISOString();
      }

      const { error } = await supabase.from(table).insert([payload]);
      
      if (error) throw error;

      showToast('success', 'Opération réussie', `Le mouvement de caisse a été enregistré pour ${selectedAgency.nom}.`);
      setIsCashModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Erreur CashMovement:", err);
      showToast('error', 'Erreur de sauvegarde', err.message || 'Impossible d\'enregistrer le mouvement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('agence').delete().eq('id', id);
    if (!error) {
      showToast('warning', 'Agence supprimée', 'L\'agence a été retirée du réseau.');
      fetchData();
    } else {
      showToast('error', 'Erreur suppression', error.message);
    }
    setIsSubmitting(false);
    setConfirmDeleteId(null);
  };

  const getVilleName = (id: number | null) => {
    if (!id) return 'Inconnue';
    return villes.find(v => v.id === id)?.name || `Ville #${id}`;
  };

  const filteredAgencies = agencies.filter(a =>
    a.nom?.toLowerCase().includes(search.toLowerCase()) ||
    a.adresse?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Réseau d'Agences</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest">Gérer les points de vente et statuts</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Nouvelle Agence</span>
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Rechercher une agence, une ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:border-primary-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="w-full md:w-auto">
          <select className="w-full md:w-auto px-6 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-primary-500 outline-none cursor-pointer">
            <option>Tous les statuts</option>
            <option>Opérationnel</option>
            <option>Suspendu</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="font-black uppercase tracking-widest text-xs">Chargement du réseau...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map((agency) => (
            <div key={agency.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${agency.verrou ? 'bg-red-50 dark:bg-red-900/10 text-red-500' : 'bg-primary-50 dark:bg-primary-900/10 text-primary-500'
                    }`}>
                    <Building size={28} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${!agency.verrou ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {!agency.verrou ? 'En ligne' : 'Off'}
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === agency.id ? null : agency.id); }}
                        className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {activeMenu === agency.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-20 py-2 overflow-hidden animate-scale-up">
                          <button
                            onClick={() => handleOpenEdit(agency)}
                            className="w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                          >
                            <Edit2 size={14} /> Modifier
                          </button>
                          <button
                            onClick={() => handleToggleLock(agency)}
                            className="w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                          >
                            {agency.verrou ? <Unlock size={14} /> : <Lock size={14} />}
                            {agency.verrou ? 'Activer' : 'Suspendre'}
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4"></div>
                          <button
                            onClick={() => setConfirmDeleteId(agency.id)}
                            className="w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4"></div>
                          <button
                            onClick={() => handleOpenCash(agency)}
                            className="w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 flex items-center gap-3 transition-colors"
                          >
                            <Wallet size={14} /> Gérer la Caisse
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                  {agency.nom}
                </h3>

                <div className="space-y-3 mb-8 mt-6">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                    <MapPin size={16} className="shrink-0 text-slate-400" />
                    <span className="truncate">{agency.adresse || 'N/A'}, {getVilleName(agency.ville_agence)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                    <Phone size={16} className="shrink-0 text-slate-400" />
                    <span>{agency.phone || 'Aucun contact'}</span>
                  </div>
                  {agency.limite_quotidienne !== null && (
                    <div className="flex items-center gap-3 text-primary-600 bg-primary-50 dark:bg-primary-900/10 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-primary-100/50">
                      <ShieldCheck size={14} className="shrink-0" />
                      <span>Limite : ${agency.limite_quotidienne.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t-2 border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Solde Caisse</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">${(agency.balance || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">ID Système</p>
                    <p className="text-sm font-mono font-black text-slate-300">#{agency.id.toString().padStart(4, '0')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AgencyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAgencySubmit}
        isSubmitting={isSubmitting}
        villes={villes}
        agency={selectedAgency}
        mode={modalMode}
      />

      <CashMovementModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        onSubmit={handleCashMovementSubmit}
        isSubmitting={isSubmitting}
        agencyName={selectedAgency?.nom || ''}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Supprimer l'agence ?"
        message="Attention : Cette action est irréversible. Les agents et historiques liés à cette agence pourraient être affectés."
        confirmLabel="Supprimer définitivement"
        type="danger"
        isLoading={isSubmitting}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Agencies;