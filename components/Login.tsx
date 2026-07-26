import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, AlertCircle, Building2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#060612] text-slate-100 overflow-hidden font-sans">
      {/* Left Visual Banner Section */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-[#0a0a24] to-[#060612] z-0"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>

        {/* Content Overlay */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BLD Trans Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg shadow-indigo-500/20" />
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white font-display">
                BLD <span className="text-indigo-400">TRANS</span>
              </span>
              <p className="text-[10px] text-indigo-300/70 font-semibold tracking-widest uppercase">Network Management</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck size={16} />
            <span>Portail d'administration sécurisé</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white font-display leading-tight">
            Pilotez vos flux financiers en toute sérénité.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Supervisez l'ensemble de vos agences, validez les transactions en temps réel et générez vos bilans avec une clarté absolue.
          </p>

          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80">
            <div>
              <p className="text-2xl font-bold text-white font-mono">100%</p>
              <p className="text-[11px] text-slate-400 font-medium">Temps réel</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">256-bit</p>
              <p className="text-[11px] text-slate-400 font-medium">Chiffrement SSL</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">24/7</p>
              <p className="text-[11px] text-slate-400 font-medium">Supervision</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex justify-between items-center border-t border-slate-800/50 pt-6">
          <span>&copy; {new Date().getFullYear()} BLD Trans Network. Tous droits réservés.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Système opérationnel
          </span>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-slate-950/50 backdrop-blur-md">
        <div className="w-full max-w-md space-y-8 animate-fade-in">

          {/* Mobile Header Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="BLD Trans Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-indigo-500/20" />
            <span className="text-xl font-bold tracking-tight text-white font-display">
              BLD <span className="text-indigo-400">TRANS</span>
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight font-display">Connexion au Portail</h2>
            <p className="text-slate-400 text-sm mt-2">Entrez vos identifiants pour accéder au tableau de bord.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-scale-up">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Email Professionnel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0f0f23] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all shadow-inner"
                  placeholder="agent@bldtrans.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-[#0f0f23] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all shadow-inner"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                />
                <span className="text-slate-400 text-xs font-medium">Se souvenir de moi</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Veuillez contacter l'administrateur principal pour réinitialiser votre accès."); }} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Verification en cours...
                </span>
              ) : (
                <>
                  <span>Accéder au Tableau de Bord</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-500">
              Assistance technique : <span className="text-slate-400 font-medium">support@bldtrans.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;