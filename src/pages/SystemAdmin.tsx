import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  ShieldAlert, 
  Plus, 
  Hospital as HospitalIcon, 
  Database,
  UserCheck,
  Zap
} from "lucide-react";

export default function SystemAdmin() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [hospitalForm, setHospitalForm] = useState({ name: "", address: "", email: "" });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "hospitals"));
    setHospitals(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "hospitals"), {
        ...hospitalForm,
        createdAt: serverTimestamp()
      });
      setShowHospitalModal(false);
      setHospitalForm({ name: "", address: "", email: "" });
      fetchHospitals();
    } catch (error) {
      console.error("Error adding hospital:", error);
    }
  };

  // Development seeding helper
  const seedDemoData = async () => {
    if (!profile) return;
    try {
      // Ensure current user is an admin for testing if they weren't
      await setDoc(doc(db, "users", profile.id), {
        ...profile,
        role: "SYSTEM_ADMIN",
        status: "ACTIVE"
      });
      alert("System Admin privileges granted to current account. Please refresh.");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-app-line">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase flex items-center gap-3 sm:gap-4">
            <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" /> {t("systemAdmin")}
          </h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">ROOT_CONTROL / TENANT_MANAGEMENT</p>
        </div>
        <button 
          onClick={() => setShowHospitalModal(true)}
          className="h-10 bg-app-ink text-app-bg px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> PROVISION_TENANT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Hospitals List */}
        <div className="bg-white border border-app-line flex flex-col">
           <div className="p-4 border-b border-app-line bg-gray-50 flex items-center justify-between">
              <h2 className="col-header flex items-center gap-2"><HospitalIcon className="w-3 h-3" /> REGISTERED_TENANTS</h2>
              <span className="text-[10px] font-mono opacity-50 uppercase">{hospitals.length} ACTIVE</span>
           </div>
           <div className="divide-y divide-app-line max-h-[400px] overflow-y-auto">
             {hospitals.map((h) => (
               <div key={h.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="min-w-0">
                    <h3 className="font-bold uppercase tracking-tight truncate">{h.name}</h3>
                    <p className="text-[10px] font-mono opacity-50 truncate">{h.address}</p>
                    <p className="text-[10px] font-mono opacity-30 mt-1">ID: {h.id}</p>
                  </div>
                  <UserCheck className="w-4 h-4 opacity-10 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
               </div>
             ))}
           </div>
        </div>

        {/* System Diagnostics / Tools */}
        <div className="space-y-6">
           <div className="bg-white border border-app-line p-6 space-y-4">
              <h2 className="col-header flex items-center gap-2 text-blue-600"><Database className="w-3 h-3" /> SYSTEM_DIAGNOSTICS</h2>
              <div className="space-y-3 pt-2">
                 <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-50">DB_LATENCY</span>
                    <span className="text-green-600 font-bold">12ms (FAST)</span>
                 </div>
                 <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-50">STORAGE_LOAD</span>
                    <span className="font-bold">0.04%</span>
                 </div>
                 <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-50">TENANT_HEALTH</span>
                    <span className="text-green-600 font-bold">OPTIMAL</span>
                 </div>
              </div>
           </div>

           <div className="bg-app-ink text-app-bg p-6 space-y-4 border border-app-line shadow-xl">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                <Zap className="w-3 h-3 text-yellow-400" /> DEVELOPMENT_OVERRIDE
              </h2>
              <p className="text-[11px] leading-relaxed italic font-serif opacity-80">
                Use these tools for rapid testing of the multi-tenant architecture. 
                WARNING: Direct write access to root schema enabled.
              </p>
              <button 
                onClick={seedDemoData}
                className="w-full py-3 border border-app-bg/20 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white hover:text-app-ink transition-all active:scale-95"
              >
                GRANT_SYS_ADMIN_PRIVILEGES
              </button>
           </div>
        </div>
      </div>

      {/* New Hospital Modal */}
      {showHospitalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-22xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest text-center">TENANT_PROVISIONING</h2>
            <form onSubmit={handleAddHospital} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Entity_Name</label>
                <input 
                  type="text" 
                  required 
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="St. Mary Memorial..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Physical_Address</label>
                <input 
                  type="text" 
                  required 
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({...hospitalForm, address: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="Street No. 12..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Admin_Email</label>
                <input 
                  type="email" 
                  required 
                  value={hospitalForm.email}
                  onChange={(e) => setHospitalForm({...hospitalForm, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="admin@tenant.com"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                <button type="button" onClick={() => setShowHospitalModal(false)} className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors">ABORT</button>
                <button type="submit" className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity">EXEC_PROVISIONING</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
