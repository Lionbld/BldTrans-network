import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Agence, Ville } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import AgencyModal from './modals/AgencyModal';
import CashMovementModal from './modals/CashMovementModal';
import {
  MapPin,
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Phone,
  Building,
  ShieldCheck,
  Wallet,
  CheckCircle,
  AlertCircle,
  Filter,
  Users
} from 'lucide-react';

const Agencies = () => {
  const { showToast } = useToast();
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'locked'>('all');
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
        .from('report')
        .select('agence_report, montant, date_creation')
        .order('date_creation', { ascending: false });

      // Calculer le chiffre d'affaires (volume envois + services) du jour par agence
      const todayStr = new Date().toISOString().substring(0, 10);
      const { data: todayTransfers } = await supabase
        .from('transferts')
        .select('montant, agent_envoi:agents!user_envoi(agence_agens)')
        .gte('date_transfert', todayStr);

      const volumeByAgency: Record<number, number> = {};
      (todayTransfers || []).forEach((t: any) => {
        const agId = t.agent_envoi?.agence_agens;
        if (agId) {
          volumeByAgency[agId] = (volumeByAgency[agId] || 0) + Number(t.montant || 0);
        }
      });

      const { data: agentsData } = await supabase
        .from('agents')
        .select('agence_agens');

      const agentsCountMap: Record<number, number> = {};
      (agentsData || []).forEach(ag => {
        if (ag.agence_agens) {
          agentsCountMap[ag.agence_agens] = (agentsCountMap[ag.agence_agens] || 0) + 1;
        }
      });

      const sourceReports = reportsData || [];
      const todayLocalStr = new Date().toLocaleDateString('sv'); // Format YYYY-MM-DD local

      const enriched = (agenciesData || []).map(a => {
        // Chercher le report du matin enregistré AUJOURD'HUI dans la table 'report'
        const todayReport = sourceReports.find(r => {
          if (String(r.agence_report) !== String(a.id) || !r.date_creation) return false;
          const repDate = String(r.date_creation).substring(0, 10);
          return repDate === todayStr || repDate === todayLocalStr;
        });

        const latestReport = sourceReports.find(r => String(r.agence_report) === String(a.id));

        return {
          ...a,
          balance: a.balance ?? (latestReport ? Number(latestReport.montant) : 0),
          report_matin: todayReport ? Number(todayReport.montant) : 0,
          volume_today: volumeByAgency[a.id] || 0,
          agents_count: agentsCountMap[a.id] || 0
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

      if (data.type === 'report') {
        try {
          await supabase.functions.invoke('push-notification', {
            body: {
              is_report_event: true,
              agence_id: selectedAgency.id,
              montant: payload.montant
            }
          });
        } catch (e) {
          console.error("Erreur appel push-notification:", e);
        }
      }

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
    // Conservation de la traçabilité : on ne supprime pas l'agence, on la verrouille/désactive
    const { error } = await supabase.from('agence').update({ verrou: true }).eq('id', id);
    if (!error) {
      showToast('warning', 'Agence suspendue', 'L\'agence a été verrouillée pour conserver la traçabilité des opérations.');
      fetchData();
    } else {
      showToast('error', 'Erreur de suspension', error.message);
    }
    setIsSubmitting(false);
    setConfirmDeleteId(null);
  };

  const getVilleName = (id: number | null) => {
    if (!id) return 'Inconnue';
    return villes.find(v => v.id === id)?.name || `Ville #${id}`;
  };

  const filteredAgencies = agencies.filter(a => {
    const matchesSearch =
      a.nom?.toLowerCase().includes(search.toLowerCase()) ||
      a.adresse?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'online' ? !a.verrou :
      a.verrou;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
            Points de Vente & Agences
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Superviser et administrer les {agencies.length} agences du réseau BLD Trans
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary shrink-0 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Nouvelle Agence</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom d'agence, adresse, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter size={16} className="text-slate-400 ml-2 hidden sm:block shrink-0" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Toutes ({agencies.length})
          </button>
          <button
            onClick={() => setStatusFilter('online')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            En ligne ({agencies.filter(a => !a.verrou).length})
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'locked'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Suspendues ({agencies.filter(a => a.verrou).length})
          </button>
        </div>
      </div>

      {/* Agencies Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-xs font-bold uppercase tracking-widest">Chargement du réseau d'agences...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map((agency) => (
            <div
              key={agency.id}
              className="glass-card rounded-3xl p-6 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div>
                {/* Card Top Action & Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                    agency.verrou ? 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-500/20' : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-500/20'
                  }`}>
                    <Building size={24} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      !agency.verrou
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${!agency.verrou ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                      {!agency.verrou ? 'Opérationnelle' : 'Verrouillée'}
                    </span>

                    {/* Context Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === agency.id ? null : agency.id); }}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeMenu === agency.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0f0f23] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-30 py-2 animate-scale-up">
                          <button
                            onClick={() => handleOpenEdit(agency)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                          >
                            <Edit2 size={14} className="text-indigo-500" /> Modifier fiche
                          </button>
                          <button
                            onClick={() => handleToggleLock(agency)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                          >
                            {agency.verrou ? <Unlock size={14} className="text-emerald-500" /> : <Lock size={14} className="text-amber-500" />}
                            {agency.verrou ? 'Déverrouiller' : 'Suspendre agence'}
                          </button>
                          <button
                            onClick={() => handleOpenCash(agency)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2.5 transition-colors"
                          >
                            <Wallet size={14} /> Mouvement de caisse
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                          <button
                            onClick={() => setConfirmDeleteId(agency.id)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agency Title */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {agency.nom}
                </h3>
                <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">ID: #{agency.id.toString().padStart(4, '0')}</p>

                {/* Info List */}
                <div className="space-y-2.5 my-6">
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 text-xs">
                    <MapPin size={15} className="text-slate-400 shrink-0" />
                    <span className="truncate">{agency.adresse || 'Adresse non renseignée'}, {getVilleName(agency.ville_agence)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 text-xs">
                    <Phone size={15} className="text-slate-400 shrink-0" />
                    <span>{agency.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 text-xs">
                    <Users size={15} className="text-slate-400 shrink-0" />
                    <span>{agency.agents_count || 0} agent{(agency.agents_count || 0) > 1 ? 's' : ''} rattaché{(agency.agents_count || 0) > 1 ? 's' : ''}</span>
                  </div>
                  {agency.limite_quotidienne !== null && (
                    <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl text-xs font-semibold border border-indigo-500/20">
                      <ShieldCheck size={14} />
                      <span>Limite : ${agency.limite_quotidienne.toLocaleString()}/jour</span>
                    </div>
                  )}
                </div>

                {/* Metrics Grid (Report Matin & Chiffre du jour) */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Report Matin</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">${(agency.report_matin || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">C.A du Jour</span>
                    <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-300 text-sm">${(agency.volume_today || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Balance Bottom Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Solde Caisse Estimé</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">${(agency.balance || 0).toLocaleString()}</span>
                </div>
                <button
                  onClick={() => handleOpenCash(agency)}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="Gérer la caisse"
                >
                  <Wallet size={16} />
                </button>
              </div>
            </div>
          ))}

          {filteredAgencies.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Building size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Aucune agence ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
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
        title="Désactiver l'agence ?"
        message="Pour conserver l'historique financier et la traçabilité des opérations, l'agence ne sera pas supprimée mais verrouillée/suspendue."
        confirmLabel="Désactiver l'agence"
        type="danger"
        isLoading={isSubmitting}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Agencies;