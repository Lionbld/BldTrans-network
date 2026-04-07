import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Agent, Agence } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import UserModal from './modals/UserModal';
import {
  Search,
  Plus,
  MoreVertical,
  X,
  Edit2,
  Trash2,
  Shield,
  ShieldAlert,
  Send,
  Mail,
  Phone,
  Building,
  User,
  CheckCircle2,
  Loader2,
  Lock
} from 'lucide-react';

const Users = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

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

    const payload = {
      user_agent: formData.user_agent,
      email: formData.email,
      phone: formData.phone,
      agence_agens: formData.agence_agens ? parseInt(formData.agence_agens) : null,
      envoi: formData.envoi,
      admin: formData.admin,
      superadmin: formData.superadmin,
      updated_at: new Date().toISOString()
    };

    let error;
    if (modalMode === 'create') {
      const { error: err } = await supabase.from('agents').insert([{
        ...payload,
        created_at: new Date().toISOString(),
        user_id: crypto.randomUUID()
      }]);
      error = err;
    } else {
      const { error: err } = await supabase.from('agents').update(payload).eq('id', selectedAgent?.id);
      error = err;
    }

    if (error) {
      showToast('error', 'Erreur agent', error.message);
    } else {
      showToast('success', 'Utilisateur à jour', `Le profil de ${formData.user_agent} a été enregistré.`);
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (!error) {
      showToast('warning', 'Utilisateur supprimé', 'Compte agent révoqué avec succès.');
      fetchData();
    } else {
      showToast('error', 'Erreur suppression', error.message);
    }
    setIsSubmitting(false);
    setConfirmDeleteId(null);
  };

  const getAgenceName = (id: number | null) => {
    if (!id) return 'Non assigné';
    return agencies.find(a => a.id === id)?.nom || `Agence #${id}`;
  };

  const filteredAgents = agents.filter(a =>
    (a.user_agent?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (a.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gestion Utilisateurs</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest">Administrer les accès et permissions du réseau</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Inscrire Nvel Agent</span>
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Rechercher un membre par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:border-primary-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="font-black uppercase tracking-widest text-xs">Synchronisation des membres...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner overflow-hidden border border-slate-100 dark:border-slate-800">
                    {agent.user_agent ? (
                      <span className="text-2xl font-black text-primary-600 dark:text-primary-400 uppercase">{agent.user_agent.substring(0, 2)}</span>
                    ) : <User size={28} className="text-slate-400" />}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === agent.id ? null : agent.id); }}
                      className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-200"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeMenu === agent.id && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-20 py-2 overflow-hidden animate-scale-up">
                        <button
                          onClick={() => handleOpenEdit(agent)}
                          className="w-full text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                        >
                          <Edit2 size={16} className="text-primary-500" /> Modifier Profil
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4"></div>
                        <button
                          onClick={() => setConfirmDeleteId(agent.id)}
                          className="w-full text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                        >
                          <Trash2 size={16} /> Supprimer Agent
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight truncate">
                  {agent.user_agent || 'Sans Nom'}
                </h3>
                <p className="text-[10px] font-black text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg inline-block uppercase tracking-widest mb-6 border border-primary-100/50">
                  <Building size={10} className="inline mr-1" /> {getAgenceName(agent.agence_agens)}
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-slate-400" />
                    </div>
                    <span className="truncate">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Phone size={14} className="text-slate-400" />
                    </div>
                    <span>{agent.phone || 'Aucun contact'}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                  {agent.superadmin && (
                    <span className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-amber-100">
                      <ShieldAlert size={12} /> SuperAdmin
                    </span>
                  )}
                  {agent.admin && !agent.superadmin && (
                    <span className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-purple-100">
                      <Shield size={12} /> Admin Agence
                    </span>
                  )}
                  {agent.envoi && (
                    <span className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-blue-100">
                      <Send size={12} /> Droit Envoi
                    </span>
                  )}
                  {!agent.envoi && !agent.admin && !agent.superadmin && (
                    <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Lock size={12} /> Consultation Seule
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
        title="Supprimer cet agent ?"
        message="Attention : Vous êtes sur le point de révoquer l'accès de cet utilisateur. Cette action l'empêchera de se connecter immédiatement."
        confirmLabel="Révoquer l'Accès"
        type="danger"
        isLoading={isSubmitting}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Users;