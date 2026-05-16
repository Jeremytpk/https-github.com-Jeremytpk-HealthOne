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
  const { t } = useLanguage();
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
      where("hospitalId", "==", hospitalId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    setPayments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase">{t("finance")}</h1>
          <p className="text-sm font-mono opacity-50 uppercase tracking-widest">BILLING_DEPT / TRANSACTION_LOGS</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white border border-app-line px-6 py-2 flex flex-col justify-center">
             <span className="col-header">DAILY_TOTAL</span>
             <span className="font-mono font-bold text-xl">${totalRevenue.toLocaleString()}</span>
           </div>
           <button 
            onClick={() => setShowAddModal(true)}
            className="h-full bg-app-ink text-app-bg px-6 flex items-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line"
          >
            <Plus className="w-4 h-4" /> RECORD_PAYMENT
          </button>
        </div>
      </div>

      <div className="bg-white border border-app-line overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_120px] p-4 bg-gray-50 border-b border-app-line uppercase">
           <span className="col-header">TIMESTAMP</span>
           <span className="col-header">{t("patientName")}</span>
           <span className="col-header">METHOD</span>
           <span className="col-header">AMOUNT</span>
           <span className="col-header text-right">STATUS</span>
        </div>

        {loading ? (
          <div className="p-12 text-center animate-pulse font-mono text-xs opacity-50 uppercase tracking-widest">Fetching_Logs...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs opacity-50 uppercase tracking-widest">No_Transactions_Recorded</div>
        ) : (
          <div className="divide-y divide-app-line">
            {payments.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_120px] p-4 items-center hover:bg-gray-50 transition-colors group">
                <span className="text-[10px] font-mono opacity-50">
                  {p.createdAt ? format(p.createdAt.toDate(), 'MMM dd, HH:mm') : 'JUST_NOW'}
                </span>
                <div className="flex flex-col">
                  <span className="font-bold">{p.patientName}</span>
                  <span className="text-[9px] font-mono opacity-40 uppercase">REF: {p.reference || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono opacity-70">
                   {p.method === 'CASH' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                   {p.method}
                </div>
                <span className="font-mono font-bold text-sm">${Number(p.amount).toLocaleString()}</span>
                <div className="flex justify-end">
                   <span className="text-[9px] px-2 py-0.5 border border-green-200 bg-green-50 text-green-700 font-mono uppercase tracking-widest">
                     {p.status}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-bg border border-app-line w-full max-w-lg p-8 relative shadow-2xl">
            <h2 className="text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest flex items-center gap-2">
               <Receipt className="w-6 h-6" /> TRANSACTION_ENTRY
            </h2>
            
            <form onSubmit={handleAddPayment} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Patient_UID</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.patientId}
                    onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                    placeholder="P-1002"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Patient_Full_Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.patientName}
                    onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Amount_Received (USD)</label>
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
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Payment_Method</label>
                  <select 
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  >
                    <option value="CASH">CASH_LIQUID</option>
                    <option value="CARD">ELECTRONIC_CARD</option>
                    <option value="TRANSFER">BANK_TRANSFER</option>
                    <option value="INSURANCE">INSURANCE_CLAIM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Transaction_Reference / Notes</label>
                <input 
                  type="text" 
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  placeholder="INV-00129 / CO-PAY"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 border border-app-line font-mono text-xs uppercase hover:bg-gray-100 transition-colors">HALT</button>
                <button type="submit" className="px-8 py-2 bg-app-ink text-app-bg font-mono text-xs uppercase hover:opacity-90 transition-opacity">APPROVE_TRANSACTION</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
