import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Building2, History, PieChart, Users as UsersIcon, Settings, LogOut, Menu, Sun, Moon } from 'lucide-react';
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

// --- Shared Components ---

const Sidebar = ({
  isOpen,
  setIsOpen,
  isDark,
  toggleDark,
  handleLogout,
  userEmail
}: {
  isOpen: boolean,
  setIsOpen: (v: boolean) => void,
  isDark: boolean,
  toggleDark: () => void,
  handleLogout: () => void,
  userEmail?: string
}) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
    { path: '/agencies', label: 'Agences', icon: Building2 },
    { path: '/transactions', label: 'Transactions', icon: History },
    { path: '/reports', label: 'Rapports', icon: PieChart },
    { path: '/users', label: 'Utilisateurs', icon: UsersIcon },
    { path: '/settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Building2 size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            BLD <span className="text-primary-600">TRANS</span>
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${active
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              <span className="font-bold text-xs text-slate-600 dark:text-slate-300">
                {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'US'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-900 dark:text-slate-200">
                {userEmail || 'Utilisateur'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Connecté</p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={toggleDark}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={isDark ? "Mode clair" : "Mode sombre"}
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Se déconnecter"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// --- Layout Wrapper ---

const Layout = ({
  children,
  handleLogout,
  userEmail
}: {
  children?: React.ReactNode,
  handleLogout: () => void,
  userEmail?: string
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isDark={isDark}
        toggleDark={() => setIsDark(!isDark)}
        handleLogout={handleLogout}
        userEmail={userEmail}
      />

      <main className="flex-1 lg:ml-64 min-w-0 flex flex-col transition-all duration-300">
        <header className="lg:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-900 dark:text-white">BLD TRANS</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-x-hidden p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <Settings size={32} className="animate-spin-slow" />
    </div>
    <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">{title}</h2>
    <p className="mt-2">Module en construction.</p>
  </div>
);

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session active au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((e) => {
      console.warn("Erreur vérification session (possiblement hors ligne)", e);
      setLoading(false);
    });

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <HashRouter>
      <ToastProvider>
        <Layout handleLogout={handleLogout} userEmail={session?.user.email}>
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