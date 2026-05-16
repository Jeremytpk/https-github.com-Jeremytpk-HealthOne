import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Activity, ArrowRight, Globe } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAdminView, setIsAdminView] = useState(false);
  const { user, profile, loading, signInWithUsername, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  if (loading) return null;
  
  if (user && profile) {
    // If logging in through admin view, ensure user has an admin role
    const userRole = profile.role?.toUpperCase();
    const isAuthorizedAdmin = userRole === 'SYSTEM_ADMIN' || userRole === 'ADMIN';
    
    if (isAdminView && !isAuthorizedAdmin) {
      // Not an admin, sign out and show error
      logout();
      setError(t("notAuthorizedAdmin") || "Access Denied: This portal is reserved for administrators.");
      return null;
    }

    // Role-based redirection after login
    if (profile.role === 'SYSTEM_ADMIN') return <Navigate to="/system-admin" />;
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithUsername(username, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs for modern look */}
      <div className={`absolute top-0 right-0 w-96 h-96 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 transition-colors duration-700 ${isAdminView ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`} />
      <div className={`absolute bottom-0 left-0 w-96 h-96 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 transition-colors duration-700 ${isAdminView ? 'bg-slate-500/10' : 'bg-blue-500/10'}`} />

      <div className="w-full max-w-md relative z-10">
        {/* Language Switcher */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-full shadow-sm">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${language === 'en' ? (isAdminView ? 'bg-blue-600' : 'bg-emerald-500') + ' text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >EN</button>
            <button 
              onClick={() => setLanguage('fr')}
              className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${language === 'fr' ? (isAdminView ? 'bg-blue-600' : 'bg-emerald-500') + ' text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >FR</button>
          </div>
          {isAdminView && (
            <button 
              onClick={() => setIsAdminView(false)}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors"
            >
              ← {t("backToStaff") || "Back to Staff Login"}
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-2xl shadow-emerald-500/5 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1.5 transition-colors duration-500 ${isAdminView ? 'bg-blue-600' : 'medical-gradient'}`} />
          
            <div className="mb-10 flex flex-col items-center">
            <div className={`w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-slate-200 transition-all duration-500 p-2 ${isAdminView ? 'ring-2 ring-blue-100 scale-95' : ''}`}>
               <img 
                 src="/assets/HealthOneLogo.png" 
                 alt="HealthOne" 
                 className="w-full h-full object-contain rounded-2xl" 
                 referrerPolicy="no-referrer"
               />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">HealthOne</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-2">
              {isAdminView ? (t("adminPortal") || "System Administrator Portal") : (t("professionalSolution") || "Professional Hospital Management Solution")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">
                {isAdminView ? (t("adminPersonnel") || "Administrator ID") : t("loginPersonnel")}
              </label>
              <input
                type="text"
                placeholder={isAdminView ? "Admin Username" : "Personnel Username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 transition-all text-sm font-medium ${isAdminView ? 'focus:ring-blue-500/20' : 'focus:ring-emerald-500/20'} focus:bg-white`}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">
                {isAdminView ? (t("adminKey") || "Root Access Key") : t("accessKey")}
              </label>
              <input
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 transition-all text-sm font-medium ${isAdminView ? 'focus:ring-blue-500/20' : 'focus:ring-emerald-500/20'} focus:bg-white`}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-bold text-center uppercase tracking-widest">
                AUTHENTICATION_FAILED: {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full h-12 text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs shadow-lg active:scale-[0.98] ${isAdminView ? 'bg-blue-600 shadow-blue-500/10' : 'medical-gradient shadow-emerald-500/10'}`}
            >
              {isAdminView ? (t("adminLogin") || "Login to Root") : t("initAccess")} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {!isAdminView && (
            <div className="mt-8 flex items-center justify-center">
              <button 
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center gap-2"
                onClick={() => setIsAdminView(true)}
              >
                <Globe className="w-3 h-3" />
                {t("adminPortal")}
              </button>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-slate-50 text-[9px] font-bold text-slate-300 uppercase flex justify-between tracking-widest">
            <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> SECURE_CORE_V1</span>
            <span>TENANT_MULTI_ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
