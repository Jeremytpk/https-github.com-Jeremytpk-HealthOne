import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  addDoc,
  setDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useOfflineSync } from "../contexts/OfflineSyncContext";
import WorkCalendarModal from "../components/WorkCalendarModal";
import MiniAuditedCalendar from "../components/MiniAuditedCalendar";
import { 
  Users, 
  UserMinus, 
  Calendar, 
  Plane, 
  Power, 
  UserPlus, 
  Search,
  Clock,
  KeyRound,
  ShieldAlert,
  SlidersHorizontal,
  Printer,
  List
} from "lucide-react";
import { UserRole, UserStatus, getNormalizedRole, generateUsernameFromName } from "../lib/utils";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

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
  const { isOfflineMode } = useOfflineSync();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [viewingStaffSchedule, setViewingStaffSchedule] = useState<any | null>(null);

  const handleSaveStaffSchedule = async (newSchedule: string[]) => {
    if (!viewingStaffSchedule) return;
    try {
      const docRef = doc(db, "users", viewingStaffSchedule.id);
      await updateDoc(docRef, { schedule: newSchedule });
      setStaff(prev => prev.map(u => u.id === viewingStaffSchedule.id ? { ...u, schedule: newSchedule } : u));
      setViewingStaffSchedule({ ...viewingStaffSchedule, schedule: newSchedule });
    } catch (err) {
      console.error("Failed to update staff schedule:", err);
    }
  };

  // View modes: calendar (default grid are each cards with calendars) vs list style
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // New Staff form
  const [accountType, setAccountType] = useState<"healthone" | "local">("healthone");
  const [newStaffData, setNewStaffData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "NURSE" as UserRole,
  });

  useEffect(() => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }

    try {
      const cached = localStorage.getItem(`healthone_cached_staff_${hospitalId}`);
      if (cached) {
        setStaff(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to load cached staff:", e);
    }

    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const u = doc.data();
        let resolvedHopId = u.hospitalId || null;
        if (!resolvedHopId && u.hospital) {
          if (typeof u.hospital === 'string') resolvedHopId = u.hospital;
          else if (typeof u.hospital === 'object' && u.hospital.id) resolvedHopId = u.hospital.id;
        }
        return { id: doc.id, ...u, resolvedHospitalId: resolvedHopId };
      }).filter((u: any) => u.resolvedHospitalId === hospitalId);

      setStaff(list);
      try {
        localStorage.setItem(`healthone_cached_staff_${hospitalId}`, JSON.stringify(list));
      } catch (e) {
        console.error("Failed to cache staff:", e);
      }
      setLoading(false);
    }, (err) => {
      console.error("Staff subscription failed, falling back to manual fetch:", err);
      fetchStaff();
    });

    return () => unsubscribe();
  }, [hospitalId]);

  const fetchStaff = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => {
        const u = doc.data();
        let resolvedHopId = u.hospitalId || null;
        if (!resolvedHopId && u.hospital) {
          if (typeof u.hospital === 'string') resolvedHopId = u.hospital;
          else if (typeof u.hospital === 'object' && u.hospital.id) resolvedHopId = u.hospital.id;
        }
        return { id: doc.id, ...u, resolvedHospitalId: resolvedHopId };
      }).filter((u: any) => u.resolvedHospitalId === hospitalId);
      setStaff(list);
    } catch (error) {
      console.error("Error manual fetch of staff:", error);
    } finally {
      setLoading(false);
    }
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

    if (accountType === "healthone" && isOfflineMode) {
      alert(language === 'fr' 
        ? "La création d'un compte utilisateur réel avec accès de connexion nécessite une connexion Internet active pour s'enregistrer auprès du service d'authentification."
        : "Creating a live user login account requires an active internet connection to register with the cloud authentication service.");
      return;
    }

    if (!newStaffData.name) {
      alert(language === 'fr' ? "Veuillez entrer le nom complet." : "Please enter the Full Name.");
      return;
    }

    if (accountType === "healthone" && (!newStaffData.username || !newStaffData.password)) {
      alert(language === 'fr' ? "Veuillez remplir les champs obligatoires (Nom complet, Nom d'utilisateur, Mot de passe)." : "Please fill in all required fields (Name, Username, Password).");
      return;
    }

    setCreatingUser(true);
    let secondaryApp;
    try {
      let newUid = "";
      let resolvedEmail = "";

      if (accountType === "healthone") {
        // Initialize dynamic secondary app to avoid logging out the current active session
        secondaryApp = initializeApp(firebaseConfig, "StaffCreationApp");
        const secondaryAuth = getAuth(secondaryApp);

        resolvedEmail = newStaffData.email.trim() 
          ? newStaffData.email.trim() 
          : `${newStaffData.username.toLowerCase().trim()}@healthone.local`;

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          resolvedEmail,
          newStaffData.password.trim()
        );

        newUid = userCredential.user.uid;
      } else {
        // Create an empty reference to generate a random document ID in high-performance Firestore users collection
        const tempDoc = doc(collection(db, "users"));
        newUid = tempDoc.id;
      }

      const userData: any = {
        id: newUid,
        uid: newUid,
        name: newStaffData.name.trim(),
        fullName: newStaffData.name.trim(),
        role: (newStaffData.role === "CASHIER" || String(newStaffData.role).toLowerCase() === "cashier" || String(newStaffData.role).toLowerCase() === "caissier") ? "register" : newStaffData.role,
        hospitalId,
        schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        createdAt: serverTimestamp()
      };

      if (accountType === "healthone") {
        userData.username = newStaffData.username.toLowerCase().trim();
        userData.email = resolvedEmail;
        userData.password = newStaffData.password.trim();
        userData.status = "PENDING_APPROVAL";
        userData.isLocalStaff = false;
      } else {
        userData.username = "";
        userData.email = "";
        userData.password = "";
        userData.status = "ACTIVE";
        userData.isLocalStaff = true;
      }

      // Save user record inside the main Firestore "users" collection
      await setDoc(doc(db, "users", newUid), userData);

      if (accountType === "healthone") {
        alert(language === 'fr' 
          ? `Le compte utilisateur @${newStaffData.username.toLowerCase().trim()} a été enregistré avec succès !`
          : `User Account @${newStaffData.username.toLowerCase().trim()} successfully registered and configured for your hospital!`);
      } else {
        alert(language === 'fr' 
          ? `La fiche personnelle de ${newStaffData.name.trim()} a été enregistrée avec succès !`
          : `Personnel record for ${newStaffData.name.trim()} successfully registered and configured!`);
      }

      setShowAddModal(false);
      setNewStaffData({
        name: "",
        username: "",
        email: "",
        password: "",
        role: "NURSE"
      });
      setAccountType("healthone");
      fetchStaff();
    } catch (error: any) {
      console.error("Error registered new user:", error);
      alert("Failed to register staff account: " + error.message);
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (err) {
          console.error("Error destroying secondary app instance:", err);
        }
      }
      setCreatingUser(false);
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

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStaffData(p => ({ ...p, password: pwd }));
  };

  const suggestUsername = () => {
    if (!newStaffData.name) {
      alert(language === 'fr' 
        ? "Veuillez d'abord saisir le nom complet pour générer un nom d'utilisateur." 
        : "Please enter the Full Name first to generate a username.");
      return;
    }
    const suggested = generateUsernameFromName(newStaffData.name);
    setNewStaffData(p => ({ ...p, username: suggested }));
  };

  const filteredStaff = staff.filter(s => {
    const matchesName = (s.fullName || s.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || getNormalizedRole(s.role) === getNormalizedRole(roleFilter);
    return matchesName && matchesRole;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div className="print:hidden space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase">{t("staffManagement")}</h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">HR_MODULE / PERSONNEL_LOGS</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={() => window.print()}
            className="h-10 bg-slate-800 text-white px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:bg-slate-900 transition-all border border-app-line select-none cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" /> {t("printList")}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="h-10 bg-app-ink text-app-bg px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> {t("staff")} [{t("newRegistration").toUpperCase()}]
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-app-line p-4 flex flex-col md:flex-row items-center gap-4 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={language === 'fr' ? "Rechercher par nom..." : "Search staff by name..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2.5 font-mono text-xs focus:outline-none focus:border-slate-800 transition-colors rounded-lg"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2.5 font-mono text-xs focus:outline-none focus:border-slate-800 transition-colors rounded-lg w-full md:w-48 cursor-pointer"
            >
              <option value="ALL">{language === 'fr' ? "TOUS LES RÔLES" : "ALL ROLES"}</option>
              <option value="DOCTOR">{t("doctor") || "Doctor"}</option>
              <option value="NURSE">{t("nurse") || "Nurse"}</option>
              <option value="RECEPTIONIST">{t("receptionist") || "Receptionist"}</option>
              <option value="PHARMACIST">{t("pharmacist") || "Pharmacist"}</option>
              <option value="CASHIER">{t("cashier") || "Cashiers"}</option>
              <option value="HR">{t("hr") || "HR Managers"}</option>
              <option value="ADMIN">{t("admin") || "Administrators"}</option>
            </select>
          </div>

          <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 w-full sm:w-auto shrink-0 select-none">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex-1 sm:flex-initial py-1.5 px-3 rounded flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "calendar"
                  ? "bg-app-ink text-app-bg shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title={language === 'fr' ? "Vue Calendrier" : "Calendar View"}
            >
              <Calendar className="w-3.5 h-3.5" />
              {language === 'fr' ? "Calendrier" : "Calendar"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:flex-initial py-1.5 px-3 rounded flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "list"
                  ? "bg-app-ink text-app-bg shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title={language === 'fr' ? "Vue Liste" : "List View"}
            >
              <List className="w-3.5 h-3.5" />
              {language === 'fr' ? "Liste" : "List"}
            </button>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 font-sans">
          {filteredStaff.length === 0 ? (
            <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 font-serif italic text-xs">
              No matching staff members found in this hospital tenant node.
            </div>
          ) : (
            filteredStaff.map((s) => (
              <div key={s.id} className="bg-white border border-app-line p-6 relative group overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all">
                 {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Users className="w-24 h-24" />
                </div>

                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-app-ink text-app-bg flex items-center justify-center font-mono text-sm rounded select-none">
                      {(s.fullName || s.name || "S").charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg leading-tight text-slate-900">{s.fullName || s.name || "Staff Member"}</h3>
                        {s.isLocalStaff ? (
                          <span className="text-[8px] bg-slate-100 border border-slate-300 text-slate-600 font-mono font-bold px-1 py-0.5 rounded uppercase tracking-wider">
                            {language === 'fr' ? "Pers. Simple" : "Local Rec"}
                          </span>
                        ) : (
                          <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold px-1 py-0.5 rounded uppercase tracking-wider">
                            HealthOne
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{t(s.role)}</p>
                      {s.username ? (
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">@{s.username}</p>
                      ) : (
                        <p className="text-[9px] font-mono text-slate-400 italic mt-0.5">
                          {language === 'fr' ? "Pas d'accès de connexion" : "No login access"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 border font-mono uppercase rounded-full ${getStatusColor(s.status)}`}>
                    {t(s.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs font-mono opacity-80 uppercase tracking-wider font-bold">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400 font-mono" /> {t("schedules") || "Schedule Availability"}
                    </span>
                    
                    <button
                      onClick={() => setViewingStaffSchedule(s)}
                      title={language === 'fr' ? "Planifier par date" : "Schedule via Calendar"}
                      className="p-1 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-100 rounded transition-colors cursor-pointer flex items-center gap-1 text-[9px] uppercase font-mono tracking-wider font-bold"
                    >
                      <Calendar className="w-3 h-3" />
                      {language === 'fr' ? "Calendrier" : "Calendar"}
                    </button>
                  </div>

                  <MiniAuditedCalendar 
                    schedule={s.schedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']}
                    onChangeSchedule={async (newSchedule) => {
                      try {
                        const docRef = doc(db, "users", s.id);
                        await updateDoc(docRef, { schedule: newSchedule });
                        setStaff(prev => prev.map(u => u.id === s.id ? { ...u, schedule: newSchedule } : u));
                      } catch (err) {
                        console.error("Failed to update staff schedule:", err);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-1 border-t border-app-line pt-4">
                  <button 
                    onClick={() => updateStatus(s.id, 'ACTIVE')}
                    title={t("setActive")}
                    className="flex-1 h-8 border border-app-line rounded flex items-center justify-center hover:bg-green-50 transition-colors cursor-pointer"
                  >
                    <Power className="w-3 h-3 text-green-600" />
                  </button>
                  <button 
                    onClick={() => updateStatus(s.id, 'ON_VACATION')}
                    title={t("onVacation")}
                    className="flex-1 h-8 border border-app-line rounded flex items-center justify-center hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Plane className="w-3 h-3 text-blue-600" />
                  </button>
                  <button 
                    onClick={() => updateStatus(s.id, 'OFF')}
                    title={t("offDuty")}
                    className="flex-1 h-8 border border-app-line rounded flex items-center justify-center hover:bg-orange-50 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3 h-3 text-orange-600" />
                  </button>
                  <button 
                    onClick={() => updateStatus(s.id, 'TERMINATED')}
                    title={t("terminateAction")}
                    className="flex-1 h-8 border border-app-line rounded flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <UserMinus className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Clean and compact tabular list view */
        <div className="bg-white border border-app-line rounded-xl overflow-hidden shadow-sm font-sans">
          {filteredStaff.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl m-4 p-12 text-center text-slate-400 font-serif italic text-xs">
              No matching staff members found in this hospital tenant node.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-app-line text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">
                    <th className="p-4 pl-6">{language === 'fr' ? "MEMBRE DU PERSONNEL" : "STAFF MEMBER"}</th>
                    <th className="p-4">{language === 'fr' ? "RÔLE DÉSIGNÉ" : "ASSIGNED ROLE"}</th>
                    <th className="p-4">{language === 'fr' ? "PLANIFICATION DU SERVICE" : "WEEKLY DUTY PROFILE"}</th>
                    <th className="p-4">{language === 'fr' ? "STATUT" : "STATUS"}</th>
                    <th className="p-4 pr-6 text-right">{language === 'fr' ? "ACTIONS" : "ACTIONS"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-line">
                  {filteredStaff.map((s) => {
                    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-app-ink text-app-bg flex items-center justify-center font-bold text-xs select-none shrink-0 font-sans">
                              {(s.fullName || s.name || "S").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 text-sm truncate font-sans">{s.fullName || s.name || "Staff Member"}</span>
                                {s.isLocalStaff ? (
                                  <span className="text-[8px] bg-slate-100 border border-slate-300 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    {language === 'fr' ? "Pers. Simple" : "Local Rec"}
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    HealthOne
                                  </span>
                                )}
                              </div>
                              {s.username ? (
                                <span className="text-[10px] text-slate-400 font-mono block">@{s.username}</span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic block">
                                  {language === 'fr' ? "Pas d'accès de connexion" : "No login access"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold uppercase tracking-wider text-[10px] text-slate-600">
                          {t(s.role)}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 justify-center">
                            <div className="flex items-center gap-1 select-none">
                              {weekdays.map((day) => {
                                const short = language === 'fr' ? weekdayShortFr[day] : weekdayShortEn[day];
                                const hasDay = s.schedule && s.schedule.includes(day);
                                return (
                                  <span 
                                    key={day} 
                                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono uppercase border transition-all ${
                                      hasDay 
                                        ? "bg-emerald-500 border-emerald-600 text-white shadow-xs font-extrabold" 
                                        : "bg-slate-50 border-slate-205 text-slate-300"
                                    }`}
                                    title={language === 'fr' ? weekdayDisplayFr[day] || day : day}
                                  >
                                    {short}
                                  </span>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => setViewingStaffSchedule(s)}
                              className="text-[10px] font-mono text-blue-600 hover:text-blue-800 font-bold uppercase flex items-center gap-1 w-fit transition-colors hover:underline cursor-pointer"
                            >
                              <Calendar className="w-3 h-3" />
                              {language === 'fr' ? "Planifier par Calendrier" : "Schedule via Calendar"}
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] px-2 py-0.5 border font-mono uppercase rounded-full inline-block ${getStatusColor(s.status)}`}>
                            {t(s.status)}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => updateStatus(s.id, 'ACTIVE')}
                              title={t("setActive")}
                              className="w-7 h-7 border border-app-line rounded flex items-center justify-center hover:bg-green-50 transition-colors cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5 text-green-600" />
                            </button>
                            <button 
                              onClick={() => updateStatus(s.id, 'ON_VACATION')}
                              title={t("onVacation")}
                              className="w-7 h-7 border border-app-line rounded flex items-center justify-center hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Plane className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button 
                              onClick={() => updateStatus(s.id, 'OFF')}
                              title={t("offDuty")}
                              className="w-7 h-7 border border-app-line rounded flex items-center justify-center hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-orange-600" />
                            </button>
                            <button 
                              onClick={() => updateStatus(s.id, 'TERMINATED')}
                              title={t("terminateAction")}
                              className="w-7 h-7 border border-app-line rounded flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 rounded-xl">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2">{t("staff")} [REG_FORM]</h2>
            
            <form onSubmit={handleAddStaff} className="space-y-4">
              {/* Account Type Selector with Explanations */}
              <div className="bg-slate-50 border border-app-line p-3.5 rounded-lg space-y-3">
                <span className="block text-[10px] uppercase font-mono opacity-50 tracking-wider">
                  {language === 'fr' ? "Type d'enregistrement" : "Registration Type"}
                </span>
                
                <div className="flex gap-2 p-1 bg-white border border-app-line rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAccountType("healthone")}
                    className={`flex-1 py-1.5 text-[11px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                      accountType === "healthone"
                        ? "bg-app-ink text-app-bg shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {language === 'fr' ? "Compte HealthOne" : "HealthOne Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("local")}
                    className={`flex-1 py-1.5 text-[11px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                      accountType === "local"
                        ? "bg-app-ink text-app-bg shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {language === 'fr' ? "Personnel Simple" : "Staff Record"}
                  </button>
                </div>

                {/* Dynamic explanations describing differences clearly */}
                <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed bg-white border border-slate-100 p-2.5 rounded-md">
                  {accountType === "healthone" ? (
                    <>
                      <p className="font-bold text-slate-800 uppercase text-[9px] tracking-wide font-mono text-indigo-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full inline-block animate-pulse" />
                        {language === 'fr' ? "Système avec identifiants" : "Full access credentialed user"}
                      </p>
                      <p className="text-[11px]">
                        {language === 'fr' 
                          ? "Crée des accès d'authentification réels. L'employé disposera d'un mot de passe et pourra se connecter au système pour gérer les dossiers, patients et rapports d'évolution."
                          : "Creates standard active login credentials. Allows this member to log in to the facility dashboard, interact with patient files, and submit notes."}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-slate-800 uppercase text-[9px] tracking-wide font-mono text-emerald-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block" />
                        {language === 'fr' ? "Enregistrement local uniquement" : "Local administrative record only"}
                      </p>
                      <p className="text-[11px]">
                        {language === 'fr' 
                          ? "Crée un profil de présence sans mot de passe ni identifiants. Parfait pour ajouter des infirmiers ou médecins au planning interne, au tableau de garde et au registre RH sans leur donner d'accès de connexion."
                          : "Adds a physical person entry for duty scheduling, work calendars, and HR purposes. They will not be able to log in to the software."}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">{t("fullName")}</label>
                <input 
                  type="text" 
                  required 
                  value={newStaffData.name}
                  onChange={(e) => {
                    const nameVal = e.target.value;
                    const autoUsername = generateUsernameFromName(nameVal);
                    setNewStaffData(prev => ({ ...prev, name: nameVal, username: autoUsername }));
                  }}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink rounded-lg"
                />
              </div>

              {accountType === "healthone" && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-mono opacity-50">Username / Nom d'utilisateur</label>
                      <button 
                        type="button" 
                        onClick={suggestUsername}
                        className="text-[9px] font-mono text-blue-600 hover:underline cursor-pointer"
                      >
                        {language === 'fr' ? "Suggérer" : "Suggest"}
                      </button>
                    </div>
                    <input 
                      type="text" 
                      required={accountType === "healthone"}
                      placeholder="e.g. jdoe"
                      value={newStaffData.username}
                      onChange={(e) => setNewStaffData({...newStaffData, username: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">
                      {t("email")} {language === 'fr' ? "(Optionnel)" : "(Optional)"}
                    </label>
                    <input 
                      type="type" 
                      value={newStaffData.email}
                      onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-mono opacity-50">Password / Mot de passe</label>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required={accountType === "healthone"}
                        placeholder="Enter password..."
                        value={newStaffData.password}
                        onChange={(e) => setNewStaffData({...newStaffData, password: e.target.value})}
                        className="w-full bg-white border border-app-line pl-10 pr-4 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink rounded-lg bg-slate-50/50"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">{t("designatedRole")}</label>
                <select 
                  value={newStaffData.role}
                  onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value as UserRole})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink rounded-lg cursor-pointer"
                >
                  <option value="DOCTOR">{t("doctor")}</option>
                  <option value="NURSE">{t("nurse")}</option>
                  <option value="RECEPTIONIST">{t("receptionist")}</option>
                  <option value="PHARMACIST">{t("pharmacist")}</option>
                  <option value="CASHIER">{t("cashier")}</option>
                  <option value="HR">{t("hr")}</option>
                  <option value="ADMIN">{t("admin")}</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-app-line">
                <button 
                  type="button" 
                  disabled={creatingUser}
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-app-line font-mono text-[10px] uppercase hover:bg-gray-100 transition-colors rounded-lg cursor-pointer flex items-center justify-center"
                >
                  {t("halt")}
                </button>
                <button 
                  type="submit" 
                  disabled={creatingUser}
                  className="px-8 py-2 bg-app-ink text-app-bg font-mono text-[10px] uppercase hover:opacity-90 transition-opacity rounded-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  {creatingUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : (
                    t("accreditStaff")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingStaffSchedule && (
        <WorkCalendarModal 
          isOpen={!!viewingStaffSchedule}
          onClose={() => setViewingStaffSchedule(null)}
          schedule={viewingStaffSchedule.schedule || []}
          onSaveSchedule={handleSaveStaffSchedule}
          name={viewingStaffSchedule.name}
          role={t(viewingStaffSchedule.role)}
        />
      )}
      </div>

      {/* PRINT-ONLY EXCEL-LIKE SPREADSHEET CONTAINER */}
      <div className="hidden print:block w-full bg-white text-slate-950 p-6 min-h-screen">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight uppercase leading-none">HealthOne Hospital Network</h1>
            <p className="text-sm font-mono uppercase tracking-widest text-slate-700 font-bold mt-2">
              {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : "Hospital")}
            </p>
            <p className="text-[10px] font-mono mt-1 text-slate-500 font-bold uppercase tracking-wider">
              {language === 'fr' ? "LISTE GENERALE DU PERSONNEL ACCOMPAGNANT" : "GENERAL CLINICAL STAFF LOGS"}
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p className="font-bold">EXPORTED: {new Date().toLocaleDateString()}</p>
            <p className="text-slate-500 mt-1 font-bold">{filteredStaff.length} ROWS</p>
          </div>
        </div>

        <table className="excel-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>{language === 'fr' ? "Nom Complet" : "Full Name"}</th>
              <th>{t("role") || "Role"}</th>
              <th>{language === 'fr' ? "Nom d'Utilisateur" : "Username"}</th>
              <th>{t("status") || "Status"}</th>
              <th>{t("schedules") || "Weekly Schedule"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((s, idx) => (
              <tr key={s.id}>
                <td className="font-mono text-[10px]">{idx + 1}</td>
                <td className="font-bold">{s.fullName || s.name || "—"}</td>
                <td className="uppercase font-mono text-[10px]">{t(s.role)}</td>
                <td className="font-mono text-[10px]">{s.username ? `@${s.username}` : "—"}</td>
                <td className="uppercase font-mono text-[10px]">{t(s.status)}</td>
                <td>
                  <span className="text-[10px] font-mono">
                    {(s.schedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).join(", ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer for Excel Sheet */}
        <div className="print-footer">
          <span>HealthOne</span>
          <span>Jerttech</span>
        </div>
      </div>
    </div>
  );
}
