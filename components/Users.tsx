import React, { useEffect, useState } from 'react';
import { supabase, createIsolatedAuthClient } from '../supabaseClient';
import { Agent, Agence } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import UserModal from './modals/UserModal';
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Shield,
  ShieldAlert,
  Send,
  Mail,
  Phone,
  Building,
  User,
  Loader2,
  Lock,
  UserCheck,
  KeyRound
} from 'lucide-react';

const Users = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  // Stats
  const [envoisCountMap, setEnvoisCountMap] = useState<Record<number, number>>({});
  const [servicesCountMap, setServicesCountMap] = useState<Record<number, number>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: agentsData, error: agentsError } = await supabase.from('agents').select('*');
      const { data: agenciesData } = await supabase.from('agence').select('*');

      // Fetch all time counts or just for a month? User asked for 1 month initially, then "simple".
      // Let's fetch all time for simplicity, or we can filter by current month.
      const currentMonthStr = new Date().toISOString().substring(0, 7);
      
      const { data: envoisData } = await supabase
        .from('transferts')
        .select('user_envoi')
        .gte('date_transfert', `${currentMonthStr}-01`);

      const { data: servicesData } = await supabase
        .from('transferts')
        .select('user_servi')
        .eq('etat_trans', false)
        .gte('date_servi', `${currentMonthStr}-01`);

      const eCount: Record<number, number> = {};
      (envoisData || []).forEach((t: any) => {
        if (t.user_envoi) eCount[t.user_envoi] = (eCount[t.user_envoi] || 0) + 1;
      });

      const sCount: Record<number, number> = {};
      (servicesData || []).forEach((t: any) => {
        if (t.user_servi) sCount[t.user_servi] = (sCount[t.user_servi] || 0) + 1;
      });

      setEnvoisCountMap(eCount);
      setServicesCountMap(sCount);

      if (agentsError) throw agentsError;

      setAgents(agentsData || []);
      setAgencies(agenciesData || []);

    } catch (e: any) {
      console.error("Erreur Users:", e);
      showToast('error', 'Erreur réseau', e.message || 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedAgent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agent: Agent) => {
    setModalMode('edit');
    setSelectedAgent(agent);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleUserSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      if (modalMode === 'create') {
        if (!formData.password || formData.password.length < 6) {
          showToast('error', 'Mot de passe invalide', 'Le mot de passe doit comporter au moins 6 caractères.');
          setIsSubmitting(false);
          return;
        }

        // 1. Créer le compte utilisateur Supabase Auth via un client isolé (évite la déconnexion de l'Admin)
        const isolatedAuthClient = createIsolatedAuthClient();
        const { data: authData, error: authErr } = await isolatedAuthClient.auth.signUp({
          email: formData.email,
          password: formData.password
        });

        if (authErr) {
          showToast('error', 'Erreur création compte', authErr.message);
          setIsSubmitting(false);
          return;
        }

        const newUserId = authData.user?.id;
        if (!newUserId) {
          showToast('error', 'Erreur création compte', 'Impossible d\'obtenir l\'ID utilisateur Supabase Auth.');
          setIsSubmitting(false);
          return;
        }

        // 2. Créer l'enregistrement correspondant dans public.agents lié au user_id officiel
        const payload = {
          user_id: newUserId,
          user_agent: formData.user_agent,
          email: formData.email,
          phone: formData.phone,
          agence_agens: formData.agence_agens ? parseInt(formData.agence_agens) : null,
          envoi: formData.envoi,
          admin: formData.admin,
          superadmin: formData.superadmin,
          created_at: new Date().toISOString()
        };

        const { error: dbErr } = await supabase.from('agents').insert([payload]);

        if (dbErr) {
          showToast('error', 'Erreur profil agent', dbErr.message);
        } else {
          showToast('success', 'Agent créé', `Le compte de ${formData.user_agent} a été inscrit et activé avec succès.`);
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        // Mode Modification du profil agent
        const payload = {
          user_agent: formData.user_agent,
          email: formData.email,
          phone: formData.phone,
          agence_agens: formData.agence_agens ? parseInt(formData.agence_agens) : null,
          envoi: formData.envoi,
          admin: formData.admin,
          superadmin: formData.superadmin
        };

        const { error: err } = await supabase.from('agents').update(payload).eq('id', selectedAgent?.id);

        if (err) {
          showToast('error', 'Erreur agent', err.message);
        } else {
          showToast('success', 'Utilisateur à jour', `Le profil de ${formData.user_agent} a été mis à jour.`);
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err: any) {
      showToast('error', 'Erreur inattendue', err.message || 'Une erreur s\'est produite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) {
      showToast('error', 'Email manquant', 'Cet agent n\'a pas d\'adresse email enregistrée.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showToast('success', 'Email envoyé', `Un lien de réinitialisation de mot de passe a été envoyé à ${email}.`);
    } catch (err: any) {
      showToast('error', 'Erreur réinitialisation', err.message || 'Impossible d\'envoyer l\'email de réinitialisation.');
    } finally {
      setActiveMenu(null);
    }
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    // Traçabilité : On ne supprime pas l'agent pour conserver l'historique de ses envois/services.
    // On révoque tous ses droits de connexion et d'opération (envoi, admin, superadmin).
    const { error } = await supabase.from('agents').update({
      envoi: false,
      admin: false,
      superadmin: false,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (!error) {
      showToast('warning', 'Accès révoqué', 'Les accès de cet agent ont été suspendus tout en conservant son historique d\'opérations.');
      fetchData();
    } else {
      showToast('error', 'Erreur révocation', error.message);
    }
    setIsSubmitting(false);
    setConfirmDeleteId(null);
  };

  const getAgenceName = (id: number | null) => {
    if (!id) return 'Non assigné';
    return agencies.find(a => a.id === id)?.nom || `Agence #${id}`;
  };

  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'envoi' | 'read_only'>('all');

  const filteredAgents = agents.filter(a => {
    const matchesSearch =
      (a.user_agent?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (a.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (a.phone?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesAgency = agencyFilter === 'all' || String(a.agence_agens) === agencyFilter;

    let matchesRole = true;
    if (roleFilter === 'admin') matchesRole = a.admin || a.superadmin;
    else if (roleFilter === 'envoi') matchesRole = a.envoi && !a.admin && !a.superadmin;
    else if (roleFilter === 'read_only') matchesRole = !a.envoi && !a.admin && !a.superadmin;

    return matchesSearch && matchesAgency && matchesRole;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
            Gestion des Utilisateurs
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Administrer les comptes agents et leurs privilèges d'accès ({agents.length} membres)
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary shrink-0 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Ajouter un Agent</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom d'agent, email, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {/* Dropdown Filtre Agence */}
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Toutes les agences</option>
            {agencies.map(ag => (
              <option key={ag.id} value={ag.id}>{ag.nom}</option>
            ))}
          </select>

          {/* Buttons Filtre Rôle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setRoleFilter('envoi')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'envoi'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Envois
            </button>
          </div>
        </div>
      </div>

      {/* Users Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-xs font-bold uppercase tracking-widest">Chargement des comptes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="glass-card rounded-3xl p-6 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div>
                {/* User Top Card */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-base flex items-center justify-center shadow-md font-mono">
                    {agent.user_agent ? agent.user_agent.substring(0, 2).toUpperCase() : 'AG'}
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === agent.id ? null : agent.id); }}
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenu === agent.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0f0f23] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-30 py-2 animate-scale-up">
                        <button
                          onClick={() => handleOpenEdit(agent)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                        >
                          <Edit2 size={14} className="text-indigo-500" /> Modifier profil
                        </button>
                        <button
                          onClick={() => handleResetPassword(agent.email)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2.5 transition-colors"
                        >
                          <KeyRound size={14} /> Réinitialiser mot de passe
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                        <button
                          onClick={() => setConfirmDeleteId(agent.id)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                        >
                          <Trash2 size={14} /> Supprimer agent
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                  {agent.user_agent || 'Sans nom'}
                </h3>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  <Building size={14} />
                  <span>{getAgenceName(agent.agence_agens)}</span>
                </div>

                <div className="space-y-2 mt-4 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>{agent.phone || 'Aucun téléphone'}</span>
                  </div>
                </div>
              </div>

              {/* Badges Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5 mt-6">
                {agent.superadmin && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <ShieldAlert size={12} /> SuperAdmin
                  </span>
                )}
                {agent.admin && !agent.superadmin && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Shield size={12} /> Admin
                  </span>
                )}
                {agent.envoi && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                    <Send size={12} /> Envois
                  </span>
                )}
                {!agent.envoi && !agent.admin && !agent.superadmin && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20 flex items-center gap-1">
                    <Lock size={12} /> Lecture seule
                  </span>
                )}
              </div>

              {/* Stats Footer */}
              <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-1.5" title="Envois du mois">
                  <Send size={14} className="text-indigo-400" />
                  <span>{envoisCountMap[agent.id] || 0} envois</span>
                </div>
                <div className="flex items-center gap-1.5" title="Services du mois">
                  <UserCheck size={14} className="text-emerald-400" />
                  <span>{servicesCountMap[agent.id] || 0} servis</span>
                </div>
              </div>
            </div>
          ))}

          {filteredAgents.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              <User size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Aucun agent ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUserSubmit}
        isSubmitting={isSubmitting}
        agencies={agencies}
        agent={selectedAgent}
        mode={modalMode}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Désactiver cet agent ?"
        message="Pour préserver la traçabilité des transferts et de l'historique comptable, les accès (envois & administration) de cet agent seront révoqués sans supprimer sa fiche."
        confirmLabel="Révoquer les Accès"
        type="danger"
        isLoading={isSubmitting}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Users;