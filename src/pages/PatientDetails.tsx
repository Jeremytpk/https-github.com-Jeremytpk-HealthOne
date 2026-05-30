import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  orderBy,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getNormalizedRole } from "../lib/utils";
import { 
  Calendar, 
  Phone, 
  Mail, 
  ChevronLeft, 
  Activity, 
  History, 
  Plus,
  Send,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Pill,
  Pencil,
  Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hospitalId, profile } = useAuth();
  const { t, language } = useLanguage();
  
  const [patient, setPatient] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to format case date to group/compare
  const getCaseDateLabel = (c: any) => {
    const isFr = language === "fr";
    const pattern = isFr ? 'dd/MM/yyyy' : 'MMMM dd, yyyy';
    if (c.createdAt?.seconds) {
      return format(c.createdAt.toDate(), pattern);
    } else if (c.createdAt instanceof Date) {
      return format(c.createdAt, pattern);
    } else if (typeof c.createdAt === 'string') {
      try {
        return format(new Date(c.createdAt), pattern);
      } catch (e) {}
    }
    return t("recentlyAdded") || "Recently Added";
  };
  
  // New Case/Note state
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [newCaseData, setNewCaseData] = useState({ title: "", description: "", hasMedicines: false, medicines: "" });

  // Edit/Delete state hooks
  const [showEditCaseModal, setShowEditCaseModal] = useState(false);
  const [editCaseData, setEditCaseData] = useState({ title: "", description: "", hasMedicines: false, medicines: "" });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [showDeleteCaseConfirm, setShowDeleteCaseConfirm] = useState(false);
  const [showCloseCaseConfirm, setShowCloseCaseConfirm] = useState(false);
  const [showReopenCaseConfirm, setShowReopenCaseConfirm] = useState(false);

  // Patient Deletion States
  const [showDeletePatientConfirm, setShowDeletePatientConfirm] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);

  const userRole = getNormalizedRole(profile?.role);
  const canDeletePatient = userRole === "REGISTER" || userRole === "ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN";

  const handleDeletePatient = async () => {
    if (!patient || !profile) return;
    setIsDeletingPatient(true);
    try {
      await deleteDoc(doc(db, "patients", patient.id));
      setShowDeletePatientConfirm(false);
      navigate("/patients");
    } catch (error) {
      console.error("Error deleting patient:", error);
    } finally {
      setIsDeletingPatient(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPatient();
      fetchCases();
    }
  }, [id]);

  useEffect(() => {
    if (selectedCase) {
      fetchNotes(selectedCase.id);
    }
  }, [selectedCase]);

  const fetchPatient = async () => {
    const docSnap = await getDoc(doc(db, "patients", id!));
    if (docSnap.exists()) setPatient({ id: docSnap.id, ...docSnap.data() });
    setLoading(false);
  };

  const fetchCases = async () => {
    const q = query(
      collection(db, "medical_cases"), 
      where("patientId", "==", id!)
    );
    const querySnapshot = await getDocs(q);
    const fetchedCases = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    fetchedCases.sort((a: any, b: any) => {
      const getMillis = (t: any) => t && typeof t.toMillis === 'function' ? t.toMillis() : (t?.seconds ? t.seconds * 1000 : 0);
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
    setCases(fetchedCases);
    if (fetchedCases.length > 0 && !selectedCase) {
        setSelectedCase(fetchedCases[0]);
    }
  };

  const fetchNotes = async (caseId: string) => {
    const q = query(
      collection(db, "evolution_notes"), 
      where("caseId", "==", caseId)
    );
    const querySnapshot = await getDocs(q);
    const fetchedNotes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    fetchedNotes.sort((a: any, b: any) => {
      const getMillis = (t: any) => t && typeof t.toMillis === 'function' ? t.toMillis() : (t?.seconds ? t.seconds * 1000 : 0);
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
    setNotes(fetchedNotes);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCase || !profile) return;

    try {
      await addDoc(collection(db, "evolution_notes"), {
        caseId: selectedCase.id,
        patientId: id,
        hospitalId: hospitalId || selectedCase.hospitalId || patient?.hospitalId || "",
        authorId: profile.id,
        authorName: profile.fullName || profile.name || profile.username || "Staff",
        authorRole: profile.role || "Staff",
        content: newNote,
        createdAt: serverTimestamp()
      });
      setNewNote("");
      fetchNotes(selectedCase.id);
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaseError(null);
    if (!profile) {
      setCaseError("ERROR: No authenticated user profile found.");
      return;
    }

    const resolvedHospitalId = hospitalId || patient?.hospitalId || profile.hospitalId || "";
    if (!resolvedHospitalId) {
      setCaseError("ERROR: Hospital identifier missing. Please ensure your account has a hospital assigned.");
      return;
    }

    try {
      const caseRefData: any = {
        title: newCaseData.title.trim(),
        description: newCaseData.description.trim(),
        patientId: id,
        hospitalId: resolvedHospitalId,
        authorId: profile.id,
        authorName: profile.fullName || profile.name || profile.username || "Staff",
        authorRole: profile.role || "Staff",
        status: "OPEN",
        createdAt: serverTimestamp()
      };
      if (newCaseData.hasMedicines) {
        caseRefData.medicines = newCaseData.medicines.trim();
      }

      const docRef = await addDoc(collection(db, "medical_cases"), caseRefData);
      setShowCaseModal(false);
      setNewCaseData({ title: "", description: "", hasMedicines: false, medicines: "" });
      fetchCases();
      // Auto-select the new case
      const newCase = { 
        id: docRef.id, 
        title: newCaseData.title.trim(),
        description: newCaseData.description.trim(),
        authorId: profile.id, 
        authorName: profile.fullName || profile.name || profile.username || "Staff",
        authorRole: profile.role || "Staff",
        hospitalId: resolvedHospitalId,
        medicines: newCaseData.hasMedicines ? newCaseData.medicines.trim() : "",
        status: "OPEN" 
      };
      setSelectedCase(newCase);
    } catch (error: any) {
      console.error("Error creating case:", error);
      setCaseError(`FAILED_TO_SAVE: ${error.message || "Please check database connection and match rules."}`);
    }
  };

  const handleEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !profile) return;

    try {
      const caseRef = doc(db, "medical_cases", selectedCase.id);
      const updateData: any = {
        title: editCaseData.title.trim(),
        description: editCaseData.description.trim(),
      };
      if (editCaseData.hasMedicines) {
        updateData.medicines = editCaseData.medicines.trim();
      } else {
        updateData.medicines = "";
      }

      await updateDoc(caseRef, updateData);

      setSelectedCase({
        ...selectedCase,
        title: editCaseData.title.trim(),
        description: editCaseData.description.trim(),
        medicines: editCaseData.hasMedicines ? editCaseData.medicines.trim() : "",
      });
      setShowEditCaseModal(false);
      fetchCases();
    } catch (error) {
      console.error("Error editing case:", error);
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase || !profile) return;

    try {
      await deleteDoc(doc(db, "medical_cases", selectedCase.id));
      const remainingCases = cases.filter(c => c.id !== selectedCase.id);
      setCases(remainingCases);
      if (remainingCases.length > 0) {
        setSelectedCase(remainingCases[0]);
      } else {
        setSelectedCase(null);
        setNotes([]);
      }
      setShowDeleteCaseConfirm(false);
    } catch (error) {
      console.error("Error deleting case:", error);
    }
  };

  const handleCloseCase = async () => {
    if (!selectedCase || !profile) return;

    try {
      const caseRef = doc(db, "medical_cases", selectedCase.id);
      const closedRole = profile.role || "Staff";
      const closedName = profile.fullName || profile.name || profile.username || "Staff";

      await updateDoc(caseRef, {
        status: "CLOSED",
        closedById: profile.id,
        closedByName: closedName,
        closedByRole: closedRole,
        closedAt: serverTimestamp()
      });

      setSelectedCase({
        ...selectedCase,
        status: "CLOSED",
        closedById: profile.id,
        closedByName: closedName,
        closedByRole: closedRole
      });

      setShowCloseCaseConfirm(false);
      fetchCases();
    } catch (error) {
      console.error("Error closing case:", error);
    }
  };

  const handleConfirmReopenAndEdit = async () => {
    if (!selectedCase || !profile) return;
    try {
      const caseRef = doc(db, "medical_cases", selectedCase.id);
      await updateDoc(caseRef, {
        status: "OPEN"
      });
      setSelectedCase({
        ...selectedCase,
        status: "OPEN"
      });
      setEditCaseData({ 
        title: selectedCase.title, 
        description: selectedCase.description,
        hasMedicines: !!selectedCase.medicines,
        medicines: selectedCase.medicines || ""
      });
      setShowReopenCaseConfirm(false);
      setShowEditCaseModal(true);
      fetchCases();
    } catch (error) {
      console.error("Error reopening and preparing edit for case:", error);
    }
  };

  if (loading) return <div>Loading Profile...</div>;
  if (!patient) return <div>Patient not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header with Back */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-app-line pb-6 w-full">
        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
          <button 
            onClick={() => navigate("/patients")}
            className="p-2 hover:bg-black/5 transition-colors border border-app-line shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-tight truncate flex flex-wrap items-center gap-2">
              <span>{patient.firstName} {patient.lastName}</span>
              {patient.department && (
                <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-mono uppercase font-bold px-2 py-0.5 tracking-wider rounded">
                  {t(patient.department === "Pediatrics" ? "pediatricsDept" : patient.department === "General Medicine" ? "generalMedicineDept" : patient.department === "Emergency" ? "emergencyDept" : patient.department === "Cardiology" ? "cardiologyDept" : patient.department)}
                </span>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] font-mono opacity-50 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t("birthDate").toUpperCase()}: {patient.dateOfBirth}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t(patient.gender?.toUpperCase() || 'OTHER')}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone || t("NO_PHONE")}</span>
            </div>
          </div>
        </div>
        
        {canDeletePatient && (
          <button
            onClick={() => setShowDeletePatientConfirm(true)}
            className="flex items-center gap-1.5 h-9 px-4 text-[10px] sm:self-center font-mono border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 uppercase tracking-wider font-bold transition-all shadow-none shrink-0"
            title={t("deletePatient")}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" /> {t("deletePatient")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Cases Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="col-header flex items-center gap-2">
              <History className="w-3 h-3" /> {t("history")}
            </h2>
            <button 
              onClick={() => {
                setNewCaseData({ title: "", description: "", hasMedicines: false, medicines: "" });
                setCaseError(null);
                setShowCaseModal(true);
              }}
              className="p-1 hover:bg-app-ink hover:text-app-bg transition-all border border-app-line"
              title={t("admissionEvent") || "Add History"}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-3 sm:gap-2 no-scrollbar">
            {cases.map((c, idx) => {
              const currentLabel = getCaseDateLabel(c);
              const previousLabel = idx > 0 ? getCaseDateLabel(cases[idx - 1]) : null;
              const showHeader = idx === 0 || currentLabel !== previousLabel;

              return (
                <React.Fragment key={c.id}>
                  {showHeader && (
                    <div className="flex-none lg:w-full lg:pt-4 lg:pb-1 lg:mt-2 lg:border-b lg:border-dashed lg:border-slate-200 flex items-center lg:items-start lg:block py-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-100/80 px-2.5 py-1.5 lg:bg-transparent lg:px-0 lg:py-0 border border-slate-200 lg:border-0 rounded-none whitespace-nowrap">
                        {currentLabel}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedCase(c)}
                    className={`flex-none w-64 lg:w-full text-left p-4 border border-app-line transition-all group ${
                      selectedCase?.id === c.id 
                        ? "bg-white border-2 lg:-translate-y-0.5 shadow-sm border-app-ink" 
                        : "bg-white/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono opacity-50">#{c.id.slice(-4)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-mono uppercase ${
                        c.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t(c.status)}
                      </span>
                    </div>
                    <p className="text-sm font-bold truncate group-hover:underline">{c.title}</p>
                    <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-dashed border-slate-100 text-[9px] font-mono text-slate-500">
                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1 uppercase shrink-0">{c.authorRole || "STAFF"}</span>
                      <span className="truncate">
                         {c.createdAt?.seconds ? format(c.createdAt.toDate(), language === 'fr' ? 'HH:mm' : 'hh:mm a') : t("recentlyAdded")}
                      </span>
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
            {cases.length === 0 && (
              <div className="w-full text-[10px] font-mono opacity-30 uppercase italic py-4">
                No entry history found
              </div>
            )}
          </div>
        </div>

        {/* Main Observation View */}
        <div className="lg:col-span-9 space-y-6">
          {selectedCase ? (
            <>
              <div className="bg-white border border-app-line p-5 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-100 pb-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-blue-600 shrink-0" />
                      <h3 className="text-xl sm:text-2xl font-serif italic font-bold leading-tight truncate">{selectedCase.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono opacity-60 uppercase tracking-wider pl-8">
                      <span>{t("addedByRole") || "Added by role"}:</span>
                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1 py-0.5">{selectedCase.authorRole || "STAFF"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedCase.status === 'OPEN' && (
                      <button 
                        onClick={() => setShowCloseCaseConfirm(true)}
                        className="flex items-center gap-1.5 h-8 px-3 text-[10px] font-mono border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 uppercase tracking-wider font-bold transition-all shadow-sm shrink-0"
                        title={language === 'fr' ? 'Fermer le dossier' : 'Close Case'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {language === 'fr' ? 'FERMER_CAS' : 'CLOSE_CASE'}
                      </button>
                    )}
                    {selectedCase.authorId === profile?.id && (
                      <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
                        <button 
                          onClick={() => {
                            if (selectedCase.status === 'CLOSED') {
                              setShowReopenCaseConfirm(true);
                            } else {
                              setEditCaseData({ 
                                title: selectedCase.title, 
                                description: selectedCase.description,
                                hasMedicines: !!selectedCase.medicines,
                                medicines: selectedCase.medicines || ""
                              });
                              setShowEditCaseModal(true);
                            }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border border-app-line hover:bg-slate-50 uppercase tracking-wider text-slate-600 transition-colors"
                          title="Edit Case"
                        >
                          <Pencil className="w-3 h-3" /> {t("edit") || "Edit"}
                        </button>
                        <button 
                          onClick={() => setShowDeleteCaseConfirm(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border border-red-200 text-red-600 hover:bg-red-50 uppercase tracking-wider transition-colors"
                          title="Delete Case"
                        >
                          <Trash2 className="w-3 h-3" /> {t("delete") || "Delete"}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-[10px] font-mono opacity-50">SYNCED: {notes[0] ? format(notes[0].createdAt?.toDate() || new Date(), 'HH:mm') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {selectedCase.status === 'CLOSED' && (
                  <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-200 flex gap-3 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 font-bold" />
                    <div>
                      <h4 className="text-xs font-bold font-mono text-emerald-800 uppercase tracking-wider mb-1">
                        {language === 'fr' ? "DOSSIER CLÔTURÉ" : "CASE STATUS: CLOSED"}
                      </h4>
                      <p className="text-sm font-mono text-slate-600 leading-relaxed">
                        {language === 'fr' ? "Fermé par le membre de l'équipe : " : "Closed by team member role: "}
                        <span className="font-bold text-emerald-900 bg-emerald-100/85 px-1.5 py-0.5 border border-emerald-200 rounded uppercase font-mono text-[10px] tracking-wide inline-block mr-1">
                          {selectedCase.closedByRole || "STAFF"}
                        </span>
                        {" "}
                        {language === 'fr' ? `(Nom : ${selectedCase.closedByName || "Staff"})` : `(Name: ${selectedCase.closedByName || "Staff"})`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-sm text-slate-600 mb-6 border-l-4 border-app-line pl-5 py-1 italic bg-slate-50/50">
                  {selectedCase.description}
                </div>

                {selectedCase.medicines && (
                  <div className="mb-8 p-4 bg-blue-50/50 border border-blue-100 flex gap-3">
                    <Pill className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold font-mono text-blue-800 uppercase tracking-wider mb-1">{t("prescribedMedicines")}</h4>
                      <p className="text-sm font-mono text-slate-700 whitespace-pre-wrap">{selectedCase.medicines}</p>
                    </div>
                  </div>
                )}

                {/* Evolution Input */}
                {selectedCase.status === 'OPEN' && (
                  <form onSubmit={handleAddNote} className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="relative">
                       <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="ADD_EVOLUTION_REPORT..."
                        className="w-full bg-app-bg/30 border border-app-line p-4 font-mono text-sm min-h-[140px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-app-ink transition-all shadow-inner block"
                      />
                      <div className="absolute top-3 right-3 hidden sm:flex gap-2">
                         <span className="text-[9px] font-mono opacity-30 bg-white/80 px-1">MD_EDITOR_ACTIVE</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                          <button type="button" className="shrink-0 text-[10px] uppercase font-mono opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap">
                            <Stethoscope className="w-3.5 h-3.5" /> EQUIP_LINK
                          </button>
                          <button type="button" className="shrink-0 text-[10px] uppercase font-mono opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap">
                            <Pill className="w-3.5 h-3.5" /> MED_REQ
                          </button>
                      </div>
                      <button 
                        type="submit"
                        disabled={!newNote.trim()}
                        className="h-10 sm:h-12 bg-app-ink text-app-bg px-8 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                      >
                        SUBMIT <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Timeline of Evolution */}
              <div className="space-y-4">
                <h4 className="col-header border-b border-app-line pb-2 font-bold tracking-[0.2em] flex items-center justify-between">
                  EVOLUTION_STREAM
                  <span className="text-[9px] font-normal opacity-50">{notes.length} RECORDS</span>
                </h4>
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-white border border-app-line p-4 flex gap-4 sm:gap-6 hover:shadow-md transition-all">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-slate-50 border border-app-line flex items-center justify-center font-mono text-xs mb-2">
                          {note.authorName?.charAt(0)}
                        </div>
                        <div className="w-0.5 flex-1 bg-app-line/20" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono tracking-tight">{note.authorName}</span>
                            <span className="text-[8px] sm:text-[9px] border border-app-line px-1.5 py-0.5 opacity-50 uppercase font-mono bg-slate-50">{note.authorRole}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {note.authorId === profile?.id && editingNoteId !== note.id && deletingNoteId !== note.id && (
                              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 mr-1">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteContent(note.content);
                                    setDeletingNoteId(null);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                  title="Edit Note"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingNoteId(note.id);
                                    setEditingNoteId(null);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete Note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <span className="text-[9px] font-mono opacity-30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> {note.createdAt ? format(note.createdAt.toDate(), language === 'fr' ? 'dd/MM, HH:mm' : 'MMM dd, HH:mm') : (t("now") || 'NOW')}
                            </span>
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <form 
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!editingNoteContent.trim() || !profile) return;
                              try {
                                await updateDoc(doc(db, "evolution_notes", note.id), {
                                  content: editingNoteContent
                                });
                                setEditingNoteId(null);
                                fetchNotes(selectedCase.id);
                              } catch (err) {
                                console.error("Error editing note:", err);
                              }
                            }} 
                            className="space-y-2 mt-2"
                          >
                            <textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="w-full bg-slate-50 border border-app-line p-3 font-mono text-xs min-h-[100px] focus:outline-none focus:ring-1 focus:ring-app-ink block"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingNoteId(null)}
                                className="px-3 py-1.5 border border-app-line font-mono text-[9px] uppercase tracking-wider hover:bg-slate-50"
                              >
                                {t("cancel") || "Cancel"}
                              </button>
                              <button
                                type="submit"
                                disabled={!editingNoteContent.trim()}
                                className="px-4 py-1.5 bg-app-ink text-app-bg font-mono text-[9px] uppercase tracking-wider hover:opacity-95 disabled:opacity-40"
                              >
                                {t("saveChanges") || "Save"}
                              </button>
                            </div>
                          </form>
                        ) : deletingNoteId === note.id ? (
                          <div className="bg-red-50 border border-red-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 rounded">
                            <span className="text-[10px] font-mono font-bold text-red-800 uppercase tracking-tight flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" /> {t("deleteConfirmMsg") || "Confirm delete this note?"}
                            </span>
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDeletingNoteId(null)}
                                className="px-3 py-1 bg-white border border-red-200 text-slate-700 font-mono text-[9px] uppercase hover:bg-slate-50 uppercase tracking-wider"
                              >
                                {t("cancel") || "No"}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, "evolution_notes", note.id));
                                    setDeletingNoteId(null);
                                    fetchNotes(selectedCase.id);
                                  } catch (err) {
                                    console.error("Error deleting note:", err);
                                  }
                                }}
                                className="px-4 py-1 bg-red-600 text-white font-mono text-[9px] uppercase hover:bg-red-700 uppercase tracking-widest"
                              >
                                {t("delete") || "Yes, Delete"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none font-mono text-sm leading-relaxed border-l-2 border-slate-100 pl-4 py-1 text-slate-700 overflow-x-auto">
                            <ReactMarkdown>{note.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div className="p-12 text-center text-[10px] font-mono opacity-20 uppercase tracking-[0.2em] border border-dashed border-app-line">
                      Waiting for technical input...
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 sm:h-96 border-2 border-dashed border-app-line bg-white/5 flex flex-col items-center justify-center p-8 text-center">
              <History className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono uppercase text-[10px] tracking-[0.2em] opacity-40 max-w-[200px] leading-loose">
                {t("selectCaseMessage")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Case Modal */}
      {showCaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-lg my-auto p-6 sm:p-8 relative shadow-22xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 uppercase tracking-[0.15em] font-mono">
              {t("admissionEvent")}
            </h2>
            
            {caseError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{caseError}</span>
              </div>
            )}
            
            <form onSubmit={handleCreateCase} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("entrySubject")}</label>
                <input 
                  type="text" 
                  required 
                  value={newCaseData.title}
                  onChange={(e) => setNewCaseData({...newCaseData, title: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder={t("entrySubjectPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("initialDescription")}</label>
                <textarea
                  required 
                  value={newCaseData.description}
                  onChange={(e) => setNewCaseData({...newCaseData, description: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm h-32 focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder={t("initialDescriptionPlaceholder")}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newCaseData.hasMedicines}
                    onChange={(e) => setNewCaseData({ ...newCaseData, hasMedicines: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-app-line rounded focus:ring-1 focus:ring-app-ink"
                  />
                  <span className="text-xs font-mono font-bold uppercase tracking-wide text-slate-700">{t("writeMedicines")}</span>
                </label>
              </div>

              {newCaseData.hasMedicines && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("prescribedMedicines")}</label>
                  <textarea
                    required={newCaseData.hasMedicines}
                    value={newCaseData.medicines}
                    onChange={(e) => setNewCaseData({ ...newCaseData, medicines: e.target.value })}
                    className="w-full bg-white border border-app-line p-2.5 font-mono text-xs h-24 focus:outline-none focus:ring-1 focus:ring-app-ink block"
                    placeholder={t("prescribedMedicinesPlaceholder")}
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                <button 
                  type="button" 
                  onClick={() => setShowCaseModal(false)}
                  className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  {t("abort")}
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  {t("initializeFile")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Case Modal */}
      {showEditCaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-lg my-auto p-6 sm:p-8 relative shadow-22xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 uppercase tracking-[0.15em] font-mono">
              {t("editCase") || "Edit Case Details"}
            </h2>
            
            <form onSubmit={handleEditCase} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("entrySubject")}</label>
                <input 
                  type="text" 
                  required 
                  value={editCaseData.title}
                  onChange={(e) => setEditCaseData({...editCaseData, title: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder={t("entrySubjectPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("initialDescription")}</label>
                <textarea
                  required 
                  value={editCaseData.description}
                  onChange={(e) => setEditCaseData({...editCaseData, description: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm h-32 focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder={t("initialDescriptionPlaceholder")}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editCaseData.hasMedicines}
                    onChange={(e) => setEditCaseData({ ...editCaseData, hasMedicines: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-app-line rounded focus:ring-1 focus:ring-app-ink"
                  />
                  <span className="text-xs font-mono font-bold uppercase tracking-wide text-slate-700">{t("writeMedicines")}</span>
                </label>
              </div>

              {editCaseData.hasMedicines && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("prescribedMedicines")}</label>
                  <textarea
                    required={editCaseData.hasMedicines}
                    value={editCaseData.medicines}
                    onChange={(e) => setEditCaseData({ ...editCaseData, medicines: e.target.value })}
                    className="w-full bg-white border border-app-line p-2.5 font-mono text-xs h-24 focus:outline-none focus:ring-1 focus:ring-app-ink block"
                    placeholder={t("prescribedMedicinesPlaceholder")}
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                <button 
                  type="button" 
                  onClick={() => setShowEditCaseModal(false)}
                  className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  {t("saveChanges") || "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Case Confirmation Modal */}
      {showDeleteCaseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-red-200 w-full max-w-md my-auto p-6 sm:p-8 relative shadow-22xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4 font-mono text-red-600 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" /> {t("confirmDelete") || "Confirm Delete"}
            </h2>
            <p className="text-xs font-mono text-slate-600 leading-relaxed mb-8">
              {t("deleteConfirmMsg") || "Are you sure you want to delete this history item? This action is irreversible."}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowDeleteCaseConfirm(false)}
                className="px-6 py-2.5 border border-slate-200 font-mono text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                {t("cancel") || "No"}
              </button>
              <button 
                type="button" 
                onClick={handleDeleteCase}
                className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-widest transition-colors"
              >
                {t("delete") || "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Case Confirmation Modal */}
      {showCloseCaseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-emerald-200 w-full max-w-md my-auto p-6 sm:p-8 relative shadow-22xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4 font-mono text-emerald-700 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> 
              {language === 'fr' ? 'CONFIRMER LA CLÔTURE' : 'CONFIRM CLOSURE'}
            </h2>
            <p className="text-xs font-mono text-slate-600 leading-relaxed mb-8">
              {language === 'fr' 
                ? 'Êtes-vous sûr de vouloir fermer ce dossier ? Cette action limitera l\'ajout d\'évolutions ultérieures, et enregistrera votre rôle comme signataire responsable de la clôture.'
                : 'Are you sure you want to close this medical case? This action will finalize the reports and register your current role as the signatory responsible for ending this case.'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowCloseCaseConfirm(false)}
                className="px-6 py-2.5 border border-slate-200 font-mono text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                {t("cancel") || "No"}
              </button>
              <button 
                type="button" 
                onClick={handleCloseCase}
                className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] uppercase tracking-widest transition-colors font-bold"
              >
                {language === 'fr' ? 'OUI, FERMER' : 'YES, CLOSE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Closed Case Reopen Warning Modal */}
      {showReopenCaseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-orange-200 w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4 font-mono text-orange-600 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 animate-bounce" /> 
              {language === 'fr' ? 'ATTENTION : DOSSIER CLOS' : 'EDIT CLOSED CASE'}
            </h2>
            <p className="text-xs font-mono text-slate-600 leading-relaxed mb-8">
              {language === 'fr' 
                ? 'Vous êtes sur le point de modifier un dossier médical clôturé. Si vous continuez, cette opération rouvrira automatiquement le dossier.'
                : 'You are about to edit a closed medical case. If you continue with this operation, it will automatically reopen the case.'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowReopenCaseConfirm(false)}
                className="px-6 py-2.5 border border-slate-200 font-mono text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                {t("cancel") || "No"}
              </button>
              <button 
                type="button" 
                onClick={handleConfirmReopenAndEdit}
                className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-mono text-[10px] uppercase tracking-widest transition-colors font-bold"
              >
                {language === 'fr' ? 'CONTINUER' : 'CONTINUE'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Deleting Patient Profile Warning Modal */}
      {showDeletePatientConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-rose-200 w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4 font-mono text-rose-600 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" /> 
              {t("deletePatient")}
            </h2>
            <p className="text-xs font-mono text-slate-600 leading-relaxed mb-8">
              {t("deletePatientMsg")}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                disabled={isDeletingPatient}
                onClick={() => setShowDeletePatientConfirm(false)}
                className="px-6 py-2.5 border border-slate-200 font-mono text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                {t("cancel") || "No"}
              </button>
              <button 
                type="button" 
                disabled={isDeletingPatient}
                onClick={handleDeletePatient}
                className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-widest transition-colors font-bold"
              >
                {isDeletingPatient ? "..." : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
