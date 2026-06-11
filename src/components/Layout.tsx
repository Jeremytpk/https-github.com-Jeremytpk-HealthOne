import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  UserRound, 
  Package, 
  Pill, 
  Wallet, 
  ShieldAlert,
  Globe,
  LogOut,
  Search,
  Menu,
  X,
  Pin,
  PinOff,
  ShieldCheck,
  FileText
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useOfflineSync } from "../contexts/OfflineSyncContext";
import { auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { getNormalizedRole } from "../lib/utils";
import OfflineSyncCenter from "./OfflineSyncCenter";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const Layout: React.FC = () => {
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { isOfflineMode, queuedItems, isOnline } = useOfflineSync();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  const [headerSearch, setHeaderSearch] = React.useState("");
  const navigate = useNavigate();

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/patients?search=${encodeURIComponent(headerSearch.trim())}`);
      setHeaderSearch("");
      setIsMobileMenuOpen(false);
    }
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t("dashboard"), roles: ['ADMIN', 'DOCTOR', 'NURSE', 'CASHIER', 'RECEPTIONIST', 'REGISTER', 'PHARMACIST', 'HR', 'SYSTEM_ADMIN'] },
    { path: "/patients", icon: UserRound, label: t("patients"), roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'REGISTER', 'CASHIER'] },
    { path: "/staff", icon: Users, label: t("staff"), roles: ['ADMIN', 'HR', 'SYSTEM_ADMIN'] },
    { path: "/inventory", icon: Package, label: t("inventory"), roles: ['ADMIN', 'PHARMACIST', 'PHARMACIE', 'INVENTAIRE', 'INVENTORY'] },
    { path: "/pharmacy", icon: Pill, label: t("pharmacy"), roles: ['ADMIN', 'PHARMACIST', 'PHARMACIE', 'DOCTOR'] },
    { path: "/finance", icon: Wallet, label: t("finance"), roles: ['ADMIN', 'REGISTER'] },
    { path: "/system-admin", icon: ShieldAlert, label: t("systemAdmin"), roles: ['SYSTEM_ADMIN', 'SUP_ADMIN'] },
    { path: "/privacy", icon: ShieldCheck, label: t("privacy") },
    { path: "/terms", icon: FileText, label: t("termsAndConditions") },
  ];

  const filteredNav = navItems.filter(item => {
    if (!profile) return false;
    const userRole = getNormalizedRole(profile.role);
    if (item.path === "/system-admin") {
      return userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN";
    }
    if (userRole === 'ADMIN' || userRole === 'SYSTEM_ADMIN' || userRole === 'SUP_ADMIN') return true;
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-nav-active">
        <h1 className="text-white font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-white">
             <img 
               src="/assets/HealthOneLogo.png" 
               alt="HealthOne" 
               className="w-full h-full object-contain" 
               referrerPolicy="no-referrer"
             />
          </div>
          HealthOne
        </h1>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">
          {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : t("hospitalName"))}
        </p>
      </div>

      {/* User Profile Summary Card */}
      <div className="mx-4 mt-4 p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-center gap-3">
        {profile?.photoURL ? (
          <img 
            src={profile.photoURL} 
            alt={profile?.fullName || profile?.name || 'User'} 
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-600"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {(profile?.fullName || profile?.name || 'U').charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-100 leading-tight truncate">
            {profile?.fullName || profile?.name || 'User'}
          </p>
          <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 truncate font-mono">
            {profile?.role ? t(profile.role.toUpperCase()) : t("Staff")}
          </p>
          <Link 
            to="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-[9px] text-blue-400 hover:text-blue-300 hover:underline transition-all font-mono uppercase mt-1.5 inline-block font-bold"
          >
            {t("editProfile")} →
          </Link>
        </div>
      </div>

      <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-2 text-sm flex items-center gap-3 transition-all ${
                isActive 
                  ? "bg-blue-600/10 border-l-4 border-blue-500 text-blue-400" 
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-80'}`} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50 space-y-4">
        <button
          onClick={() => setIsSyncOpen(true)}
          className="w-full flex items-center justify-between text-[10px] text-slate-400 uppercase text-left group hover:text-white transition-colors"
        >
          <span>{t("systemMode")}</span>
          {isOfflineMode ? (
            <span className="text-rose-400 flex items-center gap-1 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              OFFLINE
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              {t("cloudSync")}
            </span>
          )}
        </button>
        
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-2 py-1.5 text-[10px] text-slate-400 hover:text-white uppercase font-bold transition-colors"
        >
          <LogOut className="w-3 h-3" />
          {t("logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-app-bg text-slate-900 overflow-hidden font-sans relative">
      {/* SIDEBAR CONTAINER - Pinned Mode (Permanent) */}
      <nav className={`bg-nav-bg flex-shrink-0 flex-col border-r border-slate-200 transition-all duration-300 ease-in-out z-30 ${
        isSidebarPinned 
          ? "w-64 max-w-[80vw] flex" 
          : "w-0 hidden"
      }`}>
        <div className="min-w-[16rem] h-full">
          <Sidebar />
        </div>
      </nav>

      {/* MOBILE/UNPINNED OVERLAY MENU - Shows on all screen sized when not pinned but opened */}
      <AnimatePresence>
        {!isSidebarPinned && isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.nav 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-nav-bg z-50 shadow-2xl flex flex-col"
            >
              <Sidebar />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-16 lg:h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 lg:gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all ${
                !isSidebarPinned && isMobileMenuOpen ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' : ''
              }`}
              title="Toggle Menu"
            >
              <Menu className={`w-5 h-5 transition-transform duration-300 ${!isSidebarPinned && isMobileMenuOpen ? 'rotate-90' : ''}`} />
            </button>

            <button 
              onClick={() => {
                const newState = !isSidebarPinned;
                setIsSidebarPinned(newState);
                if (newState) setIsMobileMenuOpen(false);
              }}
              className={`hidden md:flex p-2 hover:bg-slate-100 rounded-lg transition-all ${
                isSidebarPinned 
                  ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' 
                  : 'text-slate-400 opacity-60 hover:opacity-100'
              }`}
              title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              {isSidebarPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
            </button>

            <form onSubmit={handleHeaderSearch} className="relative group flex-1 max-w-xs lg:max-w-md hidden sm:block ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder={t("patientSearchPlaceholder")}
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 border transition-all"
              />
            </form>

            {/* OFFLINE STATUS HEADER TRIGGER */}
            <button
              onClick={() => setIsSyncOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[10px] font-bold transition-all cursor-pointer select-none hover:opacity-95 ${
                isOfflineMode 
                  ? 'border-rose-200 text-rose-600 bg-rose-50/30' 
                  : queuedItems.length > 0 
                  ? 'border-amber-200 text-amber-600 bg-amber-50/40 animate-pulse font-mono' 
                  : 'border-emerald-200 text-emerald-600 bg-emerald-50/20'
              }`}
              title="Manage local/offline sync workload"
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden xs:inline uppercase tracking-wider">{language === 'fr' ? "Hors-ligne" : "Local Store"}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-550" />
                  <span className="hidden xs:inline uppercase tracking-wider text-slate-600">{language === 'fr' ? "Fichiers Cloud" : "Cloud Active"}</span>
                </>
              )}
              {queuedItems.length > 0 && (
                <span className="bg-amber-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-extrabold shrink-0">
                  {queuedItems.length} pending
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold bg-slate-100 px-3 py-1.5 rounded-full">
              <Globe className="w-3 h-3 text-slate-400" />
              <button 
                onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                className={language === 'en' ? 'text-blue-600' : 'text-slate-600'}
              >EN</button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
                className={language === 'fr' ? 'text-blue-600' : 'text-slate-600'}
              >FR</button>
            </div>
          </div>

          <Link to="/profile" className="flex items-center gap-3 lg:gap-4 ml-4 group hover:opacity-90 transition-opacity">
            <div className="text-right hidden xs:block">
              <p className="text-xs font-bold leading-none group-hover:text-blue-600 transition-colors">{profile?.fullName || profile?.name || 'User'}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-tighter mt-1">{profile?.role ? t(profile.role.toUpperCase()) : t("Staff")}</p>
            </div>
            {profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={profile?.fullName || profile?.name || 'User'} 
                className="w-8 lg:w-9 h-8 lg:h-9 rounded-full object-cover border-2 border-white group-hover:border-blue-500 shadow-sm shrink-0 transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 lg:w-9 h-8 lg:h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border-2 border-white group-hover:border-blue-500 shadow-sm uppercase shrink-0 transition-all font-sans">
                {(profile?.fullName || profile?.name || 'U').charAt(0)}
              </div>
            )}
          </Link>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6 bg-slate-50/50">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            key={location.pathname}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* STATUS BAR - Hidden on mobile */}
        <footer className="hidden sm:flex h-8 bg-white border-t border-slate-200 items-center justify-between px-4 text-[10px] text-slate-500 flex-shrink-0">
          <div className="flex gap-4 italic truncate">
            {isOfflineMode ? (
              <span className="flex items-center gap-1 font-mono whitespace-nowrap text-amber-600 font-bold animate-pulse">
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                OFFLINE | {profile?.role ? t(profile.role.toUpperCase()) : ""}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono whitespace-nowrap text-emerald-600 font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {t("online")} | {profile?.role ? t(profile.role.toUpperCase()) : ""}
              </span>
            )}
            <span className="truncate">
              {t("hospitalAbbr")}: {profile?.hospitalId ? profile.hospitalId.slice(-8).toUpperCase() : "ROOT"}
            </span>
          </div>
          <div className="flex gap-4 shrink-0">
            <span className="hidden md:inline">HIPAA | GDPR | HDS</span>
            <span 
              onClick={() => setIsSyncOpen(true)}
              className="font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
            >
              HEALTHONE 4.0 {queuedItems.length > 0 && `(${queuedItems.length} PENDING SYNC)`}
            </span>
          </div>
        </footer>
      </div>

      {/* OFFLINE SYNC MODAL OVERLAY */}
      <AnimatePresence>
        {isSyncOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSyncOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              style={{ pointerEvents: 'auto' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-full max-w-lg md:max-w-xl z-[110]"
            >
              <OfflineSyncCenter onClose={() => setIsSyncOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
