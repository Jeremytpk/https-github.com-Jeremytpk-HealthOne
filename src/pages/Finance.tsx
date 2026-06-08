import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useOfflineSync } from "../contexts/OfflineSyncContext";
import { 
  Wallet, 
  Search, 
  Plus, 
  DollarSign, 
  CreditCard, 
  Banknote,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { getNormalizedRole } from "../lib/utils";

export default function Finance() {
  const { hospitalId, profile } = useAuth();
  const { t, language } = useLanguage();
  const { isOfflineMode, addOfflineDoc, getQueuedItemsForCollection } = useOfflineSync();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [casesOfSelectedPatient, setCasesOfSelectedPatient] = useState<any[]>([]);
  const [checkingCases, setCheckingCases] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    amount: "",
    currency: "USD",
    method: "CASH",
    status: "PAID",
    reference: "",
    caseId: ""
  });

  const [viewingPatientPaymentsId, setViewingPatientPaymentsId] = useState<string | null>(null);
  const [viewingPatientName, setViewingPatientName] = useState<string>("");
  const [viewingCases, setViewingCases] = useState<any[]>([]);

  useEffect(() => {
    if (viewingPatientPaymentsId) {
      const fetchCasesForViewingPatient = async () => {
        try {
          const q = query(
            collection(db, "medical_cases"),
            where("patientId", "==", viewingPatientPaymentsId)
          );
          const querySnapshot = await getDocs(q);
          setViewingCases(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
        } catch (e) {
          console.error("Error fetching cases for viewing patient:", e);
        }
      };
      fetchCasesForViewingPatient();
    } else {
      setViewingCases([]);
    }
  }, [viewingPatientPaymentsId]);

  useEffect(() => {
    if (profile) fetchPayments();
  }, [profile, hospitalId]);

  useEffect(() => {
    if (profile && showAddModal) {
      const fetchPatientsList = async () => {
        try {
          const userRole = getNormalizedRole(profile?.role);
          const isSuper = userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN";
          let q;
          if (isSuper) {
            q = query(collection(db, "patients"));
          } else {
            q = query(
              collection(db, "patients"),
              where("hospitalId", "==", hospitalId || "")
            );
          }
          const snap = await getDocs(q);
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          setPatientsList(list);
        } catch (e) {
          console.error("Error fetching patients list in Finance:", e);
        }
      };
      fetchPatientsList();
    }
  }, [profile, hospitalId, showAddModal]);

  const handleSelectPatient = async (pId: string) => {
    if (!pId) {
      setSelectedPatient(null);
      setCasesOfSelectedPatient([]);
      setFormData(prev => ({ ...prev, patientId: "", patientName: "" }));
      return;
    }

    const userRole = getNormalizedRole(profile?.role);
    const isSuper = userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN";

    const offlinePatients = getQueuedItemsForCollection("patients")
      .filter((item: any) => isSuper ? true : item.data.hospitalId === hospitalId)
      .map((item: any) => ({ id: item.id, ...item.data }));

    const mergedPatientsList = [...offlinePatients, ...patientsList];
    const parentPatient = mergedPatientsList.find(p => p.id === pId);

    if (!parentPatient) {
      setSelectedPatient(null);
      setCasesOfSelectedPatient([]);
      setFormData(prev => ({ ...prev, patientId: "", patientName: "" }));
      return;
    }
    
    setSelectedPatient(parentPatient);
    setFormData(prev => ({
      ...prev,
      patientId: parentPatient.id,
      patientName: `${parentPatient.firstName} ${parentPatient.lastName}`
    }));

    setCheckingCases(true);
    try {
      let fetchedCases: any[] = [];
      if (!parentPatient.id.startsWith("offline_")) {
        const q = query(
          collection(db, "medical_cases"),
          where("patientId", "==", parentPatient.id)
        );
        const qSnap = await getDocs(q);
        fetchedCases = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      }
      
      const offlineCases = getQueuedItemsForCollection("medical_cases")
        .filter((item: any) => item.data.patientId === parentPatient.id)
        .map((item: any) => ({ id: item.id, ...item.data }));

      const mergedCases = [...offlineCases, ...fetchedCases];
      setCasesOfSelectedPatient(mergedCases);
    } catch (e) {
      console.error("Error fetching patient cases in Finance modal:", e);
    } finally {
      setCheckingCases(false);
    }
  };

  const handleCloseSingleCaseInFinance = async (caseId: string) => {
    if (isOfflineMode || caseId.startsWith("offline_")) {
      setCasesOfSelectedPatient(prev => 
        prev.map(c => c.id === caseId ? { ...c, status: "CLOSED" } : c)
      );
      alert(language === 'fr' 
        ? "Dossier marqué comme clos localement !" 
        : "Case marked as closed locally!");
      return;
    }

    try {
      const docRef = doc(db, "medical_cases", caseId);
      const closedRole = profile?.role || "Staff";
      const closedName = profile?.fullName || profile?.name || profile?.username || "Staff";

      await updateDoc(docRef, {
        status: "CLOSED",
        closedById: profile?.id || "unknown",
        closedByName: closedName,
        closedByRole: closedRole,
        closedAt: serverTimestamp()
      });

      setCasesOfSelectedPatient(prev => 
        prev.map(c => c.id === caseId ? { 
          ...c, 
          status: "CLOSED",
          closedById: profile?.id || "unknown",
          closedByName: closedName,
          closedByRole: closedRole
        } : c)
      );

    } catch (e) {
      console.error("Error closing case from billing department:", e);
      alert("Error closing case: " + (e as Error).message);
    }
  };

  const handleCloseAllCasesInFinance = async () => {
    const listToClose = casesOfSelectedPatient.filter(c => c.status === "OPEN");
    if (listToClose.length === 0) return;

    try {
      const closedRole = profile?.role || "Staff";
      const closedName = profile?.fullName || profile?.name || profile?.username || "Staff";

      await Promise.all(listToClose.map(async (c) => {
        if (isOfflineMode || c.id.startsWith("offline_")) {
          return null;
        }
        const docRef = doc(db, "medical_cases", c.id);
        return updateDoc(docRef, {
          status: "CLOSED",
          closedById: profile?.id || "unknown",
          closedByName: closedName,
          closedByRole: closedRole,
          closedAt: serverTimestamp()
        });
      }));

      setCasesOfSelectedPatient(prev => 
        prev.map(c => c.status === "OPEN" ? {
          ...c,
          status: "CLOSED",
          closedById: profile?.id || "unknown",
          closedByName: closedName,
          closedByRole: closedRole
        } : c)
      );

      alert(language === 'fr' 
        ? "Tous les dossiers cliniques de ce patient ont été clos avec succès !" 
        : "All open clinical cases for this patient have been successfully closed!");

    } catch (e) {
      console.error("Error closing all cases in Finance:", e);
      alert("Error: " + (e as Error).message);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const userRole = getNormalizedRole(profile?.role);
      const isSuper = userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN";
      let q;
      if (isSuper) {
        q = query(
          collection(db, "payments")
        );
      } else {
        q = query(
          collection(db, "payments"), 
          where("hospitalId", "==", hospitalId || "")
        );
      }
      const querySnapshot = await getDocs(q);
      const fetchedPayments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setPayments(fetchedPayments);
    } catch (e) {
      console.error("Failed to fetch payments online:", e);
    }
    setLoading(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const userRole = getNormalizedRole(profile?.role);
    const isSuper = userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN";
    const resolvedHospitalId = hospitalId || selectedPatient?.hospitalId || "system_tenant";
    if (!resolvedHospitalId && !isSuper) return;

    // Reject if there are open cases for the selected patient
    const openCases = casesOfSelectedPatient.filter(c => c.status === "OPEN");
    if (openCases.length > 0) {
      alert(language === 'fr' 
        ? "Enregistrement refusé : Tous les cas cliniques du patient doivent d'abord être fermés !" 
        : "Log refused: All patient clinical cases must be closed first!");
      return;
    }

    try {
      const paymentPayload = {
        ...formData,
        amount: Number(formData.amount),
        currency: formData.currency || "USD",
        hospitalId: resolvedHospitalId,
        cashierId: profile?.id || "unknown",
        cashierName: profile?.fullName || profile?.name || "Staff",
        createdAt: isOfflineMode ? new Date().toISOString() : serverTimestamp()
      };

      const formattedAmt = (formData.currency === "CDF" || formData.currency === "CFC" || formData.currency === "FC") ? `${formData.amount} FC` : `$${formData.amount} USD`;
      if (isOfflineMode) {
        await addOfflineDoc(
          "payments", 
          paymentPayload, 
          `Payment: ${formattedAmt} for ${formData.patientName}`
        );
      } else {
        await addDoc(collection(db, "payments"), paymentPayload);
      }
      setShowAddModal(false);
      setFormData({ patientId: "", patientName: "", amount: "", currency: "USD", method: "CASH", status: "PAID", reference: "", caseId: "" });
      setSelectedPatient(null);
      setCasesOfSelectedPatient([]);
      fetchPayments();
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  const offlinePayments = getQueuedItemsForCollection("payments")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));

  const mergedPayments = [...offlinePayments, ...payments];

  mergedPayments.sort((a: any, b: any) => {
    const getMillis = (t: any) => {
      if (!t) return 0;
      if (typeof t.toMillis === 'function') return t.toMillis();
      if (t.seconds) return t.seconds * 1000;
      try { return new Date(t).getTime(); } catch {}
      return 0;
    };
    return getMillis(b.createdAt) - getMillis(a.createdAt);
  });

  const getFormatDate = (createdAt: any) => {
    if (!createdAt) return t("justNow") || 'JUST_NOW';
    try {
      if (typeof createdAt.toDate === 'function') {
        return format(createdAt.toDate(), language === 'fr' ? 'dd/MM, HH:mm' : 'MMM dd, HH:mm');
      }
      return format(new Date(createdAt), language === 'fr' ? 'dd/MM, HH:mm' : 'MMM dd, HH:mm');
    } catch (e) {
      return t("justNow") || 'JUST_NOW';
    }
  };

  const totalUSD = mergedPayments.filter(p => !p.currency || p.currency === "USD").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCDF = mergedPayments.filter(p => p.currency === "CDF" || p.currency === "CFC" || p.currency === "FC").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const USD_TO_FC = 2200;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b-2 border-app-line">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight uppercase leading-none">
              {t("finance")}
            </h1>
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold px-3 py-1.5 uppercase tracking-wider rounded flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              US$1 = 2,200.00 FC
            </div>
          </div>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em]">
            BILLING_DEPT / TRANSACTION_LOGS
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
           <div className="bg-white border border-app-line px-5 py-2.5 flex flex-col justify-center min-w-[145px] sm:min-w-[170px] flex-1">
             <span className="col-header text-[9px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Total Quotidien (USD)" : "Daily Total (USD)"}</span>
             <span className="font-mono font-bold text-xl sm:text-2xl tracking-tighter text-slate-900">${totalUSD.toLocaleString()}</span>
             <span className="font-mono text-[10px] text-slate-400 mt-0.5">
               ≈ {(totalUSD * USD_TO_FC).toLocaleString()} FC
             </span>
           </div>
           <div className="bg-white border border-app-line px-5 py-2.5 flex flex-col justify-center min-w-[145px] sm:min-w-[170px] flex-1">
             <span className="col-header text-[9px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Total Quotidien (FC)" : "Daily Total (FC)"}</span>
             <span className="font-mono font-bold text-xl sm:text-2xl tracking-tighter text-emerald-700">{totalCDF.toLocaleString()} FC</span>
             <span className="font-mono text-[10px] text-emerald-600/80 mt-0.5">
               ≈ ${Math.round((totalCDF / USD_TO_FC) * 100) / 100} USD
             </span>
           </div>
           <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 lg:flex-none h-auto lg:h-[70px] bg-app-ink text-app-bg px-8 py-3 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" /> {t("recordPayment")}
          </button>
        </div>
      </div>

      <div className="bg-white border border-app-line overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_1.5fr_1fr_120px] lg:grid-cols-[1fr_1.5fr_1fr_1fr_120px] p-3 sm:p-4 bg-gray-50 border-b border-app-line uppercase">
           <span className="col-header hidden sm:block uppercase">{t("timestamp")}</span>
           <span className="col-header uppercase">{t("patientName")}</span>
           <span className="col-header hidden lg:block uppercase">{t("method")}</span>
           <span className="col-header uppercase">{t("amount")}</span>
           <span className="col-header text-right uppercase">{t("status")}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center animate-pulse font-mono text-xs opacity-50 uppercase tracking-widest">{t("fetchingLogs")}</div>
        ) : mergedPayments.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs opacity-50 uppercase tracking-widest">{t("noTransactions")}</div>
        ) : (
          <div className="divide-y divide-app-line">
            {mergedPayments.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_1.5fr_1fr_120px] lg:grid-cols-[1fr_1.5fr_1fr_1fr_120px] p-3 sm:p-4 items-center hover:bg-gray-50 transition-colors group">
                <span className="text-[10px] font-mono opacity-50 hidden sm:block">
                  {getFormatDate(p.createdAt)}
                </span>
                <div className="flex flex-col pr-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        setViewingPatientPaymentsId(p.patientId);
                        setViewingPatientName(p.patientName);
                      }}
                      className="font-bold text-xs sm:text-sm truncate text-left hover:text-slate-600 hover:underline cursor-pointer"
                      title={language === 'fr' ? "Voir l'historique de ce patient" : "View this patient's history"}
                    >
                      {p.patientName}
                    </button>
                    {p.isOfflinePending && (
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse whitespace-nowrap">
                        Offline
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono opacity-40 uppercase truncate">ID: {p.patientId?.slice(-5).toUpperCase() || "N/A"} | REF: {p.reference || 'N/A'}</span>
                    {(() => {
                      if (!p.caseId) return null;
                      const casePayments = mergedPayments.filter(pay => pay.caseId === p.caseId);
                      const usdSum = casePayments.filter(pay => pay.currency === "USD" || !pay.currency).reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
                      const fcSum = casePayments.filter(pay => pay.currency === "FC" || pay.currency === "CDF" || pay.currency === "CFC").reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
                      
                      return (
                        <div className="text-[9px] font-mono text-emerald-700 font-bold uppercase mt-0.5 truncate bg-emerald-50 border border-emerald-100/50 px-1 py-0.5 inline-block w-fit">
                          {language === 'fr' ? "Somme du Cas : " : "Case Sum: "}
                          {usdSum > 0 && `$${usdSum.toLocaleString()} USD`}
                          {usdSum > 0 && fcSum > 0 && " + "}
                          {fcSum > 0 && `${fcSum.toLocaleString()} FC`}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-xs font-mono opacity-70">
                   {p.method === 'CASH' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                   {t(p.method?.toLowerCase() || 'cash')}
                </div>
                <div className="flex flex-col">
                  {p.currency === "CDF" || p.currency === "CFC" || p.currency === "FC" ? (
                    <>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {Number(p.amount).toLocaleString()} FC
                      </span>
                      <span className="font-mono text-[10px] text-emerald-600 font-bold block sm:mt-0.5">
                        ≈ ${(Number(p.amount) / 2200).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        ${Number(p.amount).toLocaleString()} USD
                      </span>
                      <span className="font-mono text-[10px] text-emerald-600 font-bold block sm:mt-0.5">
                        ≈ {(Number(p.amount) * 2200).toLocaleString()} FC
                      </span>
                    </>
                  )}
                  <span className="sm:hidden text-[8px] font-mono opacity-50 uppercase mt-0.5">{p.method}</span>
                </div>
                <div className="flex justify-end">
                   <span className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border border-green-200 bg-green-50 text-green-700 font-mono uppercase tracking-widest truncate">
                     {t(p.status || 'PAID')}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-lg my-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest flex items-center gap-2">
                 <Receipt className="w-6 h-6" /> TRANSACTION
              </h2>
              
              <form onSubmit={handleAddPayment} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">
                      {language === 'fr' ? "Sélectionner un patient" : "Select Registered Patient"}
                    </label>
                    <select
                      value={formData.patientId}
                      onChange={(e) => handleSelectPatient(e.target.value)}
                      className="w-full bg-white border border-app-line p-2.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-app-ink"
                    >
                      <option value="">-- {language === 'fr' ? "Choisissez un patient" : "Choose Patient"} --</option>
                      {patientsList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.id.startsWith("offline_") ? " (Offline Draft)" : ` (#${p.id.slice(-5).toUpperCase()})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("patientUid")}</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.patientId}
                        onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                        className="w-full bg-slate-50 border border-app-line p-2 font-mono text-sm focus:outline-none"
                        placeholder="P-1002"
                        readOnly={!!selectedPatient}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("patientName")}</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.patientName}
                        onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                        className="w-full bg-slate-50 border border-app-line p-2 font-mono text-sm focus:outline-none"
                        placeholder="Full Name"
                        readOnly={!!selectedPatient}
                      />
                    </div>
                  </div>
                </div>

                {checkingCases && (
                  <div className="py-2 animate-pulse text-center font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                    {language === 'fr' ? "VÉRIFICATION DES DOSSIERS CLINQUES..." : "CHECKING CLINICAL CASES..."}
                  </div>
                )}

                {!checkingCases && selectedPatient && casesOfSelectedPatient.length > 0 && (
                  <div className="bg-slate-50 border border-app-line p-3.5 space-y-2">
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-slate-500">
                      {language === 'fr' ? "STATUT DES DOSSIERS CLINQUES" : "CLINICAL CASES STATUS"} ({casesOfSelectedPatient.length})
                    </span>
                    
                    {casesOfSelectedPatient.filter(c => c.status === "OPEN").length > 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 text-amber-850 space-y-3">
                        <div className="flex gap-2 items-start">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-bold text-xs uppercase tracking-wider">
                              {language === 'fr' ? "BLOQUÉ : Dossiers Ouverts" : "BLOCKED: Open Cases Exist"}
                            </p>
                            <p className="text-[11px] leading-relaxed text-slate-600 font-mono mt-0.5">
                              {language === 'fr' 
                                ? "Ce patient a des dossiers en cours. Impossible d'enregistrer le paiement tant qu'ils ne sont pas clos." 
                                : "This patient has active cases. Payment cannot be logged until all are closed."}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-amber-200/50 pt-2.5 space-y-2">
                          <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                            {language === 'fr' ? "Clôturer individuellement :" : "Close Individual Cases:"}
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {casesOfSelectedPatient.filter(c => c.status === "OPEN").map(c => (
                              <div key={c.id} className="flex justify-between items-center bg-white border border-slate-200 p-2 font-mono text-xs">
                                <span className="truncate pr-2 font-bold text-slate-700">{c.title}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCloseSingleCaseInFinance(c.id)}
                                  className="px-2 py-0.5 bg-emerald-600 text-white hover:bg-emerald-700 font-mono text-[9px] font-bold uppercase tracking-wider shrink-0"
                                >
                                  {language === 'fr' ? "Clôturer" : "Close Case"}
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleCloseAllCasesInFinance}
                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono uppercase font-bold text-[9px] tracking-widest border border-app-line transition-all"
                          >
                            {language === 'fr' ? "Clôturer tous les dossiers de ce patient" : "Close all open cases for this patient"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 flex gap-2 items-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wide">
                          {language === 'fr' 
                            ? "Tous les dossiers sont clos. Prêt pour l'enregistrement." 
                            : "All cases closed. Ready for registering payment."}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!checkingCases && selectedPatient && casesOfSelectedPatient.length === 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wide">
                      {language === 'fr' 
                        ? "Aucun dossier clinique enregistré. Prêt pour l'enregistrement." 
                        : "No medical history recorded. Ready for registering payment."}
                    </span>
                  </div>
                )}

                {!checkingCases && selectedPatient && casesOfSelectedPatient.length > 0 && (
                  <div className="bg-slate-50 border border-app-line p-3 mt-1.5 animate-in fade-in duration-200">
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">
                      {language === 'fr' ? "Associer à un dossier clinique / histoire ?" : "Link to clinical case / history?"}
                    </label>
                    <select
                      value={formData.caseId || ""}
                      onChange={(e) => setFormData({...formData, caseId: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-app-ink"
                    >
                      <option value="">-- {language === 'fr' ? "Aucun dossier lié (Paiement Général)" : "No linked case (General Payment)"} --</option>
                      {casesOfSelectedPatient.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{language === 'fr' ? "Devise" : "Currency"}</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="FC">FC (Congo Franc)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">
                      {t("amount")} ({formData.currency || "USD"})
                    </label>
                    <input 
                      type="number" 
                      required 
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("method")}</label>
                    <select 
                      value={formData.method}
                      onChange={(e) => setFormData({...formData, method: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                    >
                      <option value="CASH">{t("cash")}</option>
                      <option value="CARD">{t("card")}</option>
                      <option value="TRANSFER">{t("transfer")}</option>
                      <option value="INSURANCE">{t("insurance")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("refNotes")}</label>
                  <input 
                    type="text" 
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                    placeholder="INV-..."
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-app-line">
                  <button type="button" onClick={() => {
                    setShowAddModal(false);
                    setSelectedPatient(null);
                    setCasesOfSelectedPatient([]);
                    setFormData({ patientId: "", patientName: "", amount: "", currency: "USD", method: "CASH", status: "PAID", reference: "", caseId: "" });
                  }} className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors uppercase">{t("halt")}</button>
                  <button type="submit" className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity uppercase">{t("approveLog")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingPatientPaymentsId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-xl my-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-4 border-b border-app-line pb-2 font-mono uppercase tracking-widest flex items-center gap-2">
                 <Receipt className="w-6 h-6 text-emerald-600" /> {language === 'fr' ? "RELEVÉ FINANCIER DU PATIENT" : "PATIENT FINANCIAL STATEMENT"}
              </h2>

              <div className="mb-6">
                <span className="text-[10px] uppercase font-mono opacity-50 block tracking-widest">{language === 'fr' ? "Nom du Patient" : "Patient Name"}</span>
                <span className="text-lg font-bold text-slate-900 block font-serif italic">{viewingPatientName}</span>
                <span className="text-[10px] font-mono opacity-50 block font-bold">ID: #{viewingPatientPaymentsId.slice(-8).toUpperCase()}</span>
              </div>

              {/* History list for this patient */}
              {(() => {
                const patientTrans = mergedPayments.filter(p => p.patientId === viewingPatientPaymentsId);
                const grandTotalUsd = patientTrans.filter(p => p.currency === "USD" || !p.currency).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const grandTotalFc = patientTrans.filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                return (
                  <div className="space-y-6">
                    {/* Sum details */}
                    <div className="grid grid-cols-2 gap-3 bg-emerald-50/20 border border-emerald-100 p-3 sm:p-4 rounded">
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 block">{language === 'fr' ? "Total Payé (USD)" : "Total Paid (USD)"}</span>
                        <span className="font-mono font-bold text-lg sm:text-xl text-slate-800">${grandTotalUsd.toLocaleString()} USD</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 block">{language === 'fr' ? "Total Payé (FC)" : "Total Paid (FC)"}</span>
                        <span className="font-mono font-bold text-lg sm:text-xl text-emerald-700">{grandTotalFc.toLocaleString()} FC</span>
                      </div>
                    </div>

                    {/* Breakdown by clinical cases / visits if any */}
                    <div>
                      <h3 className="text-xs font-bold font-mono text-slate-600 tracking-wider uppercase mb-2">
                        {language === 'fr' ? "Répartition par Cas Cliniques" : "Breakdown by Clinical Cases"}
                      </h3>
                      {viewingCases.length === 0 ? (
                        <p className="text-xs text-slate-400 italic font-mono">- {language === 'fr' ? "Aucun dossier clinique enregistré" : "No clinical cases registered for this patient"} -</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {viewingCases.map(c => {
                            const cPayments = patientTrans.filter(pt => pt.caseId === c.id);
                            const cUsd = cPayments.filter(pt => pt.currency === "USD" || !pt.currency).reduce((s, pt) => s + Number(pt.amount), 0);
                            const cFc = cPayments.filter(pt => pt.currency === "FC" || pt.currency === "CDF" || pt.currency === "CFC").reduce((s, pt) => s + Number(pt.amount), 0);
                            
                            return (
                              <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-200 flex justify-between items-center font-mono text-[11px]">
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="font-bold text-slate-700 truncate">{c.title}</span>
                                  <span className="text-[9px] opacity-40">{language === 'fr' ? "Dossier" : "Status"}: {c.status}</span>
                                </div>
                                <div className="text-right shrink-0 font-bold text-emerald-600">
                                  {cUsd > 0 && <div>${cUsd.toLocaleString()} USD</div>}
                                  {cFc > 0 && <div>{cFc.toLocaleString()} FC</div>}
                                  {cUsd === 0 && cFc === 0 && <div className="text-slate-400">$0.00</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Transaction list ledger */}
                    <div>
                      <h3 className="text-xs font-bold font-mono text-slate-600 tracking-wider uppercase mb-2">
                        {language === 'fr' ? "Historique des Transactions" : "Transaction Ledger"} ({patientTrans.length})
                      </h3>
                      {patientTrans.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-3 text-center">{language === 'fr' ? "Aucune transaction enregistrée" : "No transactions recorded for this patient"}</p>
                      ) : (
                        <div className="border border-app-line bg-white divide-y divide-app-line max-h-44 overflow-y-auto font-mono text-xs">
                          {patientTrans.map((pt) => {
                            const linkedCase = viewingCases.find(vc => vc.id === pt.caseId);
                            return (
                              <div key={pt.id} className="p-3 hover:bg-slate-50 flex justify-between items-start">
                                <div className="space-y-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] bg-slate-100 text-slate-800 px-1 rounded font-bold">{pt.method}</span>
                                    <span className="opacity-40 text-[9px]">{getFormatDate(pt.createdAt)}</span>
                                  </div>
                                  <p className="text-slate-600 text-[10px] truncate animate-fade-in-down">
                                    {linkedCase ? `${language === 'fr' ? "Dossier : " : "Case: "}${linkedCase.title}` : (language === 'fr' ? "Paiement Général" : "General Payment")}
                                  </p>
                                  {pt.reference && <p className="text-[9px] opacity-40">REF: {pt.reference}</p>}
                                </div>
                                <span className="font-bold text-slate-900 shrink-0">
                                  {pt.currency === "FC" || pt.currency === "CDF" || pt.currency === "CFC" ? `${Number(pt.amount).toLocaleString()} FC` : `$${Number(pt.amount).toLocaleString()} USD`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end mt-8 pt-4 border-t border-app-line">
                <button
                  onClick={() => {
                    setViewingPatientPaymentsId(null);
                    setViewingPatientName("");
                  }}
                  className="px-6 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-95 transition-opacity cursor-pointer"
                >
                  {language === 'fr' ? "Fermer" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
