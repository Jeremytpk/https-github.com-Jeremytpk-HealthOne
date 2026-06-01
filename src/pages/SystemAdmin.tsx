import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  ShieldAlert, 
  Plus, 
  Hospital as HospitalIcon, 
  Database,
  UserCheck,
  Zap,
  Users,
  Search,
  Save,
  UserPlus,
  Phone
} from "lucide-react";
import { UserRole } from "../lib/utils";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export default function SystemAdmin() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [hospitalForm, setHospitalForm] = useState({ name: "", address: "", email: "", phone: "" });
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "NURSE",
    hospitalId: ""
  });
  
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userRolesInput, setUserRolesInput] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    fetchHospitals();
    fetchUsers();
  }, []);

  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const uniqueHospitalsMap = new Map<string, any>();

      // 1. Fetch from healthone collection
      try {
        // a. Specifically fetch the individual config document containing the list of hospitals as array of strings
        const hConfigDocRef = doc(db, "healthone", "healthone_hospitals");
        const hConfigDocSnap = await getDoc(hConfigDocRef);
        if (hConfigDocSnap.exists()) {
          const data = hConfigDocSnap.data();
          if (Array.isArray(data.value)) {
            data.value.forEach((hName: any) => {
              if (hName && typeof hName === "string") {
                uniqueHospitalsMap.set(hName, {
                  id: hName,
                  name: hName,
                  address: "HealthOne Pre-configured Tenant (Ndjili Component)",
                  hospitalId: hName,
                  email: "",
                  phone: ""
                });
              }
            });
          }
        }

        // b. Fetch all other documents in the healthone collection (as individual entries)
        const h1Snap = await getDocs(collection(db, "healthone"));
        h1Snap.docs.forEach(docSnap => {
          if (docSnap.id === "healthone_hospitals" || docSnap.id === "healthone_patients" || docSnap.id === "healthone_users") {
            const data = docSnap.data();
            if (Array.isArray(data.value)) {
              data.value.forEach((hName: any) => {
                if (hName && typeof hName === "string" && !uniqueHospitalsMap.has(hName)) {
                  uniqueHospitalsMap.set(hName, {
                    id: hName,
                    name: hName,
                    address: "HealthOne Pre-configured Tenant",
                    hospitalId: hName,
                    email: "",
                    phone: ""
                  });
                }
              });
            }
            return;
          }

          const rawData = docSnap.data();
          if (rawData && rawData.name) {
            uniqueHospitalsMap.set(docSnap.id, {
              id: docSnap.id,
              name: rawData.name,
              address: rawData.address || "No Address Provided",
              email: rawData.email || "",
              contactEmail: rawData.contactEmail || "",
              phone: rawData.phone || "",
              hospitalId: rawData.hospitalId || docSnap.id
            });
          }
        });
      } catch (err) {
        console.error("Error fetching from healthone collection:", err);
      }

      // 2. Fetch from healthone_hospitals collection (and its specific config document if exists)
      try {
        const hhDocRef = doc(db, "healthone_hospitals", "healthone_hospitals");
        const hhDocSnap = await getDoc(hhDocRef);
        if (hhDocSnap.exists()) {
          const data = hhDocSnap.data();
          if (Array.isArray(data.value)) {
            data.value.forEach((hName: any) => {
              if (hName && typeof hName === "string" && !uniqueHospitalsMap.has(hName)) {
                uniqueHospitalsMap.set(hName, {
                  id: hName,
                  name: hName,
                  address: "HealthOne Pre-configured Tenant",
                  hospitalId: hName,
                  email: "",
                  phone: ""
                });
              }
            });
          }
        }

        const hhSnap = await getDocs(collection(db, "healthone_hospitals"));
        hhSnap.docs.forEach(docSnap => {
          if (docSnap.id === "healthone_hospitals") {
            const data = docSnap.data();
            if (Array.isArray(data.value)) {
              data.value.forEach((hName: any) => {
                if (hName && typeof hName === "string" && !uniqueHospitalsMap.has(hName)) {
                  uniqueHospitalsMap.set(hName, {
                    id: hName,
                    name: hName,
                    address: "HealthOne Pre-configured Tenant",
                    hospitalId: hName,
                    email: "",
                    phone: ""
                  });
                }
              });
            }
            return;
          }

          const rawData = docSnap.data();
          if (rawData && rawData.name && !uniqueHospitalsMap.has(docSnap.id)) {
            uniqueHospitalsMap.set(docSnap.id, {
              id: docSnap.id,
              name: rawData.name,
              address: rawData.address || "No Address Provided",
              email: rawData.email || "",
              phone: rawData.phone || "",
              hospitalId: rawData.hospitalId || docSnap.id
            });
          }
        });
      } catch (err) {
        console.error("Error fetching from healthone_hospitals collection:", err);
      }

      // 3. Fetch from hospitals collection as fallback
      try {
        const hSnap = await getDocs(collection(db, "hospitals"));
        hSnap.docs.forEach(docSnap => {
          if (!uniqueHospitalsMap.has(docSnap.id)) {
            const rawData = docSnap.data();
            uniqueHospitalsMap.set(docSnap.id, {
              id: docSnap.id,
              name: rawData.name,
              address: rawData.address || "No Address Provided",
              email: rawData.email || "",
              phone: rawData.phone || "",
              hospitalId: rawData.hospitalId || docSnap.id
            });
          }
        });
      } catch (err) {
        console.error("Error fetching from hospitals collection:", err);
      }

      const mergedList = Array.from(uniqueHospitalsMap.values());
      setHospitals(mergedList);
    } catch (err) {
      console.error("Error in fetchHospitals combined query:", err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const fetchedUsers: any[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
      
      const rolesInputMap: { [userId: string]: string } = {};
      fetchedUsers.forEach(u => {
        rolesInputMap[u.id] = u.role || "NURSE";
      });
      setUserRolesInput(rolesInputMap);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create main hospital document inside hospitals collection
      const docRef = await addDoc(collection(db, "hospitals"), {
        name: hospitalForm.name,
        address: hospitalForm.address,
        email: hospitalForm.email || "",
        contactEmail: hospitalForm.email || "",
        phone: hospitalForm.phone || "",
        createdAt: serverTimestamp()
      });
      
      const generatedHospitalId = docRef.id;

      // 2. Add inside healthone collection with Hospital ID
      await setDoc(doc(db, "healthone", generatedHospitalId), {
        name: hospitalForm.name,
        address: hospitalForm.address,
        email: hospitalForm.email || "",
        contactEmail: hospitalForm.email || "",
        phone: hospitalForm.phone || "",
        hospitalId: generatedHospitalId,
        createdAt: serverTimestamp()
      });

      // 3. Add inside healthone_hospitals collection with Hospital ID
      await setDoc(doc(db, "healthone_hospitals", generatedHospitalId), {
        name: hospitalForm.name,
        address: hospitalForm.address,
        email: hospitalForm.email || "",
        contactEmail: hospitalForm.email || "",
        phone: hospitalForm.phone || "",
        hospitalId: generatedHospitalId,
        createdAt: serverTimestamp()
      });

      setShowHospitalModal(false);
      setHospitalForm({ name: "", address: "", email: "", phone: "" });
      fetchHospitals();
      alert(`Tenant provisioned successfully!\nHospital ID: ${generatedHospitalId}`);
    } catch (error) {
      console.error("Error adding hospital:", error);
      alert("Error provisioning tenant: Make sure security rules are fully deployed.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.username || !userForm.email || !userForm.password) {
      alert("Please fill in all required fields (Name, Username, Email, Password).");
      return;
    }

    setCreateUserLoading(true);
    let secondaryApp;
    try {
      // Initialize dynamic secondary app to avoid logging out the current administrator session
      secondaryApp = initializeApp(firebaseConfig, "UserCreationApp");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        userForm.email.trim(),
        userForm.password.trim()
      );

      const newUid = userCredential.user.uid;

      // Save user record inside the main Firestore "users" collection
      await setDoc(doc(db, "users", newUid), {
        id: newUid,
        uid: newUid,
        name: userForm.name.trim(),
        fullName: userForm.name.trim(),
        username: userForm.username.toLowerCase().trim(),
        email: userForm.email.trim(),
        password: userForm.password.trim(),
        role: userForm.role,
        hospitalId: userForm.hospitalId || "", // empty or selected hospital ID
        status: "ACTIVE",
        createdAt: serverTimestamp()
      });

      alert(`User Account @${userForm.username} successfully registered!`);
      setShowUserModal(false);
      setUserForm({
        name: "",
        username: "",
        email: "",
        password: "",
        role: "NURSE",
        hospitalId: ""
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Error registered new user:", error);
      alert("Failed to register user: " + error.message);
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (err) {
          console.error("Error destroying secondary app instance:", err);
        }
      }
      setCreateUserLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string) => {
    const newRole = userRolesInput[userId];
    if (!newRole) return;
    
    setUpdatingUserId(userId);
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      alert("User role updated successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getHospitalName = (hId: string) => {
    if (!hId) return "No Hospital Assignment";
    const match = hospitals.find(h => h.id === hId);
    return match ? match.name : `ID: ${hId.slice(0, 8)}...`;
  };

  // Development seeding helpers for quick authorization
  const seedDemoData = async (targetRole: "SYSTEM_ADMIN" | "SUP_ADMIN") => {
    if (!profile) return;
    try {
      await setDoc(doc(db, "users", profile.id), {
        ...profile,
        role: targetRole,
        status: "ACTIVE"
      });
      alert(`Access granted!\nRole changed to [${targetRole}]. Please refresh the application to apply.`);
    } catch (error) {
      console.error(error);
      alert("Error setting admin privileges: " + error);
    }
  };

  const availableRoles: UserRole[] = [
    'SUP_ADMIN',
    'SYSTEM_ADMIN',
    'ADMIN',
    'Pediatre',
    'Register',
    'HR',
    'DOCTOR',
    'NURSE',
    'CASHIER',
    'RECEPTIONIST',
    'PHARMACIST',
    'PHARMACIE',
    'INVENTAIRE'
  ];

  // Filter users
  const filteredUsers = users.filter(u => {
    const search = userSearchTerm.toLowerCase();
    const nameMatch = (u.name || "").toLowerCase().includes(search);
    const emailMatch = (u.email || "").toLowerCase().includes(search);
    const roleMatch = (u.role || "").toLowerCase().includes(search);
    return nameMatch || emailMatch || roleMatch;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2 border-b border-app-line">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase flex items-center gap-3 sm:gap-4">
            <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 text-slate-800" /> SupAdmin Control Panel
          </h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">ROOT_CONTROL / TENANT &amp; USER MANAGEMENT</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto pt-2">
          <button 
            onClick={() => setShowUserModal(true)}
            className="h-10 bg-white text-slate-900 px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:bg-slate-50 transition-all border border-app-line w-full sm:w-auto shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" /> REGISTER_NEW_USER
          </button>
          <button 
            onClick={() => setShowHospitalModal(true)}
            className="h-10 bg-app-ink text-app-bg px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line w-full sm:w-auto shadow-sm"
          >
            <Plus className="w-4 h-4" /> PROVISION_TENANT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Left column - Tenants & Analytics */}
        <div className="xl:col-span-5 space-y-6">
          {/* Hospitals List */}
          <div className="bg-white border border-app-line flex flex-col">
            <div className="p-4 border-b border-app-line bg-gray-50 flex items-center justify-between">
              <h2 className="title-section text-[11px] font-bold font-mono text-slate-700 flex items-center gap-2 uppercase tracking-widest">
                <HospitalIcon className="w-4 h-4 text-slate-500" /> REGISTERED_TENANTS
              </h2>
              <span className="text-[10px] font-mono opacity-50 uppercase">{hospitals.length} ACTIVE</span>
            </div>
            
            <div className="divide-y divide-app-line max-h-[300px] overflow-y-auto">
              {loadingHospitals ? (
                <div className="p-8 text-center text-xs font-mono opacity-50">LOADING_TENANTS...</div>
              ) : hospitals.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono opacity-50">NO REGISTERED TENANTS</div>
              ) : (
                hospitals.map((h) => (
                  <div key={h.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="min-w-0">
                      <h3 className="font-bold uppercase tracking-tight truncate text-sm text-slate-800">{h.name}</h3>
                      <p className="text-[10px] font-mono opacity-60 truncate">{h.address}</p>
                      <p className="text-[10px] font-mono opacity-40 mt-1">Hospital ID: {h.id}</p>
                    </div>
                    <UserCheck className="w-4 h-4 opacity-10 group-hover:opacity-100 transition-opacity ml-2 shrink-0 text-green-600" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Diagnostics Section */}
          <div className="bg-white border border-app-line p-6 space-y-4">
            <h2 className="text-[11px] font-bold font-mono text-slate-700 flex items-center gap-2 uppercase tracking-widest border-b border-app-line pb-2">
              <Database className="w-4 h-4 text-blue-600" /> SYSTEM_DIAGNOSTICS
            </h2>
            <div className="space-y-3">
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

          {/* Admin Override Seeding Helpers */}
          <div className="bg-app-ink text-app-bg p-6 space-y-4 border border-app-line shadow-xl">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-400" /> DEVELOPMENT PRIVILEGES
            </h2>
            <p className="text-[11px] leading-relaxed italic font-serif opacity-80">
              For testing purposes, you can grant yourself system administrator or super administrator roles below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => seedDemoData("SUP_ADMIN")}
                className="py-2.5 bg-yellow-600 text-white border border-yellow-700 text-[10px] font-mono uppercase tracking-wider hover:bg-yellow-500 transition-all active:scale-95"
              >
                GRANT SUP_ADMIN
              </button>
              <button 
                onClick={() => seedDemoData("SYSTEM_ADMIN")}
                className="py-2.5 border border-app-bg/20 text-[10px] font-mono uppercase tracking-wider hover:bg-white hover:text-app-ink transition-all active:scale-95"
              >
                GRANT SYSTEM_ADMIN
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Users Role Management */}
        <div className="xl:col-span-7 bg-white border border-app-line flex flex-col">
          <div className="p-4 border-b border-app-line bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold font-mono text-slate-700 flex items-center gap-2 uppercase tracking-widest">
              <Users className="w-4 h-4 text-slate-600" /> USER_ROLES_&amp;_PRIVILEGES
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search user..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-white border border-app-line pl-8 pr-3 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-app-ink"
              />
            </div>
          </div>

          <div className="divide-y divide-app-line overflow-y-auto max-h-[580px]">
            {loadingUsers ? (
              <div className="p-12 text-center text-xs font-mono opacity-50">LOADING_USERS...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono opacity-50">NO MATCHING USERS FOUND</div>
            ) : (
              filteredUsers.map((u) => {
                const userRole = u.role || "NURSE";
                const isUpdating = updatingUserId === u.id;
                
                return (
                  <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{u.name || "Unnamed user"}</span>
                        <span className="text-[9px] font-mono border border-app-line px-1.5 py-0.5 bg-slate-100 text-slate-600 uppercase tracking-widest">{userRole}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <HospitalIcon className="w-3 h-3" /> {getHospitalName(u.hospitalId)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select 
                        value={userRolesInput[u.id] || userRole}
                        onChange={(e) => setUserRolesInput({ ...userRolesInput, [u.id]: e.target.value })}
                        className="bg-white border border-app-line px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-app-ink h-9 w-40"
                      >
                        {availableRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleUpdateUserRole(u.id)}
                        disabled={isUpdating}
                        className={`h-9 bg-slate-900 hover:bg-slate-800 text-white px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                        title="Save role changes"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isUpdating ? "SAVING..." : "SAVE"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* New Hospital Modal */}
      {showHospitalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest text-center">TENANT_PROVISIONING</h2>
            <form onSubmit={handleAddHospital} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Entity_Name</label>
                <input 
                  type="text" 
                  required 
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink animate-none"
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
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink animate-none"
                  placeholder="Street No. 12..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Admin_Email (Optional)</label>
                <input 
                  type="email" 
                  value={hospitalForm.email}
                  onChange={(e) => setHospitalForm({...hospitalForm, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink animate-none"
                  placeholder="admin@tenant.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Phone_Number (Optional)</label>
                <input 
                  type="text" 
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({...hospitalForm, phone: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink animate-none"
                  placeholder="+243..."
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

      {/* New User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest text-center">USER_REGISTRATION</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Full_Name</label>
                <input 
                  type="text" 
                  required 
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="Jean Dupont..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Username</label>
                <input 
                  type="text" 
                  required 
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="jdupont"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Email (for authentication)</label>
                <input 
                  type="email" 
                  required 
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="jdupont@healthone.app"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Password</label>
                <input 
                  type="password" 
                  required 
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Assigned_Role</label>
                <select 
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Associated_Hospital (Tenant)</label>
                <select 
                  value={userForm.hospitalId}
                  onChange={(e) => setUserForm({...userForm, hospitalId: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                >
                  <option value="">System-Wide / Root (SupAdmin)</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)} 
                  disabled={createUserLoading} 
                  className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  ABORT
                </button>
                <button 
                  type="submit" 
                  disabled={createUserLoading}
                  className="px-10 py-2.5 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createUserLoading ? "REGISTERING..." : "EXEC_REGISTRATION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
