import React from "react";
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
  Bell
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { auth } from "../firebase";
import { motion } from "motion/react";

const Layout: React.FC = () => {
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();

  const [headerSearch, setHeaderSearch] = React.useState("");
  const navigate = useNavigate();

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/patients?search=${encodeURIComponent(headerSearch.trim())}`);
      setHeaderSearch("");
    }
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t("dashboard"), roles: ['ADMIN', 'DOCTOR', 'NURSE', 'CASHIER', 'RECEPTIONIST', 'REGISTER', 'PHARMACIST', 'HR', 'SYSTEM_ADMIN'] },
    { path: "/patients", icon: UserRound, label: t("patients"), roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'REGISTER', 'CASHIER'] },
    { path: "/staff", icon: Users, label: t("staff"), roles: ['ADMIN', 'HR', 'SYSTEM_ADMIN'] },
    { path: "/inventory", icon: Package, label: t("inventory"), roles: ['ADMIN', 'PHARMACIST'] },
    { path: "/pharmacy", icon: Pill, label: t("pharmacy"), roles: ['ADMIN', 'PHARMACIST', 'DOCTOR'] },
    { path: "/finance", icon: Wallet, label: t("finance"), roles: ['ADMIN', 'CASHIER'] },
    { path: "/system-admin", icon: ShieldAlert, label: t("systemAdmin"), roles: ['SYSTEM_ADMIN'] },
  ];

  const filteredNav = navItems.filter(item => {
    if (!item.roles) return true;
    if (!profile) return false;
    const userRole = profile.role?.toUpperCase();
    return item.roles.includes(userRole);
  });

  return (
    <div className="flex h-screen bg-app-bg text-slate-900 overflow-hidden font-sans">
      {/* NAVIGATION SIDEBAR */}
      <nav className="w-56 bg-nav-bg flex-shrink-0 flex flex-col border-r border-slate-200">
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
            {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : 'Health Care Center')}
          </p>
        </div>

        <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
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
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
            <span>System Mode</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Cloud Sync
            </span>
          </div>
          <div className="flex bg-slate-900 rounded p-1">
            <button className="flex-1 text-[9px] py-1 bg-slate-700 text-white rounded">Auto</button>
            <button className="flex-1 text-[9px] py-1 text-slate-500">Manual</button>
          </div>
          
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-2 py-1.5 text-[10px] text-slate-400 hover:text-white uppercase font-bold transition-colors"
          >
            <LogOut className="w-3 h-3" />
            {t("logout")}
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-6">
            <form onSubmit={handleHeaderSearch} className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search Patient (ID, Name, SSN)..." 
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="w-96 pl-10 pr-4 py-1.5 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 border transition-all"
              />
            </form>
            <div className="flex items-center gap-2 text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-full">
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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold">{profile?.fullName || profile?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{profile?.role || 'Staff'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm uppercase">
              {(profile?.fullName || profile?.name || 'U').charAt(0)}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            key={location.pathname}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* STATUS BAR */}
        <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 flex-shrink-0">
          <div className="flex gap-4">
            <span className="flex items-center gap-1 font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 
              READY_STATE: ONLINE | {profile?.role?.toUpperCase() || 'NO_ROLE'}
            </span>
            <span>ID: {profile?.hospitalId?.slice(-8).toUpperCase() || 'SYS-DEFAULT'}</span>
          </div>
          <div className="flex gap-4">
            <span>Compliance: HIPAA | GDPR | HDS</span>
            <span className="font-bold text-slate-800 italic">HOSPITAL MANAGEMENT 4.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
