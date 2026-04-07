import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../types';
import { Search, ChevronDown, Check } from 'lucide-react';

interface ClientSearchSelectProps {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  onNewClient?: () => void;
  labelColor?: string;
}

export default function ClientSearchSelect({ 
    clients, 
    value, 
    onChange, 
    placeholder = "Rechercher un client...",
    label,
    onNewClient,
    labelColor = "text-primary-600"
}: ClientSearchSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize search text with current selected client
  useEffect(() => {
    if (value && !isOpen) {
      const selected = clients.find(c => String(c.ids) === String(value));
      if (selected) {
        setSearch(`${selected.fullname} (ID: ${selected.ids})`);
      }
    } else if (!value && !isOpen) {
      setSearch('');
    }
  }, [value, clients, isOpen]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert search text to selected if clicking outside
        if (value) {
            const selected = clients.find(c => String(c.ids) === String(value));
            if (selected) {
                setSearch(`${selected.fullname} (ID: ${selected.ids})`);
            }
        } else {
            setSearch('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, clients]);

  const filteredClients = search && isOpen
    ? clients.filter(c => 
        c.fullname?.toLowerCase().includes(search.toLowerCase()) || 
        String(c.ids).includes(search)
      ).slice(0, 50)
    : clients.slice(0, 50);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <div className="flex justify-between items-center mb-3 px-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            {onNewClient && (
                <button type="button" onClick={onNewClient} className={`text-[9px] font-black ${labelColor} uppercase hover:underline`}>
                    Nouveau Client
                </button>
            )}
        </div>
      )}
      <div className="relative outline-none">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
              setIsOpen(true);
              setSearch(''); // Clear to allow easy searching
          }}
          placeholder={placeholder}
          className="w-full px-6 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner pl-12 pr-12"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-[20%] text-slate-400 pointer-events-none" size={20} />
        <ChevronDown 
            className="absolute right-4 top-1/2 -translate-y-[20%] text-slate-400 cursor-pointer hover:text-slate-600" 
            size={20} 
            onClick={() => {
                if (!isOpen) {
                    setSearch('');
                }
                setIsOpen(!isOpen);
            }} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 max-h-60 overflow-y-auto overflow-x-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm font-bold">Aucun client trouvé.</div>
          ) : (
            filteredClients.map((client) => {
                const isSelected = String(client.ids) === String(value);
                return (
              <div
                key={client.ids}
                onClick={() => {
                  onChange(String(client.ids));
                  setSearch(`${client.fullname} (ID: ${client.ids})`);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent'}`}
              >
                <div>
                  <div className={`text-sm font-black ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'} uppercase truncate max-w-[200px]`}>
                      {client.fullname}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {client.ids}</div>
                </div>
                {isSelected && <Check size={18} className="text-primary-600 shrink-0" />}
              </div>
            )})
          )}
        </div>
      )}
    </div>
  );
}
