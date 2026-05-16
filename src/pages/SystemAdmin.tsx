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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase flex items-center gap-4">
            <ShieldAlert className="w-10 h-10" /> {t("systemAdmin")}
          </h1>
          <p className="text-sm font-mono opacity-50 uppercase tracking-widest">ROOT_CONTROL / TENANT_MANAGEMENT</p>
        </div>
        <button 
          onClick={() => setShowHospitalModal(true)}
          className="h-10 bg-app-ink text-app-bg px-6 flex items-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line"
        >
          <Plus className="w-4 h-4" /> PROVISION_NEW_HOSPITAL
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Hospitals List */}
        <div className="bg-white border border-app-line">
           <div className="p-4 border-b border-app-line bg-gray-50 flex items-center justify-between">
              <h2 className="col-header flex items-center gap-2"><HospitalIcon className="w-3 h-3" /> REGISTERED_TENANTS</h2>
              <span className="text-[10px] font-mono opacity-50">{hospitals.length} ACTIVE</span>
           </div>
           <div className="divide-y divide-app-line max-h-[400px] overflow-y-auto">
             {hospitals.map((h) => (
               <div key={h.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold uppercase tracking-tight">{h.name}</h3>
                    <p className="text-[10px] font-mono opacity-50">{h.address}</p>
                    <p className="text-[10px] font-mono opacity-30">UID: {h.id}</p>
                  </div>
                  <UserCheck className="w-4 h-4 opacity-20" />
               </div>
             ))}
           </div>
        </div>

        {/* System Diagnostics / Tools */}
        <div className="space-y-6">
           <div className="bg-white border border-app-line p-6 space-y-4">
              <h2 className="col-header flex items-center gap-2"><Database className="w-3 h-3" /> SYSTEM_DIAGNOSTICS</h2>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs font-mono">
                    <span>DB_LATENCY</span>
                    <span className="text-green-600">12ms (FAST)</span>
                 </div>
                 <div className="flex justify-between text-xs font-mono">
                    <span>STORAGE_LOAD</span>
                    <span>0.04%</span>
                 </div>
                 <div className="flex justify-between text-xs font-mono">
                    <span>TENANT_HEALTH</span>
                    <span className="text-green-600">OPTIMAL</span>
                 </div>
              </div>
           </div>

           <div className="bg-app-ink text-app-bg p-6 space-y-4 border border-app-line">
              <h2 className="text-[10px] font-mono uppercase tracking-widest opacity-50 flex items-center gap-2">
                <Zap className="w-3 h-3" /> DEVELOPMENT_OVERRIDE
              </h2>
              <p className="text-[10px] italic font-serif">
                Use these tools for rapid testing of the multi-tenant architecture. 
                WARNING: Direct write to root schema.
              </p>
              <button 
                onClick={seedDemoData}
                className="w-full py-2 border border-app-bg/20 text-[10px] font-mono uppercase tracking-widest hover:bg-white hover:text-app-ink transition-all"
              >
                GRANT_SYS_ADMIN_PRIVILEGES_TO_SELF
              </button>
           </div>
        </div>
      </div>

      {/* New Hospital Modal */}
      {showHospitalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-bg border border-app-line w-full max-w-md p-8 relative shadow-2xl">
            <h2 className="text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest">TENANT_PROVISIONING</h2>
            <form onSubmit={handleAddHospital} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Entity_Name</label>
                <input 
                  type="text" 
                  required 
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  placeholder="St. Mary Memorial..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Physical_Address</label>
                <input 
                  type="text" 
                  required 
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({...hospitalForm, address: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Contact_Email (Admin)</label>
                <input 
                  type="email" 
                  required 
                  value={hospitalForm.email}
                  onChange={(e) => setHospitalForm({...hospitalForm, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setShowHospitalModal(false)} className="px-6 py-2 border border-app-line font-mono text-xs uppercase">ABORT</button>
                <button type="submit" className="px-8 py-2 bg-app-ink text-app-bg font-mono text-xs uppercase">EXEC_PROVISIONING</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
