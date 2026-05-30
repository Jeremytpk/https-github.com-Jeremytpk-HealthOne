import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  User, 
  Lock, 
  ShieldAlert, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Calendar,
  Save,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(profile?.fullName || profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [username, setUsername] = useState(profile?.username || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    try {
      await updateProfile({
        name: fullName.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        username: username.trim()
      });
      setNotification({
        type: "success",
        message: t("profileUpdated")
      });
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        message: t("profileUpdateError") + ": " + (err.message || "")
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitials = (fullName || "U").charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title block */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em] mb-1">
          {t("settings")} / {t("userProfile")}
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-slate-900 uppercase">
          {t("profileSettings")}
        </h1>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 flex items-start gap-3 border ${
              notification.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold font-mono uppercase tracking-wider">
                {notification.type === "success" ? "STATUS_OK" : "STATUS_ERROR"}
              </p>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left column: Visual Card / Read-only details */}
        <div className="bg-white border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="relative group mb-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-3xl border-4 border-slate-100 shadow-inner relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02]">
              {userInitials}
            </div>
          </div>

          <h2 className="font-bold text-lg leading-tight uppercase truncate max-w-full">
            {fullName || profile?.username || "HealthOne Staff"}
          </h2>
          
          <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[9px] font-mono font-bold uppercase tracking-widest leading-none">
            <ShieldAlert className="w-3 h-3" />
            {profile?.role ? t(profile.role.toUpperCase()) : t("Staff")}
          </div>

          <div className="w-full border-t border-slate-100 mt-6 pt-6 space-y-4 text-left">
            <div>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{t("hospitalName")}</p>
              <p className="text-xs font-medium text-slate-800 flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : t("hospitalName"))}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{t("username")}</p>
              <p className="text-xs font-mono text-slate-700 flex items-center gap-1.5 mt-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                @{profile?.username || "no_username"}
              </p>
            </div>

            {profile?.email && (
              <div>
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{t("email")}</p>
                <p className="text-xs text-slate-700 flex items-center gap-1.5 mt-1 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {profile.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-base font-serif italic font-bold border-b border-slate-200 pb-3 uppercase tracking-widest mb-6 font-mono">
            {t("editUserInformation")}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                {t("fullName")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jean Dupont"
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-sans text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                  {t("username")}
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jdupont"
                    className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                  {t("phoneNumber")}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                {t("designatedRole")} ({t("readOnly") || "READ_ONLY"})
              </label>
              <div className="relative opacity-60">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  disabled
                  value={profile?.role ? t(profile.role.toUpperCase()) : t("Staff")}
                  className="w-full bg-slate-100 border border-slate-200 pl-10 pr-4 py-2.5 font-sans text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 bg-slate-900 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                {isSubmitting ? "..." : t("saveProfile")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
