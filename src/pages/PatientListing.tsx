import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDocs,
  limit,
  doc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useOfflineSync } from "../contexts/OfflineSyncContext";
import { Search, UserPlus, ArrowRight, User, Trash2, AlertCircle, RefreshCw, Printer } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getNormalizedRole } from "../lib/utils";

export default function PatientListing() {
  const { hospitalId, profile } = useAuth();
  const { t, language } = useLanguage();
  const { isOfflineMode, addOfflineDoc, getQueuedItemsForCollection, removeQueuedItem } = useOfflineSync();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [patients, setPatients] = useState<any[]>(() => {
    if (!hospitalId) return [];
    try {
      const cached = localStorage.getItem(`healthone_cached_all_patients_${hospitalId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(!isOfflineMode && patients.length === 0);
  const [showRegModal, setShowRegModal] = useState(false);

  // Deletion State
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const userRole = getNormalizedRole(profile?.role);
  const canAddPatient = userRole === "REGISTER" || userRole === "ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN";
  const canDeletePatient = userRole === "REGISTER" || userRole === "ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN";

  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch) {
      setSearchTerm(querySearch);
    }
    if (searchParams.get("register") === "true" && canAddPatient) {
      setShowRegModal(true);
    }
  }, [searchParams, canAddPatient]);
  
  // Registration Form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "Other",
    phone: "",
    email: "",
    department: "General Medicine"
  });

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      if (patientToDelete.id.startsWith("offline_")) {
        removeQueuedItem(patientToDelete.id);
      } else if (isOfflineMode) {
        setIsDeleting(false);
        return;
      } else {
        await deleteDoc(doc(db, "patients", patientToDelete.id));
      }
      setShowDeleteConfirm(false);
      setPatientToDelete(null);
    } catch (err) {
      console.error("Failed to delete patient:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (!hospitalId) {
      setLoading(false);
      return;
    }

    // Load from cache initially
    try {
      const cachedPatients = localStorage.getItem(`healthone_cached_all_patients_${hospitalId}`);
      if (cachedPatients) {
        setPatients(JSON.parse(cachedPatients));
      }
    } catch (e) {
      console.error("Failed to load cached patients:", e);
    }

    if (isOfflineMode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "patients"), 
      where("hospitalId", "==", hospitalId)
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to Avoid missing index error
      patientData.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setPatients(patientData);
      try {
        localStorage.setItem(`healthone_cached_all_patients_${hospitalId}`, JSON.stringify(patientData));
      } catch (e) {
        console.error("Failed to save patient cache:", e);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching patients:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [hospitalId, isOfflineMode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("HANDLE_REGISTER_TRIGGERED", { hospitalId, formData });
    setFormError(null);
    setIsSubmitting(true);
    
    if (!canAddPatient) {
      setFormError("UNAUTHORIZED: Only Registrar and Admin roles can register new patients.");
      setIsSubmitting(false);
      return;
    }
    
    if (!hospitalId) {
      console.error("REGISTRATION_BLOCKED: No hospitalId found in context/profile");
      setFormError("SYSTEM_ERROR: No assigned hospital found for this account. Please contact an admin.");
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("PROCEEDING_WITH_ADD_DOC", { hospitalId, isOfflineMode });
      // Basic age calculation
      const birthDate = new Date(formData.dateOfBirth);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      const patientPayload = {
        ...formData,
        age,
        hospitalId: hospitalId,
        status: "Registered",
        createdAt: isOfflineMode ? new Date().toISOString() : serverTimestamp(),
        updatedAt: isOfflineMode ? new Date().toISOString() : serverTimestamp(),
        registeredBy: profile?.id || "unknown"
      };

      let docId = "";
      if (isOfflineMode) {
        const res = await addOfflineDoc(
          "patients", 
          patientPayload, 
          `Patient: ${formData.firstName} ${formData.lastName}`
        );
        docId = res.id;
      } else {
        const docRef = await addDoc(collection(db, "patients"), patientPayload);
        docId = docRef.id;
      }
      
      console.log("SUCCESSFUL_REGISTRATION:", docId);
      setShowRegModal(false);
      navigate(`/patients/${docId}`);
    } catch (error: any) {
      console.error("Error registering patient:", error);
      setFormError(`Registration failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const offlinePatients = getQueuedItemsForCollection("patients")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));

  const mergedPatients = [...offlinePatients, ...patients];

  const filteredPatients = mergedPatients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {isOfflineMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block animate-ping" />
            <span>
              {language === 'fr' 
                ? "Mode hors ligne actif. Nouvelles inscriptions enregistrées localement et prêtes pour synchro." 
                : "Offline mode active. New registrations are saved locally and queued for synchronization."}
            </span>
          </div>
          <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
            {language === 'fr' ? "HORS LIGNE" : "STANDALONE"}
          </span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t("patients")}</h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
            {t("managingRecords").replace("{count}", patients.length.toString())}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 w-full sm:w-auto font-mono uppercase tracking-widest select-none cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            {t("printList")}
          </button>
          {canAddPatient && (
            <button 
              onClick={() => setShowRegModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 w-full sm:w-auto shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {t("registerPatient")}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative group flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder={`${t("search")}...`} 
              className="w-full pl-9 pr-4 py-1.5 bg-white border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none border transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="col-header">
                <th className="p-3 pl-4 sm:pl-6 text-[10px] uppercase text-slate-400 font-bold">#</th>
                <th className="p-3 text-[10px] uppercase text-slate-400 font-bold">{t("patientName")}</th>
                <th className="p-3 text-[10px] uppercase text-slate-400 font-bold hidden md:table-cell">{t("demographics")}</th>
                <th className="p-3 text-[10px] uppercase text-slate-400 font-bold hidden sm:table-cell">{t("contact")}</th>
                <th className="p-3 pr-4 sm:pr-6 text-right text-[10px] uppercase text-slate-400 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                    {t("syncingRecords").toUpperCase()}
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-xs font-bold text-slate-400">
                    {t("noRecordsFound")}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p, idx) => (
                  <tr 
                    key={p.id} 
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="data-row group cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3 pl-4 sm:pl-6 font-mono text-slate-400 text-[10px]">#{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] border border-blue-100 shrink-0">
                          {p.firstName?.charAt(0) || 'P'}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-blue-600 group-hover:underline text-xs sm:text-sm">
                              {p.firstName} {p.lastName}
                            </span>
                            {p.isOfflinePending && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse whitespace-nowrap">
                                Offline Draft
                              </span>
                            )}
                          </div>
                          <span className="sm:hidden text-[9px] text-slate-400 uppercase font-mono">{p.phone || t("NO_PHONE")}</span>
                        </div>
                      </div>
                    </td>
                     <td className="p-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 uppercase">
                          {t(p.gender?.toUpperCase() || 'OTHER').charAt(0)} / {p.dateOfBirth}
                        </span>
                        {p.age && (
                          <span className="bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600">
                            {p.age} Y {t("years")}
                          </span>
                        )}
                        {p.department && (
                          <span className="bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-purple-700 uppercase font-mono">
                            {t(p.department === "Pediatrics" ? "pediatricsDept" : p.department === "General Medicine" ? "generalMedicineDept" : p.department === "Emergency" ? "emergencyDept" : p.department === "Cardiology" ? "cardiologyDept" : p.department)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[10px] uppercase hidden sm:table-cell">
                      {p.phone || t("NO_PHONE")}
                    </td>
                    <td className="p-3 pr-4 sm:pr-6 whitespace-nowrap">
                      <div className="flex justify-end items-center gap-2">
                        {canDeletePatient && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPatientToDelete(p);
                              setShowDeleteConfirm(true);
                            }}
                            disabled={isOfflineMode && !p.id.startsWith("offline_")}
                            className={`w-7 h-7 rounded flex items-center justify-center transition-all border border-transparent ${
                              isOfflineMode && !p.id.startsWith("offline_")
                                ? "opacity-35 cursor-not-allowed text-slate-300"
                                : "hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-100 cursor-pointer"
                            }`}
                            title={
                              isOfflineMode && !p.id.startsWith("offline_")
                                ? (language === 'fr' ? "Suppression indisponible hors ligne" : "Deletion unavailable offline")
                                : t("deletePatient")
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition-all border border-slate-200">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-2 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden xs:flex">
           <span>Total: {patients.length} | Visible: {filteredPatients.length}</span>
           <span>{t("secureChannelReady")}</span>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl my-auto relative shadow-22xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
            <div className="p-5 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <UserPlus className="w-5 h-5 text-blue-500" />
                 {t("registerPatient")}
              </h2>
              
              <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("firstName")}</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("lastName")}</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("dob")}</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("phone")}</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      placeholder="0..."
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("email")}</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      placeholder="patient@email.com"
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                     <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("gender")}</label>
                     <select 
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                     >
                       <option value="Male">{t("male")}</option>
                       <option value="Female">{t("female")}</option>
                       <option value="Other">{t("other")}</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{t("department")}</label>
                     <select 
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                     >
                       <option value="General Medicine">{t("generalMedicineDept")}</option>
                       <option value="Pediatrics">{t("pediatricsDept")}</option>
                       <option value="Emergency">{t("emergencyDept")}</option>
                       <option value="Cardiology">{t("cardiologyDept")}</option>
                     </select>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-col gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100">
                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-[10px] font-bold uppercase mb-2">
                      {formError}
                    </div>
                  )}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button 
                      type="button" 
                      disabled={isSubmitting}
                      onClick={() => setShowRegModal(false)}
                      className="px-6 py-2.5 text-slate-500 font-bold text-xs uppercase hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {t("cancel")}
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="px-10 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-400 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? '...' : t("save")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {showDeleteConfirm && patientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-red-100 w-full max-w-md my-auto relative shadow-22xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                {t("deletePatient")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                {t("deletePatientMsg")}{" "}
                <span className="font-bold text-slate-800 font-mono">
                  ({patientToDelete.firstName} {patientToDelete.lastName})
                </span>
              </p>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  disabled={isDeleting}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPatientToDelete(null);
                  }}
                  className="px-6 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button 
                  type="button" 
                  disabled={isDeleting}
                  onClick={handleDeletePatient}
                  className="px-8 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-rose-200 hover:bg-red-700 transition-all active:scale-95 disabled:bg-slate-400"
                >
                  {isDeleting ? "..." : t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY EXCEL-LIKE SPREADSHEET CONTAINER */}
      <div className="hidden print:block w-full bg-white text-slate-950 p-6 min-h-screen">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight uppercase leading-none">HealthOne Hospital Network</h1>
            <p className="text-sm font-mono uppercase tracking-widest text-slate-700 font-bold mt-2">
              {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : "Hospital")}
            </p>
            <p className="text-[10px] font-mono mt-1 text-slate-500 font-bold uppercase tracking-wider">
              {language === 'fr' ? "REGISTRE GENERAL DES PATIENTS" : "GENERAL PATIENTS REGISTRY LOGS"}
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p className="font-bold">EXPORTED: {new Date().toLocaleDateString()}</p>
            <p className="text-slate-500 mt-1 font-bold">{filteredPatients.length} ROWS</p>
          </div>
        </div>

        <table className="excel-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>{t("patientName") || "Patient Name"}</th>
              <th>{language === 'fr' ? "Genre" : "Gender"}</th>
              <th>{language === 'fr' ? "Né(e) Le" : "Date of Birth"}</th>
              <th>{language === 'fr' ? "Téléphone" : "Phone"}</th>
              <th>{language === 'fr' ? "Département" : "Department"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((p, idx) => (
              <tr key={p.id}>
                <td className="font-mono text-[10px]">{idx + 1}</td>
                <td className="font-bold">{p.firstName} {p.lastName}</td>
                <td className="uppercase">{t(p.gender?.toUpperCase() || 'OTHER')}</td>
                <td>{p.dateOfBirth || "—"}</td>
                <td className="font-mono">{p.phone || "—"}</td>
                <td className="font-mono uppercase">{p.department || "GEN_MEDICINE"}</td>
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
