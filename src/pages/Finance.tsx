import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  Wallet, 
  Search, 
  Plus, 
  DollarSign, 
  CreditCard, 
  Banknote,
  Receipt,
  Download
} from "lucide-react";
import { format } from "date-fns";

export default function Finance() {
  const { hospitalId, profile } = useAuth();
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    amount: "",
    method: "CASH",
    status: "PAID",
    reference: ""
  });

  useEffect(() => {
    if (hospitalId) fetchPayments();
  }, [hospitalId]);

  const fetchPayments = async () => {
    setLoading(true);
    const q = query(
      collection(db, "payments"), 
      where("hospitalId", "==", hospitalId)
    );
    const querySnapshot = await getDocs(q);
    const fetchedPayments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    fetchedPayments.sort((a: any, b: any) => {
      const getMillis = (t: any) => t && typeof t.toMillis === 'function' ? t.toMillis() : (t?.seconds ? t.seconds * 1000 : 0);
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
    setPayments(fetchedPayments);
    setLoading(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;

    try {
      await addDoc(collection(db, "payments"), {
        ...formData,
        amount: Number(formData.amount),
        hospitalId,
        cashierId: profile?.id,
        cashierName: profile?.name,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setFormData({ patientId: "", patientName: "", amount: "", method: "CASH", status: "PAID", reference: "" });
      fetchPayments();
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b-2 border-app-line">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight uppercase leading-none">
            {t("finance")}
          </h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em]">
            BILLING_DEPT / TRANSACTION_LOGS
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
           <div className="bg-white border border-app-line px-6 py-3 flex flex-col justify-center flex-1">
             <span className="col-header text-[9px] uppercase">{t("dailyTotal")}</span>
             <span className="font-mono font-bold text-2xl tracking-tighter">${totalRevenue.toLocaleString()}</span>
           </div>
           <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 lg:flex-none h-auto lg:h-14 bg-app-ink text-app-bg px-8 py-3 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line whitespace-nowrap"
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
        ) : payments.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs opacity-50 uppercase tracking-widest">{t("noTransactions")}</div>
        ) : (
          <div className="divide-y divide-app-line">
            {payments.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_1.5fr_1fr_120px] lg:grid-cols-[1fr_1.5fr_1fr_1fr_120px] p-3 sm:p-4 items-center hover:bg-gray-50 transition-colors group">
                <span className="text-[10px] font-mono opacity-50 hidden sm:block">
                  {p.createdAt ? format(p.createdAt.toDate(), language === 'fr' ? 'dd/MM, HH:mm' : 'MMM dd, HH:mm') : (t("justNow") || 'JUST_NOW')}
                </span>
                <div className="flex flex-col pr-2">
                  <span className="font-bold text-xs sm:text-sm truncate">{p.patientName}</span>
                  <span className="text-[9px] font-mono opacity-40 uppercase truncate">REF: {p.reference || 'N/A'}</span>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-xs font-mono opacity-70">
                   {p.method === 'CASH' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                   {t(p.method.toLowerCase())}
                </div>
                <div className="flex flex-col sm:block">
                  <span className="font-mono font-bold text-sm text-emerald-600 sm:text-slate-900">${Number(p.amount).toLocaleString()}</span>
                  <span className="sm:hidden text-[8px] font-mono opacity-50 uppercase">{p.method}</span>
                </div>
                <div className="flex justify-end">
                   <span className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border border-green-200 bg-green-50 text-green-700 font-mono uppercase tracking-widest truncate">
                     {t(p.status)}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("patientUid")}</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.patientId}
                      onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                      placeholder="P-1002"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("patientName")}</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.patientName}
                      onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                      className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                      placeholder="Full Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest uppercase">{t("amount")} (CAD)</label>
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
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors uppercase">{t("halt")}</button>
                  <button type="submit" className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity uppercase">{t("approveLog")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
