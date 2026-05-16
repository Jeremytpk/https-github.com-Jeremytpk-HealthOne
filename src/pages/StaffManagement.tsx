import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  Users, 
  UserMinus, 
  Calendar, 
  Plane, 
  Power, 
  UserPlus, 
  Search,
  Clock
} from "lucide-react";
import { UserRole, UserStatus } from "../lib/utils";

export default function StaffManagement() {
  const { hospitalId, profile } = useAuth();
  const { t } = useLanguage();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Staff form
  const [newStaffData, setNewStaffData] = useState({
    name: "",
    email: "",
    role: "NURSE" as UserRole,
  });

  useEffect(() => {
    if (hospitalId) fetchStaff();
  }, [hospitalId]);

  const fetchStaff = async () => {
    setLoading(true);
    const q = query(collection(db, "users"), where("hospitalId", "==", hospitalId));
    const querySnapshot = await getDocs(q);
    setStaff(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const updateStatus = async (userId: string, status: UserStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), { status });
      fetchStaff();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;

    try {
      // In a real system, this would trigger an invite or Auth creation
      // For this demo, we'll just add the profile
      await addDoc(collection(db, "users"), {
        ...newStaffData,
        hospitalId,
        status: "ACTIVE",
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      fetchStaff();
    } catch (error) {
      console.error("Error adding staff:", error);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase">{t("staffManagement")}</h1>
          <p className="text-sm font-mono opacity-50 uppercase tracking-widest">HR_MODULE / PERSONNEL_LOGS</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="h-10 bg-app-ink text-app-bg px-6 flex items-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line"
        >
          <UserPlus className="w-4 h-4" /> {t("staff")} [NEW_ENTRY]
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => (
          <div key={s.id} className="bg-white border border-app-line p-6 relative group overflow-hidden">
             {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Users className="w-24 h-24" />
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-app-ink text-app-bg flex items-center justify-center font-mono text-sm">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{s.name}</h3>
                  <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{s.role}</p>
                </div>
              </div>
              <span className={`text-[9px] px-2 py-0.5 border font-mono uppercase ${getStatusColor(s.status)}`}>
                {s.status}
              </span>
            </div>

            <div className="space-y-2 mb-8">
               <div className="flex items-center gap-2 text-xs font-mono opacity-60">
                 <Clock className="w-3 h-3" /> SHIFT_MON_FRI: 08:00 - 16:00
               </div>
            </div>

            <div className="flex items-center gap-1 border-t border-app-line pt-4">
              <button 
                onClick={() => updateStatus(s.id, 'ACTIVE')}
                title="Set Active"
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-green-50 transition-colors"
              >
                <Power className="w-3 h-3 text-green-600" />
              </button>
              <button 
                onClick={() => updateStatus(s.id, 'ON_VACATION')}
                title="On Vacation"
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-blue-50 transition-colors"
              >
                <Plane className="w-3 h-3 text-blue-600" />
              </button>
              <button 
                onClick={() => updateStatus(s.id, 'OFF')}
                title="Off Duty"
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-orange-50 transition-colors"
              >
                <Calendar className="w-3 h-3 text-orange-600" />
              </button>
              <button 
                onClick={() => updateStatus(s.id, 'TERMINATED')}
                title="Terminate"
                className="flex-1 h-8 border border-app-line flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <UserMinus className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-bg border border-app-line w-full max-w-md p-8 relative shadow-2xl">
            <h2 className="text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2">{t("staff")} [REG_FORM]</h2>
            
            <form onSubmit={handleAddStaff} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Full_Name</label>
                <input 
                  type="text" 
                  required 
                  value={newStaffData.name}
                  onChange={(e) => setNewStaffData({...newStaffData, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Email_Address</label>
                <input 
                  type="email" 
                  required 
                  value={newStaffData.email}
                  onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Designated_Role</label>
                <select 
                  value={newStaffData.role}
                  onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value as UserRole})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                >
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="NURSE">NURSE</option>
                  <option value="RECEPTIONIST">RECEPTIONIST</option>
                  <option value="PHARMACIST">PHARMACIST</option>
                  <option value="CASHIER">CASHIER</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-app-line font-mono text-xs uppercase hover:bg-gray-100 transition-colors"
                >
                  HALT
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2 bg-app-ink text-app-bg font-mono text-xs uppercase hover:opacity-90 transition-opacity"
                >
                  INITIALIZE_ENROLLMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
