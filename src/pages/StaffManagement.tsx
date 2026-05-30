import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  Users, 
  UserMinus, 
  Calendar, 
  Plane, 
  Power, 
  UserPlus, 
  Search,
  Clock
} from "lucide-react";
import { UserRole, UserStatus } from "../lib/utils";

const weekdayShortEn: Record<string, string> = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'T',
  Friday: 'F',
  Saturday: 'S',
  Sunday: 'S'
};

const weekdayShortFr: Record<string, string> = {
  Monday: 'L',
  Tuesday: 'M',
  Wednesday: 'M',
  Thursday: 'J',
  Friday: 'V',
  Saturday: 'S',
  Sunday: 'D'
};

const weekdayDisplayFr: Record<string, string> = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche'
};

export default function StaffManagement() {
  const { hospitalId, profile } = useAuth();
  const { t, language } = useLanguage();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Staff form
  const [newStaffData, setNewStaffData] = useState({
    name: "",
    email: "",
    role: "NURSE" as UserRole,
  });

  useEffect(() => {
    if (hospitalId) fetchStaff();
  }, [hospitalId]);

  const fetchStaff = async () => {
    setLoading(true);
    const q = query(collection(db, "users"), where("hospitalId", "==", hospitalId));
    const querySnapshot = await getDocs(q);
    setStaff(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const updateStatus = async (userId: string, status: UserStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), { status });
      fetchStaff();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleToggleStaffDay = async (staffId: string, currentSchedule: string[], day: string) => {
    let updated = Array.isArray(currentSchedule) ? [...currentSchedule] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (updated.includes(day)) {
      updated = updated.filter(d => d !== day);
    } else {
      updated.push(day);
    }
    try {
      await updateDoc(doc(db, "users", staffId), { schedule: updated });
      fetchStaff();
    } catch (error) {
      console.error("Error updating staff schedule:", error);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;

    try {
      // In a real system, this would trigger an invite or Auth creation
      // For this demo, we'll just add the profile
      await addDoc(collection(db, "users"), {
        ...newStaffData,
        hospitalId,
        status: "ACTIVE",
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      fetchStaff();
    } catch (error) {
      console.error("Error adding staff:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
      case 'ON_VACATION': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'OFF': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'TERMINATED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase">{t("staffManagement")}</h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">HR_MODULE / PERSONNEL_LOGS</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="h-10 bg-app-ink text-app-bg px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4" /> {t("staff")} [{t("newRegistration").toUpperCase()}]
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => (
          <div key={s.id} className="bg-white border border-app-line p-6 relative group overflow-hidden">
             {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Users className="w-24 h-24" />
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-app-ink text-app-bg flex items-center justify-center font-mono text-sm">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{s.name}</h3>
                  <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{t(s.role)}</p>
                </div>
              </div>
              <span className={`text-[9px] px-2 py-0.5 border font-mono uppercase ${getStatusColor(s.status)}`}>
                {t(s.status)}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono opacity-80 uppercase tracking-wider font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {t("schedules") || "Schedule Availability"}
              </div>
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const staffSch = s.schedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                  const isSelected = staffSch.includes(day);
                  const letter = language === 'fr' ? weekdayShortFr[day] : weekdayShortEn[day];
                  return (
                    <button
                      key={day}
                      onClick={() => handleToggleStaffDay(s.id, staffSch, day)}
                      title={language === 'fr' ? weekdayDisplayFr[day] : day}
                      className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-600 text-white font-black shadow-sm hover:bg-emerald-700' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 italic">
                {language === 'fr' ? "Cliquez sur les jours pour modifier" : "Click days to edit schedule"}
              </p>
            </div>

            <div className="flex items-center gap-1 border-t border-app-line pt-4">
              <button 
                onClick={() => updateStatus(s.id, 'ACTIVE')}
                title={t("setActive")}
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-green-50 transition-colors"
              >
                <Power className="w-3 h-3 text-green-600" />
              </button>
              <button 
                onClick={() => updateStatus(s.id, 'ON_VACATION')}
                title={t("onVacation")}
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-blue-50 transition-colors"
              >
                <Plane className="w-3 h-3 text-blue-600" />
              </button>
              <button 
                onClick={() => updateStatus(s.id, 'OFF')}
                title={t("offDuty")}
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-orange-50 transition-colors"
              >
                <Calendar className="w-3 h-3 text-orange-600" />
              </button>
              <button 
                onClick={() => updateStatus(s.id, 'TERMINATED')}
                title={t("terminateAction")}
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <UserMinus className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2">{t("staff")} [REG_FORM]</h2>
            
            <form onSubmit={handleAddStaff} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">{t("fullName")}</label>
                <input 
                  type="text" 
                  required 
                  value={newStaffData.name}
                  onChange={(e) => setNewStaffData({...newStaffData, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">{t("email")}</label>
                <input 
                  type="email" 
                  required 
                  value={newStaffData.email}
                  onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">{t("designatedRole")}</label>
                <select 
                  value={newStaffData.role}
                  onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value as UserRole})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                >
                  <option value="DOCTOR">{t("doctor")}</option>
                  <option value="NURSE">{t("nurse")}</option>
                  <option value="RECEPTIONIST">{t("receptionist")}</option>
                  <option value="PHARMACIST">{t("pharmacist")}</option>
                  <option value="CASHIER">{t("cashier")}</option>
                  <option value="HR">{t("hr")}</option>
                  <option value="ADMIN">{t("admin")}</option>
                  <option value="PHARMACIE">{t("pharmacie")}</option>
                  <option value="INVENTAIRE">{t("inventaire")}</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-app-line">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-app-line font-mono text-[10px] uppercase hover:bg-gray-100 transition-colors"
                >
                  {t("halt")}
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2 bg-app-ink text-app-bg font-mono text-[10px] uppercase hover:opacity-90 transition-opacity"
                >
                  {t("accreditStaff")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
