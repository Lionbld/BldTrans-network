import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  History,
  PieChart,
  Users as UsersIcon,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronRight,
  Bell,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import Dashboard from './components/Dashboard';
import Agencies from './components/Agencies';
import Transactions from './components/Transactions';
import Users from './components/Users';
import Login from './components/Login';
import Reports from './components/Reports';
import SettingsPage from './components/Settings';
import { ToastProvider } from './components/ToastProvider';

// --- Improved Sidebar ---

const Sidebar = ({
  isOpen,
  setIsOpen,
  isDark,
  toggleDark,
  handleLogout,
  userEmail,
  pendingCount
}: {
  isOpen: boolean,
  setIsOpen: (v: boolean) => void,
  isDark: boolean,
  toggleDark: () => void,
  handleLogout: () => void,
  userEmail?: string,
  pendingCount: number
}) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
    { path: '/agencies', label: 'Agences', icon: Building2 },
    { path: '/transactions', label: 'Transactions', icon: History, badge: pendingCount > 0 ? pendingCount : null },
    { path: '/reports', label: 'Rapports', icon: PieChart },
    { path: '/users', label: 'Utilisateurs', icon: UsersIcon },
    { path: '/settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-[#0f0f23] border-r border-slate-200/80 dark:border-slate-800/80 
        transition-transform duration-300 ease-in-out flex flex-col justify-between shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Logo Header */}
          <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="BLD Trans Logo" className="w-11 h-11 object-contain rounded-xl shadow-md shadow-indigo-500/20" />
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
                  BLD <span className="text-indigo-600 dark:text-indigo-400">TRANS</span>
                </span>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Network Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 mt-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Navigation Principale</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    group flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                    ${active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${active ? 'bg-white text-indigo-600' : 'bg-amber-500/20 text-amber-500 dark:text-amber-400'}`}>
                      {item.badge}
                    </span>
                  ) : active ? (
                    <ChevronRight size={16} className="text-indigo-200" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile & Theme Toggle */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#060612]/40">
          <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0 font-mono">
              {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100 leading-tight">
                {userEmail || 'Super-Admin'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold uppercase tracking-wider border border-indigo-500/20">
                  <ShieldCheck size={11} className="text-indigo-500" /> Super-Admin
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Session active"></span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleDark}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// --- Top Navbar ---

const Topbar = ({ setSidebarOpen, pendingCount }: { setSidebarOpen: (v: boolean) => void, pendingCount: number }) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Tableau de bord';
      case '/agencies': return 'Gestion des Agences';
      case '/transactions': return 'Historique des Transactions';
      case '/reports': return 'Centre de Rapports';
      case '/users': return 'Gestion des Utilisateurs';
      case '/settings': return 'Configuration Système';
      default: return 'Aperçu';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#060612]/70 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-300 lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white font-display tracking-tight leading-none">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1 hidden sm:block">
            BLD Trans Admin &bull; Portée Globale
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Pending transactions indicator pill */}
        {pendingCount > 0 && (
          <Link
            to="/transactions"
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold hover:bg-amber-500/20 transition-all"
          >
            <Clock size={14} className="animate-pulse" />
            <span>{pendingCount} en attente</span>
          </Link>
        )}

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

        {/* Realtime Live Pulse */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:inline font-mono text-[11px] font-bold">LIVE</span>
        </div>
      </div>
    </header>
  );
};

// --- Main Layout Wrapper ---

const Layout = ({
  children,
  handleLogout,
  userEmail,
  pendingCount
}: {
  children?: React.ReactNode,
  handleLogout: () => void,
  userEmail?: string,
  pendingCount: number
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060612] flex font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isDark={isDark}
        toggleDark={() => setIsDark(!isDark)}
        handleLogout={handleLogout}
        userEmail={userEmail}
        pendingCount={pendingCount}
      />

      <div className="flex-1 lg:ml-72 min-w-0 flex flex-col min-h-screen">
        <Topbar setSidebarOpen={setSidebarOpen} pendingCount={pendingCount} />

        <main className="flex-1 overflow-x-hidden p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  // null = vérification en cours, true = superadmin autorisé, false = refusé
  const [isSuperadmin, setIsSuperadmin] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((e) => {
      console.warn("Erreur vérification session", e);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Contrôle d'accès : seul un agent marqué superadmin peut utiliser ce portail
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setIsSuperadmin(null);
      return;
    }

    let cancelled = false;
    setIsSuperadmin(null);

    (async () => {
      try {
        // Seul le user_id Supabase Auth fait foi (pas de correspondance par email)
        const { data, error } = await supabase
          .from('agents')
          .select('superadmin')
          .eq('user_id', userId);

        if (cancelled) return;

        if (error) {
          setAccessError("Impossible de vérifier vos droits d'accès. Réessayez plus tard.");
          setIsSuperadmin(false);
          await supabase.auth.signOut();
          return;
        }

        const isSuper = (data || []).some((a: { superadmin: boolean }) => a.superadmin === true);

        if (!isSuper) {
          setAccessError('Accès refusé : Ce portail réseau est strictement réservé au Super-Administrateur. Vos identifiants ne disposent pas des privilèges requis.');
          setIsSuperadmin(false);
          await supabase.auth.signOut();
          return;
        }

        setAccessError(null);
        setIsSuperadmin(true);
      } catch (err: any) {
        if (cancelled) return;
        setAccessError("Erreur lors de la vérification de vos privilèges d'accès.");
        setIsSuperadmin(false);
        await supabase.auth.signOut();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Realtime badge listener for pending transactions
  useEffect(() => {
    if (!session || isSuperadmin !== true) return;

    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('transferts')
        .select('*', { count: 'exact', head: true })
        .eq('etat_trans', true);

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();

    const channel = supabase
      .channel('app-global-pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transferts' }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, isSuperadmin]);

  const handleLogout = async () => {
    setIsSuperadmin(null);
    setAccessError(null);
    await supabase.auth.signOut();
  };

  if (loading || (session && isSuperadmin === null)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#060612] flex items-center justify-center">
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Vérification des droits Super-Administrateur...
          </span>
        </div>
      </div>
    );
  }

  if (!session || isSuperadmin !== true) {
    return <Login accessError={accessError} onClearAccessError={() => setAccessError(null)} />;
  }

  return (
    <HashRouter>
      <ToastProvider>
        <Layout handleLogout={handleLogout} userEmail={session?.user.email} pendingCount={pendingCount}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agencies" element={<Agencies />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </HashRouter>
  );
};

export default App;