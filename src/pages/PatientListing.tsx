import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDocs,
  limit
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Search, UserPlus, ArrowRight, User } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function PatientListing() {
  const { hospitalId, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegModal, setShowRegModal] = useState(false);

  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch) {
      setSearchTerm(querySearch);
    }
    if (searchParams.get("register") === "true") {
      setShowRegModal(true);
    }
  }, [searchParams]);
  
  // Registration Form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "Other",
    phone: "",
    email: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (hospitalId) {
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
        setLoading(false);
      }, (error) => {
        console.error("Error fetching patients:", error);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => unsubscribe();
  }, [hospitalId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("HANDLE_REGISTER_TRIGGERED", { hospitalId, formData });
    setFormError(null);
    setIsSubmitting(true);
    
    if (!hospitalId) {
      console.error("REGISTRATION_BLOCKED: No hospitalId found in context/profile");
      setFormError("SYSTEM_ERROR: No assigned hospital found for this account. Please contact an admin.");
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("PROCEEDING_WITH_ADD_DOC", { hospitalId });
      // Basic age calculation
      const birthDate = new Date(formData.dateOfBirth);
      const age = new Date().getFullYear() - birthDate.getFullYear();

      const docRef = await addDoc(collection(db, "patients"), {
        ...formData,
        age,
        hospitalId: hospitalId,
        status: "Registered",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        registeredBy: profile?.id || "unknown"
      });
      
      console.log("SUCCESSFUL_REGISTRATION:", docRef.id);
      setShowRegModal(false);
      navigate(`/patients/${docRef.id}`);
    } catch (error: any) {
      console.error("Error registering patient:", error);
      setFormError(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t("patients")}</h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
            Managing {patients.length} Records / Registry Root
          </p>
        </div>
        <button 
          onClick={() => setShowRegModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          {t("registerPatient")}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative group flex-1 max-w-sm">
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
                <th className="p-3 pl-6">#</th>
                <th className="p-3">{t("patientName")}</th>
                <th className="p-3">Demographics</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                    SYNCING ENCRYPTED RECORDS...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-xs font-bold text-slate-400">
                    NO MATCHING RECORDS FOUND
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p, idx) => (
                  <tr 
                    key={p.id} 
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="data-row group cursor-pointer"
                  >
                    <td className="p-3 pl-6 font-mono text-slate-400 text-[10px]">#{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] border border-blue-100">
                          {p.firstName.charAt(0)}
                        </div>
                        <span className="font-bold text-blue-600 group-hover:underline">
                          {p.firstName} {p.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 uppercase">
                          {p.gender?.charAt(0) || 'U'} / {p.dateOfBirth}
                        </span>
                        {p.age && (
                          <span className="bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600">
                            {p.age} YRS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[10px] uppercase">
                      {p.phone || 'NO_PHONE'}
                    </td>
                    <td className="p-3 pr-6">
                      <div className="flex justify-end">
                        <div className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-200">
                          <ArrowRight className="w-3 h-3 text-blue-600" />
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
        <div className="p-2 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <span>Total: {patients.length} | Visible: {filteredPatients.length}</span>
           <span>HIPAA Compliance: SECURE_CHANNEL_READY</span>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl p-8 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
               <UserPlus className="w-5 h-5 text-blue-500" />
               {t("registerPatient")}
            </h2>
            
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">First Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Last Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Date of Birth</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Gender</label>
                   <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                   >
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                   </select>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-3 mt-6 pt-6 border-t border-slate-100">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-[10px] font-bold uppercase mb-2">
                    {formError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setShowRegModal(false)}
                    className="px-6 py-2 text-slate-500 font-bold text-xs uppercase hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t("cancel")}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-10 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-400 disabled:shadow-none flex items-center gap-2"
                  >
                    {isSubmitting ? 'Processing...' : t("save")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
