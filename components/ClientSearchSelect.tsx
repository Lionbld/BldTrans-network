import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../types';
import { Search, ChevronDown, Check, X, Phone } from 'lucide-react';

interface ClientSearchSelectProps {
  clients: Client[];
  value: string;
  defaultName?: string; // Nom par défaut si le client n'est pas encore chargé dans la liste des clients
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  onNewClient?: () => void;
  labelColor?: string;
  excludeId?: string; // ID à exclure des résultats (pour éviter le même client en expéditeur & bénéficiaire)
}

export default function ClientSearchSelect({ 
    clients, 
    value, 
    defaultName,
    onChange, 
    placeholder = "Rechercher par Nom ou Téléphone...",
    label,
    onNewClient,
    labelColor = "text-primary-600",
    excludeId
}: ClientSearchSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Client actuellement sélectionné (recherche par c.ids OU c.id)
  const selectedClient = value 
    ? clients.find(c => String(c.ids) === String(value) || String(c.id) === String(value))
    : undefined;

  // Un client est sélectionné dès que value est non vide et différent de '0'
  const hasSelection = Boolean(value && String(value).trim() !== '' && String(value) !== '0');
  const displayName = selectedClient?.fullname || defaultName || (hasSelection ? `Client #${value}` : '');
  const displayPhone = selectedClient?.phone || null;
  const displayId = selectedClient?.ids || selectedClient?.id || value;

  // Fermer le dropdown lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrage exclusif sur NOM et TÉLÉPHONE (Exclusion de l'ID selon la demande des agents)
  const filteredClients = clients.filter(c => {
    const clientId = String(c.ids || c.id);
    if (excludeId && clientId === String(excludeId)) return false;
    if (!search) return true;
    const q = search.toLowerCase().trim();
    const matchName = c.fullname?.toLowerCase().includes(q);
    const matchPhone = c.phone?.toLowerCase().includes(q);
    return matchName || matchPhone;
  }).slice(0, 50);

  const handleSelect = (client: Client) => {
    const targetId = String(client.ids || client.id);
    onChange(targetId);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <div className="flex justify-between items-center mb-2 px-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            {onNewClient && (
                <button type="button" onClick={onNewClient} className={`text-[9px] font-black ${labelColor} uppercase hover:underline`}>
                    + Nouveau Client
                </button>
            )}
        </div>
      )}

      {/* Si un client est sélectionné (hasSelection = true) : Affichage immédiat de la carte client */}
      {hasSelection ? (
        <div className="flex items-center justify-between p-3.5 px-4 bg-slate-50 dark:bg-slate-800/90 rounded-[2rem] border-2 border-primary-500/30 dark:border-primary-500/20 shadow-sm transition-all group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md">
              {displayName ? displayName.substring(0, 2).toUpperCase() : 'CL'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                {displayPhone && (
                  <>
                    <span className="flex items-center gap-1">
                      <Phone size={10} className="text-primary-500" />
                      {displayPhone}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                  </>
                )}
                <span className="text-slate-400 font-mono">#ID:{displayId}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors shrink-0"
            title="Changer de client"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        /* Champ de recherche avec filtre Nom / Téléphone */
        <div className="relative outline-none">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-5 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black focus:border-primary-500 outline-none transition-all shadow-inner pl-11 pr-10 dark:text-white"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <ChevronDown 
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              size={16} 
              onClick={() => setIsOpen(!isOpen)} 
          />
        </div>
      )}

      {/* Menu Déroulant des Résultats de Recherche */}
      {isOpen && !hasSelection && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto overflow-x-hidden animate-scale-up">
          {filteredClients.length === 0 ? (
            <div className="p-5 text-center text-slate-500 text-xs font-bold">
              Aucun client trouvé pour "{search}".
              {onNewClient && (
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onNewClient(); }}
                  className="block mx-auto mt-2 text-[11px] font-black text-primary-600 uppercase hover:underline"
                >
                  + Créer ce client
                </button>
              )}
            </div>
          ) : (
            filteredClients.map((client) => {
              const clientId = String(client.ids || client.id);
              return (
                <div
                  key={clientId}
                  onClick={() => handleSelect(client)}
                  className="flex items-center justify-between p-3 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {client.fullname ? client.fullname.substring(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase truncate">
                        {client.fullname}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                        <span>📱 {client.phone || 'Sans tel'}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">ID: {clientId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
