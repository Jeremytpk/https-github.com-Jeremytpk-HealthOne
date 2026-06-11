import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
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
  Phone,
  Coins,
  TrendingUp,
  Percent,
  Receipt,
  Scale,
  Trash2
} from "lucide-react";
import { UserRole, getNormalizedRole } from "../lib/utils";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function SystemAdmin() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();

  const userRole = getNormalizedRole(profile?.role);
  if (userRole !== "SYSTEM_ADMIN" && userRole !== "SUP_ADMIN") {
    return (
      <div className="p-8 text-center min-h-[50vh] flex flex-col justify-center items-center animate-fade-in">
        <ShieldAlert className="w-16 h-16 text-rose-600 mb-4 animate-bounce" />
        <h1 className="text-2xl font-serif italic font-bold text-slate-900 mb-2">ACCESS_DENIED</h1>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest max-w-sm">
          Only the super administrator (sup_admin) has authority to provision hospital nodes or manage system infrastructure.
        </p>
      </div>
    );
  }

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

  // Financial splits state & filter inputs
  const [payments, setPayments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState("");
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");

  // Graph and metrics interaction
  const [activeMetric, setActiveMetric] = useState<"users" | "patients" | "payments" | "combined">("combined");
  const [activeChartType, setActiveChartType] = useState<"line" | "bar" | "area">("line");

  // Edit Details State Variables
  const [selectedEditUser, setSelectedEditUser] = useState<any | null>(null);
  const [selectedEditHospital, setSelectedEditHospital] = useState<any | null>(null);
  
  const [editUserForm, setEditUserForm] = useState({
    name: "",
    username: "",
    email: "",
    role: "NURSE",
    hospitalId: "",
    status: "ACTIVE"
  });

  const [editHospitalForm, setEditHospitalForm] = useState({
    name: "",
    address: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    // 1. Transient data loading states
    setLoadingPayments(true);
    setLoadingUsers(true);

    // 2. Real-time payments and patients
    const unsubPayments = onSnapshot(collection(db, "payments"), (snapshot) => {
      const fetchedPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(fetchedPayments);
      setLoadingPayments(false);
    }, (err) => {
      console.error("Error fetching admin payments in real-time:", err);
      setLoadingPayments(false);
    });

    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const fetchedPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(fetchedPatients);
    }, (err) => {
      console.error("Error fetching admin patients in real-time:", err);
    });

    // 3. Real-time users list
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const fetchedUsers: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
      
      const rolesInputMap: { [userId: string]: string } = {};
      fetchedUsers.forEach(u => {
        rolesInputMap[u.id] = u.role || "NURSE";
      });
      setUserRolesInput(rolesInputMap);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error fetching admin users in real-time:", err);
      setLoadingUsers(false);
    });

    // 4. Real-time hospitals & config trigger
    const unsubHospitalsList = onSnapshot(collection(db, "hospitals"), () => {
      fetchHospitals();
    });
    const unsubHealthOne = onSnapshot(collection(db, "healthone"), () => {
      fetchHospitals();
    });
    const unsubHealthOneHospitals = onSnapshot(collection(db, "healthone_hospitals"), () => {
      fetchHospitals();
    });

    return () => {
      unsubPayments();
      unsubPatients();
      unsubUsers();
      unsubHospitalsList();
      unsubHealthOne();
      unsubHealthOneHospitals();
    };
  }, []);

  const fetchPaymentsAndPatients = async () => {
    // Handled in real time by onSnapshot subscription
  };

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

        // Fetch from nested healthone collection inside healthone_hospitals collection
        try {
          const nestedSnap = await getDocs(collection(db, "healthone_hospitals", "healthone", "healthone"));
          nestedSnap.docs.forEach(docSnap => {
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
        } catch (nestedErr) {
          console.error("Error fetching nested healthone collection inside healthone_hospitals:", nestedErr);
        }
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
    // Handled in real time by onSnapshot subscription
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

      // 4. Add inside healthone collection inside healthone_hospitals collection
      await setDoc(doc(db, "healthone_hospitals", "healthone", "healthone", generatedHospitalId), {
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

  const handleOpenEditUser = (user: any) => {
    setSelectedEditUser(user);
    setEditUserForm({
      name: user.name || user.fullName || "",
      username: user.username || "",
      email: user.email || "",
      role: user.role || "NURSE",
      hospitalId: user.hospitalId || "",
      status: user.status || "ACTIVE"
    });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;
    setUpdatingUserId(selectedEditUser.id);
    try {
      const userDocRef = doc(db, "users", selectedEditUser.id);
      await updateDoc(userDocRef, {
        name: editUserForm.name.trim(),
        fullName: editUserForm.name.trim(),
        username: editUserForm.username.toLowerCase().trim(),
        email: editUserForm.email.trim(),
        role: editUserForm.role,
        hospitalId: editUserForm.hospitalId,
        status: editUserForm.status,
      });
      alert(language === 'fr' 
        ? "Informations de l'utilisateur mises à jour avec succès !" 
        : "User information updated successfully!");
      setSelectedEditUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Error updating user details:", err);
      alert("Failed to update user: " + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenEditHospital = (h: any) => {
    setSelectedEditHospital(h);
    setEditHospitalForm({
      name: h.name || "",
      address: h.address || "",
      email: h.email || h.contactEmail || "",
      phone: h.phone || ""
    });
  };

  const handleSaveHospitalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditHospital) return;
    const hId = selectedEditHospital.id;
    try {
      const payload = {
        name: editHospitalForm.name.trim(),
        address: editHospitalForm.address.trim(),
        email: editHospitalForm.email.trim(),
        contactEmail: editHospitalForm.email.trim(),
        phone: editHospitalForm.phone.trim(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "hospitals", hId), payload, { merge: true });
      await setDoc(doc(db, "healthone", hId), { ...payload, hospitalId: hId }, { merge: true });
      await setDoc(doc(db, "healthone_hospitals", hId), { ...payload, hospitalId: hId }, { merge: true });
      await setDoc(doc(db, "healthone_hospitals", "healthone", "healthone", hId), { ...payload, hospitalId: hId }, { merge: true });

      alert(language === 'fr' 
        ? "Informations de l'établissement mises à jour avec succès !" 
        : "Hospital tenant details updated successfully!");
      setSelectedEditHospital(null);
      fetchHospitals();
    } catch (err: any) {
      console.error("Error updating hospital details:", err);
      alert("Failed to update hospital: " + err.message);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'hospital';
    id: string;
    name: string;
  } | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userRole !== "SUP_ADMIN" && userRole !== "SYSTEM_ADMIN") {
      alert(language === 'fr' 
        ? "Action non autorisée. Seul le Super Administrateur (SUP_ADMIN) est autorisé à supprimer un compte." 
        : "Unauthorized action. Only the Super Administrator (SUP_ADMIN) is allowed to delete user accounts.");
      return;
    }
    setDeleteConfirm({
      type: 'user',
      id: userId,
      name: userName
    });
  };

  const handleDeleteHospital = async (hospitalId: string, hospitalName: string) => {
    if (userRole !== "SUP_ADMIN" && userRole !== "SYSTEM_ADMIN") {
      alert(language === 'fr' 
        ? "Action non autorisée. Seul le Super Administrateur (SUP_ADMIN) est autorisé à supprimer un établissement." 
        : "Unauthorized action. Only the Super Administrator (SUP_ADMIN) is allowed to delete a tenant.");
      return;
    }
    setDeleteConfirm({
      type: 'hospital',
      id: hospitalId,
      name: hospitalName
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeletingLoading(true);
    try {
      if (deleteConfirm.type === 'user') {
        await deleteDoc(doc(db, "users", deleteConfirm.id));
        alert(language === 'fr'
          ? "Compte d'utilisateur supprimé avec succès."
          : "User account successfully deleted.");
        setSelectedEditUser(null);
        fetchUsers();
      } else if (deleteConfirm.type === 'hospital') {
        await deleteDoc(doc(db, "hospitals", deleteConfirm.id));
        await deleteDoc(doc(db, "healthone", deleteConfirm.id));
        await deleteDoc(doc(db, "healthone_hospitals", deleteConfirm.id));
        await deleteDoc(doc(db, "healthone_hospitals", "healthone", "healthone", deleteConfirm.id));

        alert(language === 'fr'
          ? "Établissement supprimé avec succès."
          : "Tenant deleted successfully.");
        setSelectedEditHospital(null);
        fetchHospitals();
      }
    } catch (error: any) {
      console.error("Error executing delete:", error);
      alert(language === 'fr'
        ? "Échec de la suppression: " + error.message
        : "Failed to delete: " + error.message);
    } finally {
      setIsDeletingLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleValidateUser = async (userId: string) => {
    setUpdatingUserId(userId);
    try {
      await updateDoc(doc(db, "users", userId), { status: "ACTIVE" });
      alert("User account validated and approved successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error validating user:", error);
      alert("Failed to validate user account.");
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
    const usernameMatch = (u.username || "").toLowerCase().includes(search);
    const hosp = hospitals.find(h => h.id === u.hospitalId);
    const hospitalMatch = hosp ? hosp.name.toLowerCase().includes(search) : false;
    return nameMatch || emailMatch || roleMatch || usernameMatch || hospitalMatch;
  });

  const getPaymentTenureAndSplit = (payment: any) => {
    const paymentDate = payment.createdAt ? (
      typeof payment.createdAt.toDate === 'function' 
        ? payment.createdAt.toDate() 
        : payment.createdAt.seconds 
        ? new Date(payment.createdAt.seconds * 1000)
        : new Date(payment.createdAt)
    ) : new Date();

    const amountVal = Number(payment.amount) || 0;
    const isFC = payment.currency === "FC" || payment.currency === "CDF" || payment.currency === "CFC";
    
    // In each payment we remove $1 (or 2,200 Congo francs) and divide the percentage within that $1 / 2200 FC base only.
    const splitBase = isFC ? Math.min(amountVal, 2200) : Math.min(amountVal, 1.0);
    const hospitalRetainedBeforeSplit = amountVal - splitBase;

    const pt = patients.find(p => p.id === payment.patientId);
    if (!pt) {
      return {
        patientRegDate: null,
        tenureMonths: 0,
        isFirstTwoMonths: true,
        splitPercentageAdmin: 60,
        splitPercentageHospital: 40,
        splitBase,
        hospitalRetainedBeforeSplit,
        adminAmount: splitBase * 0.60,
        hospitalAmount: hospitalRetainedBeforeSplit + (splitBase * 0.40),
        hospitalSplitShareOnly: splitBase * 0.40,
      };
    }

    const patientRegDate = pt.createdAt ? (
      typeof pt.createdAt.toDate === 'function' 
        ? pt.createdAt.toDate() 
        : pt.createdAt.seconds 
        ? new Date(pt.createdAt.seconds * 1000)
        : new Date(pt.createdAt)
    ) : null;

    if (!patientRegDate || isNaN(patientRegDate.getTime()) || isNaN(paymentDate.getTime())) {
      return {
        patientRegDate: patientRegDate,
        tenureMonths: 0,
        isFirstTwoMonths: true,
        splitPercentageAdmin: 60,
        splitPercentageHospital: 40,
        splitBase,
        hospitalRetainedBeforeSplit,
        adminAmount: splitBase * 0.60,
        hospitalAmount: hospitalRetainedBeforeSplit + (splitBase * 0.40),
        hospitalSplitShareOnly: splitBase * 0.40,
      };
    }

    // Month difference (paymentYear - patientYear) * 12 + (paymentMonth - patientMonth)
    const diffMonths = (paymentDate.getFullYear() - patientRegDate.getFullYear()) * 12 + (paymentDate.getMonth() - patientRegDate.getMonth());
    
    let isFirstTwoMonths = true;
    if (diffMonths > 2) {
      isFirstTwoMonths = false;
    } else if (diffMonths === 2) {
      if (paymentDate.getDate() > patientRegDate.getDate()) {
        isFirstTwoMonths = false;
      }
    }

    const adminRate = isFirstTwoMonths ? 60 : 50;
    const hospitalRate = isFirstTwoMonths ? 40 : 50;

    return {
      patientRegDate,
      diffMonths,
      isFirstTwoMonths,
      splitPercentageAdmin: adminRate,
      splitPercentageHospital: hospitalRate,
      splitBase,
      hospitalRetainedBeforeSplit,
      adminAmount: splitBase * (adminRate / 100),
      hospitalAmount: hospitalRetainedBeforeSplit + (splitBase * (hospitalRate / 100)),
      hospitalSplitShareOnly: splitBase * (hospitalRate / 100),
    };
  };

  const formattedPaymentDate = (createdAt: any) => {
    if (!createdAt) return "—";
    let d: Date | null = null;
    if (typeof createdAt.toDate === 'function') {
      d = createdAt.toDate();
    } else if (createdAt.seconds) {
      d = new Date(createdAt.seconds * 1000);
    } else {
      try {
        d = new Date(createdAt);
      } catch (e) {
        return "—";
      }
    }
    if (!d || isNaN(d.getTime())) return "—";
    
    if (language === 'fr') {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } else {
      return d.toLocaleDateString('en-US');
    }
  };

  const computedPayments = payments.map((p: any) => {
    const analysis = getPaymentTenureAndSplit(p);
    return {
      ...p,
      analysis,
    };
  });

  const filteredPayments = computedPayments.filter((p: any) => {
    const search = paymentSearchTerm.trim().toLowerCase();
    if (!search) {
      const hospitalOk = !selectedHospitalFilter || p.hospitalId === selectedHospitalFilter;
      return hospitalOk;
    }

    // 1. Patient matching
    const pt = patients.find(pat => pat.id === p.patientId);
    const patientNameMatch = (p.patientName || "").toLowerCase().includes(search) || (pt?.name || pt?.fullName || "").toLowerCase().includes(search);
    const patientPhoneMatch = pt ? (pt.phone || "").toLowerCase().includes(search) : false;
    const patientEmailMatch = pt ? (pt.email || "").toLowerCase().includes(search) : false;
    const patientIdMatch = (p.patientId || "").toLowerCase().includes(search);

    // 2. Reference & Case ID matching
    const refMatch = (p.reference || "").toLowerCase().includes(search);
    const caseIdMatch = (p.caseId || "").toLowerCase().includes(search);
    const amountMatch = String(p.amount || "").includes(search);

    // 3. Hospital/Tenant matching
    const hosp = hospitals.find(h => h.id === p.hospitalId);
    const hospitalNameMatch = hosp ? hosp.name.toLowerCase().includes(search) : false;
    const hospitalAddressMatch = hosp ? (hosp.address || "").toLowerCase().includes(search) : false;
    const hospitalIdFieldMatch = (p.hospitalId || "").toLowerCase().includes(search);

    // 4. User matching (matching any user associated with this hospital, or whose name matches)
    const matchedUsers = users.filter(u => 
      (u.name || "").toLowerCase().includes(search) || 
      (u.username || "").toLowerCase().includes(search) || 
      (u.email || "").toLowerCase().includes(search) ||
      (u.role || "").toLowerCase().includes(search)
    );
    const userMatch = matchedUsers.some(u => u.hospitalId === p.hospitalId || u.id === p.userId || u.id === p.createdById);

    const searchOk = patientNameMatch || patientPhoneMatch || patientEmailMatch || patientIdMatch ||
                     refMatch || caseIdMatch || amountMatch ||
                     hospitalNameMatch || hospitalAddressMatch || hospitalIdFieldMatch ||
                     userMatch;

    // Hospital filter
    const hospitalOk = !selectedHospitalFilter || p.hospitalId === selectedHospitalFilter;

    return searchOk && hospitalOk;
  });

  const totalGrossUSD = filteredPayments
    .filter(p => p.currency === "USD" || !p.currency)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalGrossFC = filteredPayments
    .filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalHospitalRetainedBeforeUSD = filteredPayments
    .filter(p => p.currency === "USD" || !p.currency)
    .reduce((sum, p) => sum + p.analysis.hospitalRetainedBeforeSplit, 0);

  const totalHospitalRetainedBeforeFC = filteredPayments
    .filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC")
    .reduce((sum, p) => sum + p.analysis.hospitalRetainedBeforeSplit, 0);

  const totalAdminUSD = filteredPayments
    .filter(p => p.currency === "USD" || !p.currency)
    .reduce((sum, p) => sum + p.analysis.adminAmount, 0);

  const totalHospitalUSD = filteredPayments
    .filter(p => p.currency === "USD" || !p.currency)
    .reduce((sum, p) => sum + p.analysis.hospitalAmount, 0);

  const totalHospitalSplitShareOnlyUSD = filteredPayments
    .filter(p => p.currency === "USD" || !p.currency)
    .reduce((sum, p) => sum + p.analysis.hospitalSplitShareOnly, 0);

  const totalAdminFC = filteredPayments
    .filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC")
    .reduce((sum, p) => sum + p.analysis.adminAmount, 0);

  const totalHospitalFC = filteredPayments
    .filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC")
    .reduce((sum, p) => sum + p.analysis.hospitalAmount, 0);

  const totalHospitalSplitShareOnlyFC = filteredPayments
    .filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC")
    .reduce((sum, p) => sum + p.analysis.hospitalSplitShareOnly, 0);

  // Dynamic Graphic Evolution Calculation Helpers
  const getJsDate = (createdAt: any): Date | null => {
    if (!createdAt) return null;
    if (typeof createdAt.toDate === 'function') return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return null;
  };

  const getMonthAbbr = (monthNum: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthNum - 1] || "M";
  };

  const getTrendData = () => {
    if (activeMetric === "combined") {
      const allDatesSet = new Set<string>();
      
      const uCompiled = users.map(item => {
        const dObj = getJsDate(item.createdAt) || new Date();
        const dStr = dObj.toISOString().split('T')[0];
        allDatesSet.add(dStr);
        return { ...item, dObj, dStr };
      });

      const pCompiled = patients.map(item => {
        const dObj = getJsDate(item.createdAt) || new Date();
        const dStr = dObj.toISOString().split('T')[0];
        allDatesSet.add(dStr);
        return { ...item, dObj, dStr };
      });

      const hCompiled = hospitals.map(item => {
        const dObj = getJsDate(item.createdAt) || new Date();
        const dStr = dObj.toISOString().split('T')[0];
        allDatesSet.add(dStr);
        return { ...item, dObj, dStr };
      });

      const payCompiled = payments.map(item => {
        const dObj = getJsDate(item.createdAt) || new Date();
        const dStr = dObj.toISOString().split('T')[0];
        allDatesSet.add(dStr);
        return { ...item, dObj, dStr };
      });

      const sortedDates = Array.from(allDatesSet).sort();

      const combinedPoints = sortedDates.map(dateStr => {
        const uCount = uCompiled.filter(c => c.dStr <= dateStr).length;
        const pCount = pCompiled.filter(c => c.dStr <= dateStr).length;
        const hCount = hCompiled.filter(c => c.dStr <= dateStr).length;
        
        const paymentsUpToDate = payCompiled.filter(c => c.dStr <= dateStr);
        const paySumUSD = paymentsUpToDate.reduce((sum, pay) => {
          const amt = Number(pay.amount) || 0;
          const isFC = pay.currency === "FC" || pay.currency === "CDF" || pay.currency === "CFC";
          const usdVal = isFC ? (amt / 2200) : amt;
          return sum + usdVal;
        }, 0);

        const [year, month, day] = dateStr.split('-');
        const label = language === 'fr' 
          ? `${day}-${month}` 
          : `${getMonthAbbr(Number(month))} ${day}`;

        return {
          date: dateStr,
          label,
          users: uCount,
          patients: pCount,
          tenants: hCount,
          payments: Math.round(paySumUSD * 100) / 100
        };
      });

      if (combinedPoints.length === 0) {
        return [
          { date: 'base1', label: 'Day 1', users: 0, patients: 0, tenants: 0, payments: 0 },
          { date: 'base2', label: 'Day 2', users: 0, patients: 0, tenants: 0, payments: 0 },
        ];
      }

      return combinedPoints;
    }

    let rawItems: any[] = [];
    if (activeMetric === "users") {
      rawItems = [...users];
    } else if (activeMetric === "patients") {
      rawItems = [...patients];
    } else if (activeMetric === "combined" as any) { // fallback
      rawItems = [...users];
    } else {
      rawItems = [...payments];
    }

    const compiled = rawItems.map(item => {
      const dObj = getJsDate(item.createdAt) || new Date();
      const dStr = dObj.toISOString().split('T')[0]; // "YYYY-MM-DD"
      return {
        ...item,
        dObj,
        dStr
      };
    });

    // Sort chronologically
    compiled.sort((a, b) => a.dObj.getTime() - b.dObj.getTime());

    // Group dates
    const uniqueDates = Array.from(new Set(compiled.map(c => c.dStr))).sort();

    let cumulative = 0;
    const trendPoints = uniqueDates.map(dateStr => {
      const itemsOnDay = compiled.filter(c => c.dStr === dateStr);
      let dayVal = 0;
      if (activeMetric === "payments") {
        dayVal = itemsOnDay.reduce((sum, pay) => {
          const amt = Number(pay.amount) || 0;
          const isFC = pay.currency === "FC" || pay.currency === "CDF" || pay.currency === "CFC";
          const usdVal = isFC ? (amt / 2200) : amt;
          return sum + usdVal;
        }, 0);
      } else {
        dayVal = itemsOnDay.length;
      }
      cumulative += dayVal;

      const [year, month, day] = dateStr.split('-');
      const label = language === 'fr' 
        ? `${day}-${month}` 
        : `${getMonthAbbr(Number(month))} ${day}`;

      return {
        date: dateStr,
        label,
        value: Math.round(cumulative * 100) / 100,
        daily: Math.round(dayVal * 100) / 100,
      };
    });

    if (trendPoints.length === 1) {
      const singleDate = new Date(trendPoints[0].date);
      const data1 = { ...trendPoints[0] };

      const prevDate1 = new Date(singleDate);
      prevDate1.setDate(singleDate.getDate() - 1);
      const dStr1 = prevDate1.toISOString().split('T')[0];
      const [y1, m1, dd1] = dStr1.split('-');
      const label1 = language === 'fr' ? `${dd1}-${m1}` : `${getMonthAbbr(Number(m1))} ${dd1}`;

      const prevDate2 = new Date(singleDate);
      prevDate2.setDate(singleDate.getDate() - 2);
      const dStr2 = prevDate2.toISOString().split('T')[0];
      const [y2, m2, dd2] = dStr2.split('-');
      const label2 = language === 'fr' ? `${dd2}-${m2}` : `${getMonthAbbr(Number(m2))} ${dd2}`;

      return [
        { date: dStr2, label: label2, value: 0, daily: 0 },
        { date: dStr1, label: label1, value: 0, daily: 0 },
        data1
      ];
    } else if (trendPoints.length === 0) {
      return [
        { date: 'base1', label: 'Day 1', value: 0, daily: 0 },
        { date: 'base2', label: 'Day 2', value: 0, daily: 0 },
      ];
    }

    return trendPoints;
  };

  const trendData = getTrendData();

  // Grand stats totals across the whole database
  const grandTotalUsers = users.length;
  const grandTotalPatients = patients.length;
  const grandPaymentsUSD = payments.filter(p => p.currency === "USD" || !p.currency).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const grandPaymentsFC = payments.filter(p => p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC").reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const grandTotalPaymentsConvertedUSD = grandPaymentsUSD + (grandPaymentsFC / 2200);

  // Compile notifications for users and patients
  const systemNotifications = useMemo(() => {
    const list: any[] = [];
    
    users.forEach(u => {
      if (u.isLocalStaff) return; // Skip notification for local physical staff record accounts

      const date = u.createdAt?.toDate ? u.createdAt.toDate() : u.createdAt ? new Date(u.createdAt) : new Date();
      list.push({
        id: `user-${u.id}`,
        type: "USER",
        name: u.name || u.username || "Unnamed",
        role: u.role || "NURSE",
        date,
        status: u.status,
        email: u.email,
        rawObj: u
      });
    });

    patients.forEach(p => {
      const date = p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt ? new Date(p.createdAt) : new Date();
      list.push({
        id: `patient-${p.id}`,
        type: "PATIENT",
        name: p.name || p.fullName || "Unnamed Patient",
        date,
        hospitalId: p.hospitalId,
        rawObj: p
      });
    });

    // Sort descending (most recent first)
    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list.slice(0, 10); // top 10 activities
  }, [users, patients]);

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

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users Card */}
        <button 
          onClick={() => setActiveMetric("users")}
          className={`text-left p-6 border transition-all flex flex-col justify-between relative overflow-hidden group rounded-sm cursor-pointer ${
            activeMetric === "users" 
              ? "bg-indigo-50/30 border-indigo-500 shadow-md ring-1 ring-indigo-500/20" 
              : "bg-white border-app-line hover:border-slate-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              {language === 'fr' ? "Utilisateurs Enregistrés" : "Registered Users"}
            </span>
            <div className={`p-1 rounded-sm ${activeMetric === "users" ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400"}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-mono font-bold text-slate-800">{grandTotalUsers}</span>
            <p className="text-[9px] font-mono opacity-50 uppercase mt-1">
              {language === 'fr' ? "Cliquez pour voir la courbe d'évolution" : "Click to view evolution graphic"}
            </p>
          </div>
        </button>

        {/* Total Patients Card */}
        <button 
          onClick={() => setActiveMetric("patients")}
          className={`text-left p-6 border transition-all flex flex-col justify-between relative overflow-hidden group rounded-sm cursor-pointer ${
            activeMetric === "patients" 
              ? "bg-teal-50/30 border-teal-500 shadow-md ring-1 ring-teal-500/20" 
              : "bg-white border-app-line hover:border-slate-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-500" />
              {language === 'fr' ? "Patients dans le Système" : "Patients in System"}
            </span>
            <div className={`p-1 rounded-sm ${activeMetric === "patients" ? "bg-teal-100 text-teal-600" : "bg-slate-50 text-slate-400"}`}>
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-mono font-bold text-slate-800">{grandTotalPatients}</span>
            <p className="text-[9px] font-mono opacity-50 uppercase mt-1">
              {language === 'fr' ? "Cliquez pour voir la courbe d'évolution" : "Click to view evolution graphic"}
            </p>
          </div>
        </button>

        {/* Total Payments (Gross Amount) */}
        <button 
          onClick={() => setActiveMetric("payments")}
          className={`text-left p-6 border transition-all flex flex-col justify-between relative overflow-hidden group rounded-sm cursor-pointer ${
            activeMetric === "payments" 
              ? "bg-emerald-50/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/20" 
              : "bg-white border-app-line hover:border-slate-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
              {language === 'fr' ? "Somme Brute Récoltée (Hôpitaux)" : "Gross Amount Made (Hospitals)"}
            </span>
            <div className={`p-1 rounded-sm ${activeMetric === "payments" ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex flex-col">
              <span className="text-xl font-mono font-bold text-slate-800 leading-tight">
                ${grandPaymentsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                + {grandPaymentsFC.toLocaleString()} FC
              </span>
            </div>
            <p className="text-[9px] font-mono opacity-60 uppercase mt-2 text-emerald-600 font-bold">
              {language === 'fr' ? "Équivalent : " : "Equiv : "} ≈ ${grandTotalPaymentsConvertedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
            </p>
          </div>
        </button>
      </div>

      {/* Live System Alerts and Notifications Feed */}
      <div className="bg-slate-900 text-slate-100 border border-slate-800 p-4 font-mono text-xs shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="font-bold tracking-wider uppercase text-[10px] text-slate-300">
              {language === 'fr' ? "NOTIFICATIONS ET ALERTES EN DIRECT DU SYSTEME" : "LIVE SYSTEM NOTIFICATIONS & ALERTS MONITOR"}
            </h3>
          </div>
          <span className="text-[8px] bg-slate-800 px-2 py-0.5 text-slate-400">STATUS: READY</span>
        </div>

        {systemNotifications.length === 0 ? (
          <p className="text-slate-500 text-[10px] italic p-2">NO RECENT STAFF OR PATIENT DISCOVERY RECORDED</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent users notifications feed */}
            <div className="space-y-2">
              <span className="text-[9px] text-indigo-400 font-bold border-b border-slate-800 pb-1 block tracking-widest uppercase">
                {language === 'fr' ? "NOUVEAUX UTILISATEURS / PERSONNEL" : "RECENT STAFF & NEW ACCOUNT LOGS"} ({systemNotifications.filter(n => n.type === "USER").length})
              </span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {systemNotifications.filter(n => n.type === "USER").map((n) => (
                  <div key={n.id} className="p-2 bg-slate-950/40 border border-slate-850 hover:border-indigo-900/60 transition-all flex items-center justify-between gap-2 rounded hover:bg-slate-900/65 group">
                    <div className="truncate flex-1">
                      <span className="text-indigo-400 font-bold text-[9px] mr-1">[{n.role}]</span>
                      <span className="text-slate-200 uppercase font-bold text-[11px] group-hover:text-amber-400 transition-colors">{n.name}</span>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">{n.email}</p>
                    </div>
                    <div className="text-right flex items-center gap-2 shrink-0">
                      {n.status === "PENDING_APPROVAL" && (
                        <span className="text-[7.5px] bg-amber-950 text-amber-400 border border-amber-800 px-1 py-0.5 animate-pulse rounded font-bold shrink-0">
                          PENDING
                        </span>
                      )}
                      <button 
                        onClick={() => handleOpenEditUser(n.rawObj)}
                        className="text-[8.5px] font-bold bg-indigo-950/45 text-indigo-300 hover:bg-indigo-900 hover:text-white px-2 py-1 border border-indigo-900/60 transition-colors cursor-pointer rounded-sm"
                        title="Manage"
                      >
                        {language === 'fr' ? "GÉRER" : "MANAGE"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent patients notifications feed */}
            <div className="space-y-2">
              <span className="text-[9px] text-teal-400 font-bold border-b border-slate-800 pb-1 block tracking-widest uppercase">
                {language === 'fr' ? "PATIENTS ENREGISTRÉS RÉCEMMENT" : "RECENT PATIENT REGISTRATION LOGS"} ({systemNotifications.filter(n => n.type === "PATIENT").length})
              </span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {systemNotifications.filter(n => n.type === "PATIENT").map((n) => (
                  <div key={n.id} className="p-2 bg-slate-950/40 border border-slate-850 hover:border-teal-900/60 transition-all flex items-center justify-between gap-2 rounded hover:bg-slate-900/65 group">
                    <div className="truncate flex-1">
                      <span className="text-teal-400 font-bold text-[9px] mr-1">[PATIENT]</span>
                      <span className="text-slate-200 uppercase font-bold text-[11px] group-hover:text-white transition-colors">{n.name}</span>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">{getHospitalName(n.hospitalId) || "HealthOne Workspace"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[8.5px] text-slate-500 font-mono block">
                        {n.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Evolution Chart Section */}
      <div className="bg-white border border-app-line p-6 flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-line pb-4">
          <div>
            <h2 className="text-sm font-bold font-mono text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              {activeMetric === "combined"
                ? (language === 'fr' ? "ÉVOLUTION COMPARATIVE DES MESURES CLÉS DU SYSTÈME" : "SYSTEM KEY METRICS COMBINED EVOLUTION TREND")
                : activeMetric === "users" 
                ? (language === 'fr' ? "COURBE D'ÉVOLUTION DE L'ENREGISTREMENT DES UTILISATEURS" : "USER REGISTRATION EVOLUTION TREND")
                : activeMetric === "patients"
                ? (language === 'fr' ? "COURBE D'ÉVOLUTION DU DOSSIER DES PATIENTS" : "PATIENT RECORD EVOLUTION TREND")
                : (language === 'fr' ? "COURBE D'ÉVOLUTION DU CHIFFRE D'AFFAIRES BRUT DES HÔPITAUX" : "HOSPITALS GROSS REVENUE EVOLUTION TREND")}
            </h2>
            <p className="text-[9px] font-mono opacity-50 uppercase tracking-wider mt-1">
              {language === 'fr'
                ? "Analyse chronologique cumulative de la croissance de l'infrastructure"
                : "Chronological cumulative expansion trend of infrastructure metrics"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Selector Slider Tabs */}
            <div className="flex items-center gap-1 border border-app-line p-1 bg-slate-50">
              <button
                onClick={() => setActiveMetric("combined")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeMetric === "combined" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Vue Combinée" : "Combined"}
              </button>
              <button
                onClick={() => setActiveMetric("users")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeMetric === "users" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Utilisateurs" : "Users"}
              </button>
              <button
                onClick={() => setActiveMetric("patients")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeMetric === "patients" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Patients" : "Patients"}
              </button>
              <button
                onClick={() => setActiveMetric("payments")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeMetric === "payments" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Paiements" : "Payments"}
              </button>
            </div>

            {/* Graphic Type Selection */}
            <div className="flex items-center gap-1.5 border border-app-line p-1 bg-slate-50">
              <button
                onClick={() => setActiveChartType("line")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeChartType === "line" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Courbe" : "Line"}
              </button>
              <button
                onClick={() => setActiveChartType("bar")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeChartType === "bar" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Histogramme" : "Bar"}
              </button>
              <button
                onClick={() => setActiveChartType("area")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors font-bold cursor-pointer ${
                  activeChartType === "area" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {language === 'fr' ? "Aire Double" : "Area"}
              </button>
            </div>
          </div>
        </div>

        {/* Recharts canvas */}
        <div className="w-full select-none" style={{ minHeight: '320px' }}>
          {loadingPayments || loadingUsers ? (
            <div className="h-80 flex items-center justify-center text-xs font-mono opacity-50 uppercase animate-pulse">
              {language === 'fr' ? "CALCUL DE LA MATRICE DE CROISSANCE..." : "GENERATING EVOLUTION MATRIX..."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {activeChartType === "line" ? (
                <LineChart data={trendData as any} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        if (activeMetric === "combined") {
                          return (
                            <div className="bg-slate-900 text-white p-3 border border-slate-800 text-left font-mono text-[11px] space-y-1 shadow-lg min-w-[210px]">
                              <p className="font-bold border-b border-white/10 pb-1 uppercase tracking-wider">{label}</p>
                              {payload.map((item: any, idx: number) => {
                                const isPay = item.name.toLowerCase().includes("revenu") || item.name.toLowerCase().includes("revenue") || item.name.toLowerCase().includes("affaires");
                                return (
                                  <p key={idx} style={{ color: item.color }} className="font-bold flex justify-between gap-4">
                                    <span>{item.name}:</span>
                                    <span>{isPay ? `$${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : item.value}</span>
                                  </p>
                                );
                              })}
                            </div>
                          );
                        }
                        const isPay = activeMetric === "payments";
                        return (
                          <div className="bg-slate-900 text-white p-3 border border-slate-800 text-left font-mono text-[11px] space-y-1 shadow-lg">
                            <p className="font-bold border-b border-white/10 pb-1 uppercase tracking-wider">{label}</p>
                            <p className="text-emerald-400 font-bold">
                              {language === 'fr' ? "Total cumulé : " : "Cumulative Total: "}
                              {isPay ? `$${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : payload[0].value}
                            </p>
                            <p className="opacity-70 text-[10px]">
                              {language === 'fr' ? "Nouveau ce jour : " : "New on this day: "}
                              {isPay ? `$${(payload[0].payload as any).daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : (payload[0].payload as any).daily}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {activeMetric === "combined" ? (
                    <>
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Line type="monotone" name={language === 'fr' ? "Utilisateurs (Indigo)" : "Users (Indigo)"} dataKey="users" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" name={language === 'fr' ? "Patients (Teal)" : "Patients (Teal)"} dataKey="patients" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" name={language === 'fr' ? "Hôpitaux (Ardoise)" : "Tenants (Slate)"} dataKey="tenants" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" name={language === 'fr' ? "Revenus (Or)" : "Revenue (Gold)"} dataKey="payments" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                    </>
                  ) : (
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={activeMetric === "users" ? "#6366f1" : activeMetric === "patients" ? "#14b8a6" : "#10b981"} 
                      strokeWidth={2.5} 
                      dot={{ r: 4, stroke: "#ffffff", strokeWidth: 1.5 }} 
                      activeDot={{ r: 7 }} 
                    />
                  )}
                </LineChart>
              ) : activeChartType === "bar" ? (
                <BarChart data={trendData as any} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        if (activeMetric === "combined") {
                          return (
                            <div className="bg-slate-900 text-white p-3 border border-slate-800 text-left font-mono text-[11px] space-y-1 shadow-lg min-w-[210px]">
                              <p className="font-bold border-b border-white/10 pb-1 uppercase tracking-wider">{label}</p>
                              {payload.map((item: any, idx: number) => {
                                const isPay = item.name.toLowerCase().includes("revenu") || item.name.toLowerCase().includes("revenue") || item.name.toLowerCase().includes("affaires");
                                return (
                                  <p key={idx} style={{ color: item.color }} className="font-bold flex justify-between gap-4">
                                    <span>{item.name}:</span>
                                    <span>{isPay ? `$${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : item.value}</span>
                                  </p>
                                );
                              })}
                            </div>
                          );
                        }
                        const isPay = activeMetric === "payments";
                        return (
                          <div className="bg-slate-900 text-white p-3 border border-slate-800 text-left font-mono text-[11px] space-y-1 shadow-lg">
                            <p className="font-bold border-b border-white/10 pb-1 uppercase tracking-wider">{label}</p>
                            <p className="text-emerald-400 font-bold">
                              {language === 'fr' ? "Total cumulé : " : "Cumulative Total: "}
                              {isPay ? `$${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : payload[0].value}
                            </p>
                            <p className="opacity-70 text-[10px]">
                              {language === 'fr' ? "Nouveau ce jour : " : "New on this day: "}
                              {isPay ? `$${(payload[0].payload as any).daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : (payload[0].payload as any).daily}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {activeMetric === "combined" ? (
                    <>
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Bar name={language === 'fr' ? "Utilisateurs (Indigo)" : "Users (Indigo)"} dataKey="users" fill="#6366f1" />
                      <Bar name={language === 'fr' ? "Patients (Teal)" : "Patients (Teal)"} dataKey="patients" fill="#14b8a6" />
                      <Bar name={language === 'fr' ? "Tenants (Ardoise)" : "Tenants (Slate)"} dataKey="tenants" fill="#64748b" />
                      <Bar name={language === 'fr' ? "Affaires (Or)" : "Revenue (Gold)"} dataKey="payments" fill="#f59e0b" />
                    </>
                  ) : (
                    <Bar dataKey="value" fill={activeMetric === "users" ? "#6366f1" : activeMetric === "patients" ? "#14b8a6" : "#10b981"} radius={[2, 2, 0, 0]} maxBarSize={48} />
                  )}
                </BarChart>
              ) : (
                <AreaChart data={trendData as any} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="tenantGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        if (activeMetric === "combined") {
                          return (
                            <div className="bg-slate-900 text-white p-3 border border-slate-800 text-left font-mono text-[11px] space-y-1 shadow-lg min-w-[210px]">
                              <p className="font-bold border-b border-white/10 pb-1 uppercase tracking-wider">{label}</p>
                              {payload.map((item: any, idx: number) => {
                                const isPay = item.name.toLowerCase().includes("revenu") || item.name.toLowerCase().includes("revenue") || item.name.toLowerCase().includes("affaires");
                                return (
                                  <p key={idx} style={{ color: item.color }} className="font-bold flex justify-between gap-4">
                                    <span>{item.name}:</span>
                                    <span>{isPay ? `$${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : item.value}</span>
                                  </p>
                                );
                              })}
                            </div>
                          );
                        }
                        const isPay = activeMetric === "payments";
                        return (
                          <div className="bg-slate-900 text-white p-3 border border-slate-800 text-left font-mono text-[11px] space-y-1 shadow-lg">
                            <p className="font-bold border-b border-white/10 pb-1 uppercase tracking-wider">{label}</p>
                            <p className="text-emerald-400 font-bold">
                              {language === 'fr' ? "Total cumulé : " : "Cumulative Total: "}
                              {isPay ? `$${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : payload[0].value}
                            </p>
                            <p className="opacity-70 text-[10px]">
                              {language === 'fr' ? "Nouveau ce jour : " : "New on this day: "}
                              {isPay ? `$${(payload[0].payload as any).daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : (payload[0].payload as any).daily}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {activeMetric === "combined" ? (
                    <>
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Area type="monotone" name={language === 'fr' ? "Utilisateurs (Indigo)" : "Users (Indigo)"} dataKey="users" stroke="#6366f1" fill="url(#areaGradient)" strokeWidth={2.5} fillOpacity={1} />
                      <Area type="monotone" name={language === 'fr' ? "Patients (Teal)" : "Patients (Teal)"} dataKey="patients" stroke="#14b8a6" fill="url(#patientGradient)" strokeWidth={2.5} fillOpacity={1} />
                      <Area type="monotone" name={language === 'fr' ? "Tenants (Ardoise)" : "Tenants (Slate)"} dataKey="tenants" stroke="#64748b" fill="url(#tenantGradient)" strokeWidth={2.5} fillOpacity={1} />
                      <Area type="monotone" name={language === 'fr' ? "Affaires (Or)" : "Revenue (Gold)"} dataKey="payments" stroke="#f59e0b" fill="url(#paymentGradient)" strokeWidth={2.5} fillOpacity={1} />
                    </>
                  ) : (
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={activeMetric === "users" ? "#6366f1" : activeMetric === "patients" ? "#14b8a6" : "#10b981"} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#areaGradient)" 
                    />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
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
                  <div 
                    key={h.id} 
                    onClick={() => handleOpenEditHospital(h)}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer"
                    title={language === 'fr' ? "Cliquez pour modifier les détails du tenant" : "Click to edit tenant details"}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold uppercase tracking-tight truncate text-sm text-slate-800 group-hover:text-amber-700 transition-colors">{h.name}</h3>
                      <p className="text-[10px] font-mono opacity-60 truncate">{h.address}</p>
                      {h.email && <p className="text-[10px] font-mono opacity-50 truncate">Email: {h.email}</p>}
                      {h.phone && <p className="text-[10px] font-mono opacity-50 truncate">Phone: {h.phone}</p>}
                      <p className="text-[10px] font-mono opacity-40 mt-1">Tenant ID: {h.id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenEditHospital(h)}
                        className="text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-amber-50 text-amber-700 hover:bg-amber-100 px-1.5 py-0.5 border border-amber-200 rounded-sm"
                      >
                        {language === 'fr' ? "MODIFIER" : "EDIT"}
                      </button>
                      
                      {(userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHospital(h.id, h.name);
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded transition-all"
                          title={language === 'fr' ? "Supprimer le tenant" : "Delete tenant"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <UserCheck className="w-4 h-4 opacity-10 group-hover:opacity-100 transition-opacity shrink-0 text-green-600" />
                    </div>
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
                  <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors group">
                    <div 
                      onClick={() => handleOpenEditUser(u)}
                      className="min-w-0 space-y-1 cursor-pointer flex-1"
                      title={language === 'fr' ? "Cliquez d'abord pour éditer" : "Click to edit details"}
                    >
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{u.name || "Unnamed user"}</span>
                        {u.isLocalStaff ? (
                          <span className="text-[8px] font-mono bg-slate-100 text-slate-650 border border-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            {language === 'fr' ? "Pers. Simple" : "Local Rec"}
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            HealthOne
                          </span>
                        )}
                        <span className="text-[9px] font-mono border border-app-line px-1.5 py-0.5 bg-slate-100 text-slate-600 uppercase tracking-widest">{userRole}</span>
                        {u.status === "PENDING_APPROVAL" ? (
                          <span className="text-[8px] font-mono bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            PENDING VALIDATION
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <HospitalIcon className="w-3 h-3" /> {getHospitalName(u.hospitalId)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="h-9 border border-app-line hover:bg-slate-100 text-slate-700 px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-all"
                        title={language === 'fr' ? "Modifier les informations" : "Edit info"}
                      >
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        {language === 'fr' ? "Détails" : "Details"}
                      </button>

                      <select 
                        value={userRolesInput[u.id] || userRole}
                        onChange={(e) => setUserRolesInput({ ...userRolesInput, [u.id]: e.target.value })}
                        className="bg-white border border-app-line px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-app-ink h-9 w-32"
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

                      {u.status === "PENDING_APPROVAL" && (
                        <button
                          onClick={() => handleValidateUser(u.id)}
                          disabled={isUpdating}
                          className={`h-9 bg-emerald-600 hover:bg-emerald-700 text-white px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest font-bold transition-all ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                          title="Validate and activate this account"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          APPROVE
                        </button>
                      )}

                      {(userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN") && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name || u.username || u.email || "User")}
                          disabled={isUpdating}
                          className={`h-9 border border-rose-200 hover:bg-rose-50 text-rose-600 px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={language === 'fr' ? "Supprimer définitivement le compte d'utilisateur" : "Permanently delete user account"}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          {language === 'fr' ? "SUPPRIMER" : "DELETE"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Financial Split Section */}
      <div className="bg-white border border-app-line flex flex-col p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-line pb-4">
          <div>
            <h2 className="text-lg font-serif italic font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <Coins className="w-5 h-5 text-amber-500" />
              {language === 'fr' ? "Répartition des Revenus de Partenariat" : "Partnership Revenue Division"}
            </h2>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">
              {language === 'fr' 
                ? "Calculateur de commission : 60% Admin / 40% Hôpital (0-2 mois d'inscription du patient), puis 50% / 50% à partir du 3ème mois." 
                : "Commission split rate calc: 60% Admin / 40% Hospital (0-2 months of patient registration), then 50% / 50% from 3rd month."}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Hospital filter */}
            <select
              value={selectedHospitalFilter}
              onChange={(e) => setSelectedHospitalFilter(e.target.value)}
              className="bg-white border border-app-line px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-app-ink h-9 w-44"
            >
              <option value="">{language === 'fr' ? "Tous les Établissements" : "All Hospitals"}</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'fr' ? "Rechercher tout (patient, hôpital, utilisateur, paiement...)" : "Search everything (patient, hospital, user, payment...)"}
                value={paymentSearchTerm}
                onChange={(e) => setPaymentSearchTerm(e.target.value)}
                className="bg-white border border-app-line pl-8 pr-3 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-app-ink h-9 w-72"
              />
            </div>
          </div>
        </div>

        {/* Totals Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Admin USD */}
          <div className="border border-app-line p-4 bg-amber-50/20 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 flex items-center gap-1">
              <Percent className="w-3 h-3 text-amber-600" />
              {language === 'fr' ? "Ma Part Totale (USD)" : "My Total Share (USD)"}
            </span>
            <span className="font-mono font-bold text-lg sm:text-xl text-amber-700 mt-2 block">
              ${totalAdminUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
            <p className="text-[9px] font-mono opacity-40 mt-1 uppercase">
              {language === 'fr' ? "PARTAGE DU $1 DE BASE (60% / 50%)" : "SPLIT OF BASE $1 (60% / 50%)"}
            </p>
          </div>

          {/* Hospital USD Before Partition ($1 removed) */}
          <div className="border border-app-line p-4 bg-slate-50 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 flex items-center gap-1">
              <Scale className="w-3 h-3 text-slate-600" />
              {language === 'fr' ? "D'office Hôpitaux (Avant Part. - USD)" : "Hospitals Before Split (USD)"}
            </span>
            <span className="font-mono font-bold text-lg sm:text-xl text-slate-700 mt-2 block">
              ${totalGrossUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
            <p className="text-[9px] font-mono opacity-40 mt-1 uppercase">
              {language === 'fr' ? "MONTANT BRUT GLOBAL DE L'HÔPITAL" : "TOTAL GROSS AMOUNT OF THE HOSPITAL"}
            </p>
          </div>

          {/* Hospital USD Total */}
          <div className="border border-app-line p-4 bg-blue-50/25 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 flex items-center gap-1">
              <HospitalIcon className="w-3 h-3 text-blue-600" />
              {language === 'fr' ? "Part Hôpital Totale (USD)" : "Hospital Total Share (USD)"}
            </span>
            <div>
              <span className="font-mono font-bold text-lg sm:text-xl text-blue-700 mt-2 block">
                ${totalHospitalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
              <div className="mt-1 pb-1 border-t border-blue-100/50 pt-1 text-[9px] font-mono text-blue-850 space-y-0.5">
                <div>
                  <span className="opacity-70">{language === 'fr' ? "• Part de Partition (40%/50%) : " : "• Split Share (40%/50%): "}</span>
                  <span className="font-bold">${totalHospitalSplitShareOnlyUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="opacity-70">{language === 'fr' ? "• D'office (100% Retenu) : " : "• Automatic (100% Above Base): "}</span>
                  <span className="font-bold">${totalHospitalRetainedBeforeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] font-mono opacity-40 mt-1 uppercase">
              {language === 'fr' ? "TOTAL REÇU (PART + HORS REPARTITION)" : "TOTAL RECEIVED (SPLIT PART + REMAINDER)"}
            </p>
          </div>

          {/* Admin FC */}
          <div className="border border-app-line p-4 bg-emerald-50/25 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 flex items-center gap-1">
              <Percent className="w-3 h-3 text-emerald-600" />
              {language === 'fr' ? "Ma Part Totale (FC)" : "My Total Share (FC)"}
            </span>
            <span className="font-mono font-bold text-lg sm:text-xl text-emerald-700 mt-2 block">
              {totalAdminFC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC
            </span>
            <p className="text-[9px] font-mono opacity-40 mt-1 uppercase">
              {language === 'fr' ? "PARTAGE DU 2200 FC DE BASE (60% / 50%)" : "SPLIT OF 2200 FC BASE (60% / 50%)"}
            </p>
          </div>

          {/* Hospital FC Before Partition (2200 FC removed) */}
          <div className="border border-app-line p-4 bg-slate-50 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 flex items-center gap-1">
              <Scale className="w-3 h-3 text-slate-600" />
              {language === 'fr' ? "D'office Hôpitaux (Avant Part. - FC)" : "Hospitals Before Split (FC)"}
            </span>
            <span className="font-mono font-bold text-lg sm:text-xl text-slate-700 mt-2 block">
              {totalGrossFC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC
            </span>
            <p className="text-[9px] font-mono opacity-40 mt-1 uppercase">
              {language === 'fr' ? "MONTANT BRUT GLOBAL DE L'HÔPITAL" : "TOTAL GROSS AMOUNT OF THE HOSPITAL"}
            </p>
          </div>

          {/* Hospital FC Total */}
          <div className="border border-app-line p-4 bg-teal-50/25 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 flex items-center gap-1">
              <HospitalIcon className="w-3 h-3 text-teal-600" />
              {language === 'fr' ? "Part Hôpital Totale (FC)" : "Hospital Total Share (FC)"}
            </span>
            <div>
              <span className="font-mono font-bold text-lg sm:text-xl text-teal-700 mt-2 block">
                {totalHospitalFC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC
              </span>
              <div className="mt-1 pb-1 border-t border-teal-100/50 pt-1 text-[9px] font-mono text-teal-850 space-y-0.5">
                <div>
                  <span className="opacity-70">{language === 'fr' ? "• Part de Partition (40%/50%) : " : "• Split Share (40%/50%): "}</span>
                  <span className="font-bold">{totalHospitalSplitShareOnlyFC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC</span>
                </div>
                <div>
                  <span className="opacity-70">{language === 'fr' ? "• D'office (100% Retenu) : " : "• Automatic (100% Above Base): "}</span>
                  <span className="font-bold">{totalHospitalRetainedBeforeFC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] font-mono opacity-40 mt-1 uppercase">
              {language === 'fr' ? "TOTAL REÇU (PART + HORS REPARTITION)" : "TOTAL RECEIVED (SPLIT PART + REMAINDER)"}
            </p>
          </div>
        </div>

        {/* Individual Payment Breakdown Table */}
        <div className="border border-app-line overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-app-line">
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Patient" : "Patient"}</th>
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Paiement Réf / Date" : "Payment Ref. / Date"}</th>
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Mois d'ancienneté" : "Tenure Month"}</th>
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Formule / Part" : "Formula / Split"}</th>
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60">{language === 'fr' ? "Montant Brut" : "Gross Amount"}</th>
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60 text-right">{language === 'fr' ? "Ma Part" : "My Share"}</th>
                <th className="p-3 text-[10px] uppercase font-mono tracking-wider opacity-60 text-right">{language === 'fr' ? "Part Hôpital" : "Hospital Share"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-line text-xs font-mono">
              {loadingPayments ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold uppercase animate-pulse">
                    {language === 'fr' ? "CHARGEMENT DE L'ANALYSE FINANCIÈRE..." : "LOADING FINANCIAL ANALYTICS..."}
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 uppercase">
                    {language === 'fr' ? "AUCUN ENREGISTREMENT DE PAIEMENT" : "NO PAYMENT RECORDS FOUND"}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => {
                  const isFC = p.currency === "FC" || p.currency === "CDF" || p.currency === "CFC";
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-800 uppercase">{p.patientName || "—"}</div>
                        <div className="text-[10px] opacity-50">
                          {language === 'fr' ? "Enregistré: " : "Registered: "} 
                          {formattedPaymentDate(p.analysis.patientRegDate)}
                        </div>
                      </td>
                      <td className="p-3 text-[10px]">
                        <div className="text-slate-700 font-bold uppercase truncate max-w-[120px]" title={p.reference || p.id}>
                          {p.reference || `ID: ${p.id.slice(-6).toUpperCase()}`}
                        </div>
                        <div className="text-[9px] opacity-50">{formattedPaymentDate(p.createdAt)}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.analysis.isFirstTwoMonths 
                            ? "bg-amber-50 text-amber-700 border border-amber-200" 
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {p.analysis.isFirstTwoMonths 
                            ? (language === 'fr' ? "Premier 2m" : "First 2m") 
                            : (language === 'fr' ? `Mois ${p.analysis.diffMonths + 1}` : `Month ${p.analysis.diffMonths + 1}`)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-700">
                          {p.analysis.splitPercentageAdmin}% / {p.analysis.splitPercentageHospital}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">
                          {isFC 
                            ? `${(Number(p.amount) || 0).toLocaleString()} FC` 
                            : `$${(Number(p.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {isFC 
                          ? `${Math.round(p.analysis.adminAmount).toLocaleString()} FC` 
                          : `$${p.analysis.adminAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-700">
                        {isFC 
                          ? `${Math.round(p.analysis.hospitalAmount).toLocaleString()} FC` 
                          : `$${p.analysis.hospitalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

      {/* Edit User Modal */}
      {selectedEditUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest text-center text-amber-700">EDIT_USER_METADATA</h2>
            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Full_Name</label>
                <input 
                  type="text" 
                  required 
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="Jean Dupont..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Username</label>
                <input 
                  type="text" 
                  required 
                  value={editUserForm.username}
                  onChange={(e) => setEditUserForm({...editUserForm, username: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="jdupont"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest font-bold">Email (Read-Only / Primary Key)</label>
                <input 
                  type="email" 
                  required 
                  disabled
                  value={editUserForm.email}
                  className="w-full bg-slate-100 border border-app-line p-2.5 font-mono text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Assigned_Role</label>
                <select 
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
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
                  value={editUserForm.hospitalId}
                  onChange={(e) => setEditUserForm({...editUserForm, hospitalId: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                >
                  <option value="">System-Wide / Root (SupAdmin)</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">User_Status</label>
                <select 
                  value={editUserForm.status}
                  onChange={(e) => setEditUserForm({...editUserForm, status: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING_APPROVAL">PENDING VALIDATION</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                {(userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN") && (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteUser(selectedEditUser.id, selectedEditUser.name || selectedEditUser.username || selectedEditUser.email || "User")}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] uppercase tracking-widest transition-colors sm:mr-auto flex items-center justify-center gap-1.5 rounded-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {language === 'fr' ? "SUPPRIMER" : "DELETE"}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setSelectedEditUser(null)} 
                  className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  ABORT
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-2.5 bg-slate-900 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  SAVE_CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hospital / Tenant Modal */}
      {selectedEditHospital && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest text-center text-amber-700">EDIT_TENANT_METADATA</h2>
            <form onSubmit={handleSaveHospitalEdit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Entity_Name</label>
                <input 
                  type="text" 
                  required 
                  value={editHospitalForm.name}
                  onChange={(e) => setEditHospitalForm({...editHospitalForm, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="St. Mary Memorial..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Physical_Address</label>
                <input 
                  type="text" 
                  required 
                  value={editHospitalForm.address}
                  onChange={(e) => setEditHospitalForm({...editHospitalForm, address: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="Street No. 12..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest font-bold">Admin_Email (Primary Contact)</label>
                <input 
                  type="email" 
                  required
                  value={editHospitalForm.email}
                  onChange={(e) => setEditHospitalForm({...editHospitalForm, email: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="admin@tenant.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">Phone_Number</label>
                <input 
                  type="text" 
                  value={editHospitalForm.phone}
                  onChange={(e) => setEditHospitalForm({...editHospitalForm, phone: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                  placeholder="+243..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                {(userRole === "SUP_ADMIN" || userRole === "SYSTEM_ADMIN") && (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteHospital(selectedEditHospital.id, selectedEditHospital.name)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] uppercase tracking-widest transition-colors sm:mr-auto flex items-center justify-center gap-1.5 rounded-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {language === 'fr' ? "SUPPRIMER" : "DELETE"}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setSelectedEditHospital(null)} 
                  className="px-6 py-2.5 border border-app-line font-mono text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  ABORT
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-2.5 bg-slate-900 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  SAVE_CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-app-bg border border-rose-500 w-full max-w-sm my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-mono uppercase tracking-widest text-rose-600 mb-4 font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5 animate-pulse" />
              {language === 'fr' ? "CONFIRMER LA SUPPRESSION" : "CONFIRM_DELETION"}
            </h2>
            <div className="space-y-4">
              <p className="text-xs font-mono opacity-80 leading-relaxed text-slate-700">
                {deleteConfirm.type === 'user' ? (
                  language === 'fr' 
                    ? `Êtes-vous sûr de vouloir supprimer définitivement le compte de "${deleteConfirm.name}" ? Cette action est irréversible.`
                    : `Are you sure you want to permanently delete the user account of "${deleteConfirm.name}"? This action is completely irreversible.`
                ) : (
                  language === 'fr'
                    ? `ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement l'établissement "${deleteConfirm.name}" ? Tous les documents associés dans les collections de l'infrastructure seront supprimés.`
                    : `WARNING: Are you sure you want to permanently delete the tenant "${deleteConfirm.name}"? All matching configurations inside infrastructure collections will be deleted.`
                )}
              </p>
              <div className="bg-rose-50 border border-rose-100 p-3 text-rose-800 text-[10px] font-mono rounded">
                ⚡ {language === 'fr' 
                  ? "Cette action ne peut pas être annulée." 
                  : "WARNING: This action cannot be undone."}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-app-line">
              <button 
                type="button" 
                onClick={() => setDeleteConfirm(null)} 
                disabled={isDeletingLoading}
                className="px-4 py-2 border border-app-line font-mono text-[9px] uppercase tracking-widest hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {language === 'fr' ? "ANNULER" : "ABORT"}
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDelete}
                disabled={isDeletingLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[9px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-sm disabled:opacity-50"
              >
                {isDeletingLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {language === 'fr' ? "SUPPRESSION..." : "DELETING..."}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    {language === 'fr' ? "CONFIRMER" : "EXEC_DELETE"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
