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
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
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
  Pill
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hospitalId, profile } = useAuth();
  const { t } = useLanguage();
  
  const [patient, setPatient] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Case/Note state
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newCaseData, setNewCaseData] = useState({ title: "", description: "" });

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
      where("patientId", "==", id!),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const fetchedCases = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCases(fetchedCases);
    if (fetchedCases.length > 0 && !selectedCase) {
        setSelectedCase(fetchedCases[0]);
    }
  };

  const fetchNotes = async (caseId: string) => {
    const q = query(
      collection(db, "evolution_notes"), 
      where("caseId", "==", caseId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    setNotes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCase || !profile) return;

    try {
      await addDoc(collection(db, "evolution_notes"), {
        caseId: selectedCase.id,
        patientId: id,
        hospitalId,
        authorId: profile.id,
        authorName: profile.name,
        authorRole: profile.role,
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
    if (!hospitalId) return;

    try {
      const docRef = await addDoc(collection(db, "medical_cases"), {
        ...newCaseData,
        patientId: id,
        hospitalId,
        status: "OPEN",
        createdAt: serverTimestamp()
      });
      setShowCaseModal(false);
      fetchCases();
      // Auto-select the new case
      const newCase = { id: docRef.id, ...newCaseData, status: "OPEN" };
      setSelectedCase(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
    }
  };

  if (loading) return <div>Loading Profile...</div>;
  if (!patient) return <div>Patient not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header with Back */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-app-line pb-6">
        <button 
          onClick={() => navigate("/patients")}
          className="p-2 hover:bg-black/5 transition-colors border border-app-line shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-tight truncate">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] font-mono opacity-50 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> DOB: {patient.dateOfBirth}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {patient.gender}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone || 'NO_PH'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Cases Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="col-header flex items-center gap-2">
              <History className="w-3 h-3" /> {t("history")}
            </h2>
            <button 
              onClick={() => setShowCaseModal(true)}
              className="p-1 hover:bg-app-ink hover:text-app-bg transition-all border border-app-line"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-3 sm:gap-2 no-scrollbar">
            {cases.map((c) => (
              <button
                key={c.id}
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
                    {c.status}
                  </span>
                </div>
                <p className="text-sm font-bold truncate group-hover:underline">{c.title}</p>
                <p className="text-[10px] font-mono opacity-50 mt-1 whitespace-nowrap">
                   {c.createdAt?.seconds ? format(c.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently Added'}
                </p>
              </button>
            ))}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl sm:text-2xl font-serif italic font-bold leading-tight">{selectedCase.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-mono opacity-50">SYNCED: {notes[0] ? format(notes[0].createdAt?.toDate() || new Date(), 'HH:mm') : 'N/A'}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600 mb-8 border-l-4 border-app-line pl-5 py-1 italic bg-slate-50/50">
                  {selectedCase.description}
                </div>

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
                          <span className="text-[9px] font-mono opacity-30 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {note.createdAt ? format(note.createdAt.toDate(), 'MMM dd, HH:mm') : 'NOW'}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none font-mono text-sm leading-relaxed border-l-2 border-slate-100 pl-4 py-1 text-slate-700 overflow-x-auto">
                          <ReactMarkdown>{note.content}</ReactMarkdown>
                        </div>
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
                NO_CASE_SELECTED / SELECT_A_RECORD_FROM_THE_SIDEBAR_OR_CREATE_A_NEW_ONE
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
              ADMISSION_EVENT
            </h2>
            
            <form onSubmit={handleCreateCase} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Entry_Subject (Major Concern)</label>
                <input 
                  type="text" 
                  required 
                  value={newCaseData.title}
                  onChange={(e) => setNewCaseData({...newCaseData, title: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="EX: ACUTE_GASTRITIS"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Initial_Description</label>
                <textarea
                  required 
                  value={newCaseData.description}
                  onChange={(e) => setNewCaseData({...newCaseData, description: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm h-32 focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="Summarize initial findings..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                <button 
                  type="button" 
                  onClick={() => setShowCaseModal(false)}
                  className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  ABORT
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  INITIALIZE_FILE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
