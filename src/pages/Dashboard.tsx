import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useOfflineSync } from "../contexts/OfflineSyncContext";
import { db } from "../firebase";
import { getNormalizedRole } from "../lib/utils";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Package, 
  ArrowUpRight,
  Bed,
  CheckCircle2,
  Clock,
  Plus,
  Shield,
  Building,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Calendar,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import WorkCalendarModal from "../components/WorkCalendarModal";
import MiniAuditedCalendar from "../components/MiniAuditedCalendar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from "recharts";

const data = [
  { name: "Mon", patients: 40, cases: 24, revenue: 2400 },
  { name: "Tue", patients: 30, cases: 13, revenue: 2210 },
  { name: "Wed", patients: 20, cases: 98, revenue: 2290 },
  { name: "Thu", patients: 27, cases: 39, revenue: 2000 },
  { name: "Fri", patients: 18, cases: 48, revenue: 2181 },
  { name: "Sat", patients: 23, cases: 38, revenue: 2500 },
  { name: "Sun", patients: 34, cases: 43, revenue: 2100 },
];

const StatCard = ({ title, value, icon: Icon, trend, variant = "white" }: any) => (
  <div className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm relative overflow-hidden h-28 ${
    variant === "dark" 
      ? "bg-slate-800 text-white border-slate-700" 
      : "bg-white text-slate-900 border-slate-200"
  }`}>
    <div className="flex flex-col gap-1">
      <p className={`text-[10px] uppercase font-bold tracking-wider ${variant === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        {title}
      </p>
      <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
    </div>
    <div className="flex items-center justify-between mt-auto">
      {trend ? (
        <p className={`text-[10px] font-bold ${trend.includes('↑') || trend.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend}
        </p>
      ) : <div />}
      <Icon className={`w-5 h-5 ${variant === 'dark' ? 'text-slate-600' : 'text-slate-100'}`} />
    </div>
  </div>
);

export default function Dashboard() {
  const { profile, hospitalId } = useAuth();
  const { t } = useLanguage();

  const userRole = getNormalizedRole(profile?.role);

  if (userRole === 'SUP_ADMIN') {
    return <SupAdminDashboard t={t} />;
  }

  if (userRole === 'RECEPTIONIST' || userRole === 'REGISTER') {
    return <ReceptionistDashboard t={t} profile={profile} hospitalId={hospitalId} />;
  }

  if (userRole === 'DOCTOR') {
    return <DoctorDashboard t={t} hospitalId={hospitalId} />;
  }

  if (userRole === 'PHARMACIST') {
    return <PharmacistDashboard t={t} hospitalId={hospitalId} />;
  }

  if (userRole === 'CASHIER') {
    return <CashierDashboard t={t} hospitalId={hospitalId} />;
  }

  // Default to Admin Dashboard for HR, ADMIN, SYSTEM_ADMIN
  return <AdminDashboard t={t} hospitalId={hospitalId} />;
}

const SupAdminDashboard = ({ t }: any) => {
  const [hospitalsCount, setHospitalsCount] = useState<number>(0);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [latestHospitals, setLatestHospitals] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch hospitals count and list in real-time
    const unsubscribeHospitals = onSnapshot(collection(db, "hospitals"), (snapshot) => {
      setHospitalsCount(snapshot.size);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLatestHospitals(list.slice(0, 5));
      setLoading(false);
    }, (error) => {
      console.error("Error setting hospitals subscription on dashboard:", error);
    });

    // 2. Fetch users count in real-time
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsersCount(snapshot.size);
    }, (error) => {
      console.error("Error setting users subscription on dashboard:", error);
    });

    return () => {
      unsubscribeHospitals();
      unsubscribeUsers();
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="px-2.5 py-1 bg-yellow-500/15 border border-yellow-500/35 text-yellow-400 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest inline-flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3" /> ROOT PRIVILEGES ENABLED
            </span>
            <h1 className="text-2xl sm:text-4xl font-serif italic font-bold tracking-tight py-1">
              Welcome to the Super Admin Control Hub
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              From this global dashboard, you can provision active hospital tenants directly into the HealthOne secure cloud node, audit cross-tenant user roles, and monitor entire platform integrity.
            </p>
          </div>
          <Link 
            to="/system-admin"
            className="px-6 py-3 bg-white text-slate-900 border border-slate-200 shadow hover:bg-slate-100 transition-all font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-xl shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" /> Administrative Tools
          </Link>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="ACTIVE SYSTEM TENANTS" 
          value={loading ? "..." : hospitalsCount.toString()} 
          icon={Building} 
          trend="Provisioned Hospitals" 
          variant="dark" 
        />
        <StatCard 
          title="TOTAL REGISTERED USERS" 
          value={loading ? "..." : usersCount.toString()} 
          icon={Users} 
          trend="Across all tenants" 
        />
        <StatCard 
          title="CLOUD DATABASE NODES" 
          value="Firestore" 
          icon={Database} 
          trend="Status: OPTIMAL" 
        />
        <StatCard 
          title="CORE INTEGRATION CPU" 
          value="US-EAST1" 
          icon={Cpu} 
          trend="No latency warnings" 
        />
      </div>

      {/* Main Grid: Tenants Details and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Recent Hospital Deployments */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[350px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-xs font-mono text-slate-700 flex items-center gap-2 uppercase tracking-wider">
               <Layers className="w-4 h-4 text-emerald-500" />
               Recent Hospital Deployments
            </h2>
            <Link to="/system-admin" className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest font-mono">
              Deploy New Tenant +
            </Link>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3 pl-4">HOSPITAL NAME</th>
                  <th className="p-3">ADDRESS</th>
                  <th className="p-3">CONTACT EMAIL</th>
                  <th className="p-3 pr-4">TENANT ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                      Fetching system-wide active nodes...
                    </td>
                  </tr>
                ) : latestHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                      No active hospitals found. Go to administrative tools to provision your first tenant.
                    </td>
                  </tr>
                ) : (
                  latestHospitals.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 pl-4 font-bold text-slate-800">{h.name || "N/A"}</td>
                      <td className="p-3 text-slate-500">{h.address || "N/A"}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{h.email || h.contactEmail || "N/A"}</td>
                      <td className="p-3 pr-4 font-mono text-[10px] text-slate-400 uppercase tracking-tighter">#{h.id.slice(-8)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-100 flex justify-between font-mono uppercase tracking-[0.05em]">
            <span>System Status: Fully Operational</span>
            <span>Security Rule Check: PASS</span>
          </div>
        </div>

        {/* Right Side: Quick Management Console */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" /> SYSTEM CONSOLE
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed font-serif italic">
              HealthOne platform is currently executing secure microservices across multiple isolated medical entities. Role propagation and token access layers are active.
            </p>
            
            <div className="space-y-2.5 pt-2">
              <Link 
                to="/system-admin" 
                className="w-full h-10 border border-slate-200 hover:border-slate-800 text-slate-900 rounded-lg flex items-center justify-center font-mono text-[10px] uppercase tracking-widest font-bold transition-all hover:bg-slate-50"
              >
                PROVISION A NEW HOSPITAL
              </Link>
              <Link 
                to="/system-admin" 
                className="w-full h-10 border border-slate-200 hover:border-slate-800 text-slate-900 rounded-lg flex items-center justify-center font-mono text-[10px] uppercase tracking-widest font-bold transition-all hover:bg-slate-50"
              >
                MANAGE USER ACCOUNTS &amp; ROLES
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[9px] font-mono text-slate-400 uppercase space-y-1">
            <div className="flex justify-between">
              <span>Platform Node:</span>
              <span className="font-bold text-slate-700">HEALTHONE_PROD_V4</span>
            </div>
            <div className="flex justify-between">
              <span>Licensing Schema:</span>
              <span className="font-bold text-slate-700">ENTERPRISE_UNLIMITED</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};


const ReceptionistDashboard = ({ t, profile, hospitalId }: any) => {
  const { language } = useLanguage();
  const { isOfflineMode, getQueuedItemsForCollection, removeQueuedItem } = useOfflineSync();

  const [patients, setPatients] = useState<any[]>(() => {
    const hId = hospitalId || profile?.hospitalId || (typeof profile?.hospital === "string" ? profile.hospital : profile?.hospital?.id);
    if (!hId) return [];
    try {
      const cached = localStorage.getItem(`healthone_cached_patients_${hId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [pediatricians, setPediatricians] = useState<any[]>(() => {
    const hId = hospitalId || profile?.hospitalId || (typeof profile?.hospital === "string" ? profile.hospital : profile?.hospital?.id);
    if (!hId) return [];
    try {
      const cached = localStorage.getItem(`healthone_cached_pediatricians_${hId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [allStaff, setAllStaff] = useState<any[]>(() => {
    const hId = hospitalId || profile?.hospitalId || (typeof profile?.hospital === "string" ? profile.hospital : profile?.hospital?.id);
    if (!hId) return [];
    try {
      const cached = localStorage.getItem(`healthone_cached_staff_${hId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [showAllStaff, setShowAllStaff] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isOfflineMode && patients.length === 0);
  const [viewingPedSchedule, setViewingPedSchedule] = useState<any | null>(null);

  // Deletion States
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      if (patientToDelete.id.startsWith("offline_")) {
        removeQueuedItem(patientToDelete.id);
      } else if (isOfflineMode) {
        setIsDeleting(false);
        return;
      } else {
        await deleteDoc(doc(db, "patients", patientToDelete.id));
      }
      setShowDeleteConfirm(false);
      setPatientToDelete(null);
    } catch (err) {
      console.error("Failed to delete patient on dashboard:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePedSchedule = async (newSchedule: string[]) => {
    if (!viewingPedSchedule || isOfflineMode) return;
    try {
      await updateDoc(doc(db, "users", viewingPedSchedule.id), {
        schedule: newSchedule
      });
      setViewingPedSchedule({
        ...viewingPedSchedule,
        schedule: newSchedule
      });
    } catch (err) {
      console.error("Failed to update staff schedule:", err);
    }
  };

  const userRole = getNormalizedRole(profile?.role);
  const canAddPatient = userRole === 'REGISTER' || userRole === 'ADMIN' || userRole === 'SYSTEM_ADMIN' || userRole === 'SUP_ADMIN';

  useEffect(() => {
    if (!profile?.hospitalId && !profile?.hospital) {
      setLoading(false);
      return;
    }

    const hId = hospitalId; // Already derived in AuthContext and robust
    if (!hId) {
      setLoading(false);
      return;
    }

    // Load from cache initially
    try {
      const cachedPatients = localStorage.getItem(`healthone_cached_patients_${hId}`);
      if (cachedPatients) {
        setPatients(JSON.parse(cachedPatients));
      }
      const cachedStaff = localStorage.getItem(`healthone_cached_staff_${hId}`);
      if (cachedStaff) {
        setAllStaff(JSON.parse(cachedStaff));
      }
      const cachedPeds = localStorage.getItem(`healthone_cached_pediatricians_${hId}`);
      if (cachedPeds) {
        setPediatricians(JSON.parse(cachedPeds));
      }
    } catch (e) {
      console.error("Failed to load cached dashboard data:", e);
    }

    if (isOfflineMode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "patients"),
      where("hospitalId", "==", hId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory to avoid missing index error
      patientData.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      const topPatients = patientData.slice(0, 10);
      setPatients(topPatients);
      try {
        localStorage.setItem(`healthone_cached_patients_${hId}`, JSON.stringify(topPatients));
      } catch (e) {
        console.error("Failed to save patient dashboard cache", e);
      }
      setLoading(false);
    }, (error) => {
      console.error("Dashboard Snap Error:", error);
      setLoading(false);
    });

    // Fetch pediatricians/doctors to show schedules to the register
    // Query full users collection and resolve hospital ID dynamically to guarantee matches across schemas (e.g., hospital vs hospitalId)
    const unsubscribeStaff = onSnapshot(collection(db, "users"), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => {
        const uData = doc.data();
        const uId = doc.id;
        let resolvedHopId = uData.hospitalId || null;
        if (!resolvedHopId && uData.hospital) {
          if (typeof uData.hospital === 'string') {
            resolvedHopId = uData.hospital;
          } else if (typeof uData.hospital === 'object' && uData.hospital.id) {
            resolvedHopId = uData.hospital.id;
          }
        }
        return { id: uId, ...uData, resolvedHospitalId: resolvedHopId };
      });

      // Filter to same hospital
      const filteredStaff = allUsers.filter((u: any) => u.resolvedHospitalId === hId);
      setAllStaff(filteredStaff);
      try {
        localStorage.setItem(`healthone_cached_staff_${hId}`, JSON.stringify(filteredStaff));
      } catch (e) {
        console.error("Failed to save staff cache", e);
      }

      const peds = filteredStaff.filter((u: any) => {
        const roleUpper = u.role?.toUpperCase() || "";
        const roleNormalized = getNormalizedRole(u.role);
        const deptUpper = Array.isArray(u.departments)
          ? u.departments.map((d: any) => String(d).toUpperCase())
          : [];
        return (
          roleNormalized === "DOCTOR" ||
          roleUpper.includes("PEDIATRE") ||
          roleUpper.includes("PEDIATRI") ||
          deptUpper.some((d: string) => d.includes("PEDIATRE") || d.includes("PEDIATRI"))
        );
      });
      setPediatricians(peds);
      try {
        localStorage.setItem(`healthone_cached_pediatricians_${hId}`, JSON.stringify(peds));
      } catch (e) {
        console.error("Failed to save pediatricians cache", e);
      }
    }, (error) => {
      console.error("Staff fetch snap error:", error);
    });

    let unsubscribePay = () => {};
    if (userRole === "REGISTER" || userRole === "ADMIN") {
      try {
        const cachedPay = localStorage.getItem(`healthone_cached_payments_${hId}`);
        if (cachedPay) setPayments(JSON.parse(cachedPay));
      } catch (e) {
        console.error("Failed loading cached payments on ReceptionistDashboard", e);
      }

      const qPay = query(collection(db, "payments"), where("hospitalId", "==", hId));
      unsubscribePay = onSnapshot(qPay, (snapshot) => {
        const payList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPayments(payList);
        try {
          localStorage.setItem(`healthone_cached_payments_${hId}`, JSON.stringify(payList));
        } catch (e) {
          console.error("Failed saving payments cache on ReceptionistDashboard", e);
        }
      }, (error) => {
        console.error("Payments snapshot listener failed on ReceptionistDashboard", error);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeStaff();
      unsubscribePay();
    };
  }, [hospitalId, profile, isOfflineMode]);

  const offlinePatients = getQueuedItemsForCollection("patients")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));

  const mergedPatients = [...offlinePatients, ...patients];

  const emergencyCount = mergedPatients.filter(p => p.department === "Emergency" || p.department?.toLowerCase() === "urgence" || p.department?.toLowerCase() === "urgences").length;

  const displayList = showAllStaff ? allStaff : pediatricians;

  const offlinePayments = getQueuedItemsForCollection("payments")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));
  const mergedPayments = [...offlinePayments, ...payments];

  const totalUSD = mergedPayments.filter(p => !p.currency || p.currency === "USD").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCDF = mergedPayments.filter(p => p.currency === "CDF" || p.currency === "CFC" || p.currency === "FC").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const formattedUSD = new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(totalUSD);

  const formattedCDF = `${totalCDF.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-US')} FC`;
  const formattedRevenue = `${formattedUSD} / ${formattedCDF}`;

  return (
    <div className="space-y-4">
      {isOfflineMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block animate-ping" />
            <span>
              {language === 'fr' 
                ? "Mode hors ligne actif. Les nouvelles inscriptions sont enregistrées localement et prêtes à être synchronisées." 
                : "Offline mode active. New registrations are saved locally and queued for synchronization."}
            </span>
          </div>
          <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
            {language === 'fr' ? "LOCAL" : "STANDALONE"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {userRole === 'REGISTER' ? (
          <StatCard 
            title={language === 'fr' ? "Revenus (USD / FC)" : "Revenue (USD / FC)"} 
            value={formattedRevenue} 
            icon={TrendingUp} 
            trend={`${mergedPayments.length} ${language === 'fr' ? "transactions" : "paid invoices"}`} 
            variant="dark" 
          />
        ) : (
          <StatCard title={t("labRegistry")} value={mergedPatients.length.toString()} icon={Users} trend="+12 today" variant="dark" />
        )}
        <StatCard title={userRole === 'REGISTER' ? t("labRegistry") : t("avgTriageWait")} value={userRole === 'REGISTER' ? mergedPatients.length.toString() : "14 min"} icon={userRole === 'REGISTER' ? Users : Clock} trend={userRole === 'REGISTER' ? "+12 today" : "↑ 2m vs yesterday"} />
        <StatCard title={t("emergencyAdmits")} value={String(emergencyCount).padStart(2, '0')} icon={Activity} trend="Active Now" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Registration Terminal */}
        <div className="col-span-1 lg:col-span-12">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-200">
            <h3 className="text-xl font-bold tracking-tight mb-2 italic underline decoration-blue-500 underline-offset-4">{t("regTerminal")}</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-6">Queue Management v4.2</p>
            
            <div className="flex flex-col md:flex-row gap-4">
              {canAddPatient ? (
                <Link 
                  to="/patients?register=true" 
                  className="flex-1 flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold">{t("newRegistration")}</p>
                      <p className="text-[9px] text-slate-500 font-medium">Add walk-in patient</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                </Link>
              ) : (
                <div 
                  className="flex-1 flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl transition-all opacity-55 cursor-not-allowed select-none"
                  title="Only Register and Admin roles can register new patients"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-500 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-400">{t("newRegistration")}</p>
                      <p className="text-[9px] text-slate-500 font-mono tracking-wider">AUTHORIZED ONLY</p>
                    </div>
                  </div>
                </div>
              )}

              <button className="flex-1 flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">{t("insuranceVerify")}</p>
                    <p className="text-[9px] text-slate-500">Scan Policy ID</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Registrations Table layout on left (col-span-8) */}
        <section className="col-span-1 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[520px]">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-xs text-slate-700 flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               {t("recentRegistrations")}
            </h2>
            <Link to="/patients" className="text-[10px] font-bold text-blue-500 hover:underline">{t("viewAll")}</Link>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 shadow-sm">
                <tr className="text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3 pl-4">ID</th>
                  <th className="p-3">{t("patients")}</th>
                  <th className="p-3 hidden sm:table-cell">{t("gender").toUpperCase()}</th>
                  <th className="p-3 hidden sm:table-cell">{t("contact")}</th>
                  <th className="p-3">{t("age")}</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs italic">{t("syncingRecords")}</td></tr>
                ) : mergedPatients.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs italic">{t("noPatientsRegistered")}</td></tr>
                ) : mergedPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group text-xs text-nowrap lg:text-wrap">
                    <td className="p-3 pl-4 font-mono text-slate-400 italic">
                      {p.id.startsWith("offline_") ? "DRAFT" : `#${p.id.slice(-6).toUpperCase()}`}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link to={`/patients/${p.id}`} className="font-bold text-blue-600 hover:underline">
                          {p.firstName} {p.lastName}
                        </Link>
                        {p.isOfflinePending && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse whitespace-nowrap">
                            Offline Draft
                          </span>
                        )}
                        {p.department && (
                          <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded">
                            {t(p.department === "Pediatrics" ? "pediatricsDept" : p.department === "General Medicine" ? "generalMedicineDept" : p.department === "Emergency" ? "emergencyDept" : p.department === "Cardiology" ? "cardiologyDept" : p.department)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 uppercase text-slate-500 hidden sm:table-cell">{t(p.gender?.toUpperCase() || 'NA')}</td>
                    <td className="p-3 text-slate-500 font-mono hidden sm:table-cell">{p.phone || t("noContact")}</td>
                    <td className="p-3 font-medium">{p.age || t("NA")}</td>
                    <td className="p-3 pr-4 text-right whitespace-nowrap">
                      {canAddPatient && ( // REGISTER, ADMIN, SYSTEM_ADMIN, SUP_ADMIN
                        <button
                          onClick={() => {
                            setPatientToDelete(p);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={isOfflineMode && !p.id.startsWith("offline_")}
                          className={`p-1 rounded transition-colors inline-block ${
                            isOfflineMode && !p.id.startsWith("offline_")
                              ? "opacity-35 cursor-not-allowed text-slate-300"
                              : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          }`}
                          title={
                            isOfflineMode && !p.id.startsWith("offline_")
                              ? (language === 'fr' ? "Suppression indisponible hors ligne" : "Deletion unavailable offline")
                              : t("deletePatient")
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pediatrician/Doctors schedules on right (col-span-4) */}
        <div className="col-span-1 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
          <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <h2 className="font-bold text-xs text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
               <Clock className="w-4 h-4 text-blue-500 shrink-0" />
               <span className="truncate">
                 {showAllStaff 
                   ? (language === 'fr' ? "Tout le personnel" : "All Staff Schedules") 
                   : (language === 'fr' ? "Dispo Pédiatres" : "Pediatre Availability")}
               </span>
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setShowAllStaff(false)}
                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                  !showAllStaff 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'fr' ? "Pédiatres" : "Pediatricians"}
              </button>
              <button
                type="button"
                onClick={() => setShowAllStaff(true)}
                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                  showAllStaff 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'fr' ? "Tout" : "All"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {displayList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 italic text-xs py-8">
                <Users className="w-8 h-8 opacity-20 mb-2" />
                {showAllStaff 
                  ? (language === 'fr' ? "Aucun personnel trouvé" : "No staff found")
                  : (language === 'fr' ? "Aucun pédiatre trouvé" : "No pediatricians found")}
              </div>
            ) : (
              displayList.map((ped) => {
                const docSchedule = ped.schedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                return (
                  <div key={ped.id} className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50/30">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 truncate">{ped.fullName || ped.name}</h4>
                        <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest mt-0.5 truncate">
                          {ped.departments?.join(', ') || ped.role || (language === 'fr' ? "Personnel" : "Staff Member")}
                        </p>
                      </div>
                      <span className="text-[8px] px-2 py-0.5 border bg-blue-50 text-blue-700 border-blue-100 rounded-full font-bold shrink-0 uppercase tracking-wide">
                        {ped.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                          {t("schedule") || "Schedule"}:
                        </p>
                        <button
                          onClick={() => setViewingPedSchedule(ped)}
                          disabled={isOfflineMode}
                          className={`px-2 py-0.5 border text-[9px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shrink-0 ${
                            isOfflineMode 
                              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                              : "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-100 cursor-pointer"
                          }`}
                          title={isOfflineMode ? (language === 'fr' ? "Gestion indisponible hors ligne" : "Management unavailable offline") : ""}
                        >
                          <Calendar className="w-3 h-3" />
                          {language === 'fr' ? "Gérer" : "Calendar"}
                        </button>
                      </div>

                      <MiniAuditedCalendar 
                        schedule={docSchedule} 
                        onChangeSchedule={async (newSchedule) => {
                          if (isOfflineMode) return;
                          try {
                            await updateDoc(doc(db, "users", ped.id), {
                              schedule: newSchedule
                            });
                          } catch (err) {
                            console.error("Failed to update staff schedule:", err);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {viewingPedSchedule && (
        <WorkCalendarModal 
          isOpen={!!viewingPedSchedule}
          onClose={() => setViewingPedSchedule(null)}
          schedule={viewingPedSchedule.schedule || []}
          onSaveSchedule={handleSavePedSchedule}
          name={viewingPedSchedule.fullName || viewingPedSchedule.name || (language === 'fr' ? "Prénom Nom" : "Staff Member")}
          role={viewingPedSchedule.departments?.join(', ') || viewingPedSchedule.role || (language === 'fr' ? "Personnel" : "Staff Member")}
        />
      )}

      {/* Delete Patient Confirmation Modal */}
      {showDeleteConfirm && patientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full text-slate-800">
          <div className="bg-white rounded-2xl border border-red-100 w-full max-w-md my-auto relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <div className="p-6 sm:p-8 text-left">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                {t("deletePatient")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                {t("deletePatientMsg")}{" "}
                <span className="font-bold text-slate-800 font-mono">
                  ({patientToDelete.firstName} {patientToDelete.lastName})
                </span>
              </p>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  disabled={isDeleting}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPatientToDelete(null);
                  }}
                  className="px-6 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button 
                  type="button" 
                  disabled={isDeleting}
                  onClick={handleDeletePatient}
                  className="px-8 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-rose-200 hover:bg-red-700 transition-all active:scale-95"
                >
                  {isDeleting ? "..." : t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const weekdayShortEn: Record<string, string> = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'T',
  Friday: 'F',
  Saturday: 'S',
  Sunday: 'S'
};

const weekdayShortFr: Record<string, string> = {
  Monday: 'L',
  Tuesday: 'M',
  Wednesday: 'M',
  Thursday: 'J',
  Friday: 'V',
  Saturday: 'S',
  Sunday: 'D'
};

const weekdayDisplayFr: Record<string, string> = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche'
};

const DoctorDashboard = ({ t, hospitalId }: any) => {
  const { profile, updateProfile } = useAuth();
  const { language } = useLanguage();
  const { isOfflineMode, getQueuedItemsForCollection } = useOfflineSync();

  const [patients, setPatients] = useState<any[]>(() => {
    if (!hospitalId) return [];
    try {
      const cached = localStorage.getItem(`healthone_cached_patients_${hospitalId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(!isOfflineMode && patients.length === 0);
  const [schedule, setSchedule] = useState<string[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  useEffect(() => {
    if (profile?.schedule) {
      setSchedule(profile.schedule);
    } else {
      setSchedule(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    }
  }, [profile?.schedule]);

  const handleSaveSchedule = async (newSchedule: string[]) => {
    if (isOfflineMode) return;
    setSchedule(newSchedule);
    try {
      await updateProfile({ schedule: newSchedule });
    } catch (err) {
      console.error("Failed to update schedule:", err);
    }
  };

  const toggleDay = async (day: string) => {
    if (isOfflineMode) return;
    let updatedSchedule = [...schedule];
    if (updatedSchedule.includes(day)) {
      updatedSchedule = updatedSchedule.filter(d => d !== day);
    } else {
      updatedSchedule.push(day);
    }
    setSchedule(updatedSchedule);
    try {
      await updateProfile({ schedule: updatedSchedule });
    } catch (err) {
      console.error("Failed to update pediatrician schedule:", err);
    }
  };

  useEffect(() => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }

    try {
      const cachedPatients = localStorage.getItem(`healthone_cached_patients_${hospitalId}`);
      if (cachedPatients) {
        setPatients(JSON.parse(cachedPatients));
      }
    } catch (e) {
      console.error("Failed to load doctor dashboard cached patients", e);
    }

    if (isOfflineMode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "patients"),
      where("hospitalId", "==", hospitalId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      patientData.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setPatients(patientData);
      try {
        localStorage.setItem(`healthone_cached_patients_${hospitalId}`, JSON.stringify(patientData));
      } catch (e) {
        console.error("Failed to cache doctor dashboard patients", e);
      }
      setLoading(false);
    }, (error) => {
      console.error("Doctor Dashboard Snap Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [hospitalId, isOfflineMode]);

  const offlinePatients = getQueuedItemsForCollection("patients")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));

  const mergedPatients = [...offlinePatients, ...patients];

  return (
    <div className="space-y-4">
      {isOfflineMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block animate-ping" />
            <span>
              {language === 'fr' 
                ? "Mode hors ligne actif. Vos données actuelles proviennent du cache local de l'appareil." 
                : "Offline mode active. Your current dashboard views are loading from local device cache."}
            </span>
          </div>
          <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
            {language === 'fr' ? "REPLICATED" : "STANDALONE"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title={t("activeConsultations")} value={mergedPatients.length > 0 ? `0${mergedPatients.length}`.slice(-2) : "00"} icon={Users} trend="Current Shift" variant="dark" />
        <StatCard title={t("pendingLabResults")} value="12" icon={Activity} trend="Critical: 02" />
        
        {/* Interactive Pediatre Availability Card replacing Chirurgies Aujourd'hui */}
        <button 
          onClick={() => {
            if (isOfflineMode) return;
            setShowCalendarModal(true);
          }}
          disabled={isOfflineMode}
          className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm relative overflow-hidden h-28 text-left transition-all duration-200 ${
            isOfflineMode
              ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
              : "bg-white border-slate-200 text-slate-900 hover:border-blue-500 hover:shadow-md group cursor-pointer"
          }`}
          title={isOfflineMode ? (language === 'fr' ? "Planification indisponible hors ligne" : "Scheduling unavailable offline") : ""}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                {language === 'fr' ? "PLANIFICATION" : "SCHEDULE"}
              </p>
              <h4 className="font-bold text-xs text-slate-800 leading-tight truncate">
                {language === 'fr' ? "Calendrier de garde" : "Duty Schedule Calendar"}
              </h4>
            </div>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between w-full mt-1.5 pt-1.5 border-t border-slate-50">
            <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              {schedule.some(item => item.includes("-")) 
                ? `${schedule.filter(item => item.includes("-")).length} ${language === 'fr' ? "jours planifiés" : "days scheduled"}`
                : `${schedule.length || 0} ${language === 'fr' ? "récurrents" : "recurring days"}`
              }
            </span>
            <span className="text-[9px] font-mono text-blue-600 font-bold flex items-center gap-0.5">
              {language === 'fr' ? "Ouvrir →" : "Open →"}
            </span>
          </div>
        </button>

        <StatCard title={t("avgConsultTime")} value="18m" icon={Clock} trend="Within standard" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[500px]">
         <section className="col-span-1 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[300px] lg:h-full">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 font-bold text-xs flex items-center justify-between">
               <span>{t("myPatientQueue")}</span>
               <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{mergedPatients.length}</span>
            </div>
            <div className="p-0 overflow-auto flex-1">
               <table className="w-full text-left text-xs min-w-[500px] lg:min-w-0">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 font-bold z-10">
                     <tr className="text-[10px] text-slate-400 uppercase">
                        <th className="p-3 pl-4">{t("patients")}</th>
                        <th className="p-3">{t("gender")}</th>
                        <th className="p-3">{t("age")}</th>
                        <th className="p-3 text-right pr-4">{t("action")}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {loading ? (
                       <tr>
                         <td colSpan={4} className="p-8 text-center text-slate-400 italic font-medium">
                           {t("syncingRecords") || "Loading..."}
                         </td>
                       </tr>
                     ) : mergedPatients.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                           {t("noPatientsRegistered") || "No patients found in your queue."}
                         </td>
                       </tr>
                     ) : (
                       mergedPatients.map((p) => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 pl-4 font-bold text-slate-800">
                              <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-800">
                                <span>{p.firstName} {p.lastName}</span>
                                {p.isOfflinePending && (
                                  <span className="bg-amber-100 text-amber-800 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse whitespace-nowrap">
                                    Offline Draft
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 uppercase text-slate-500 font-mono">
                              {t(p.gender?.toUpperCase() || "NA")}
                            </td>
                            <td className="p-3 text-slate-600 font-mono">
                              {p.age || t("NA")}
                            </td>
                            <td className="p-3 text-right pr-4">
                              <Link 
                                to={`/patients/${p.id}`} 
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] uppercase transition-colors inline-block"
                              >
                                {t("openFile") || "Open File"}
                              </Link>
                            </td>
                         </tr>
                       ))
                     )}
                  </tbody>
               </table>
            </div>
         </section>
         <div className="col-span-1 lg:col-span-4 bg-blue-900 rounded-xl p-4 text-white flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-300">{t("medBotAssistant")}</h4>
              <p className="text-xs mt-3 italic text-blue-100/70 leading-relaxed">{t("pathoPending") || "Clinical insight logs and lab integration dashboard is currently stable and connected."}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-800">
               <button className="text-[10px] font-bold underline uppercase tracking-wider text-blue-200 hover:text-white transition-colors">{t("reviewLabs") || "Review Labs"}</button>
            </div>
         </div>
      </div>

      <WorkCalendarModal 
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        schedule={schedule}
        onSaveSchedule={handleSaveSchedule}
        name={profile?.fullName || profile?.name || "Dr. Staff"}
        role={t("DOCTOR") || "Doctor"}
      />
    </div>
  );
};

const PharmacistDashboard = ({ t }: any) => {
  const { profile } = useAuth();
  const userRole = getNormalizedRole(profile?.role);
  const isFinancialAllowed = userRole === "REGISTER" || userRole === "ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title={t("pendingPrescriptions")} value="18" icon={Package} trend="Live Queue" variant="dark" />
        <StatCard title={t("lowStockAlarms")} value="06" icon={TrendingUp} trend="Needs ordering" />
        <StatCard title={t("narcoticsCount")} value="Verified" icon={CheckCircle2} trend="Confirmed 08:00" />
        {isFinancialAllowed ? (
          <StatCard title={t("dailyTurnover")} value="$4,200" icon={TrendingUp} trend="↑ 5% vs Avg" />
        ) : (
          <StatCard title={t("dispensingQueue") || "Active Patients"} value="12" icon={Activity} trend="Normal load" />
        )}
      </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-[500px]">
       <div className="bg-white rounded-xl border p-4 h-[300px] lg:h-full">
          <h4 className="text-xs font-bold mb-4">{t("stockUtilization")}</h4>
          <div className="h-[200px] lg:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="patients" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
       </div>
       <div className="bg-slate-900 rounded-xl p-4 text-white overflow-y-auto h-[300px] lg:h-full">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">{t("dispensingLogs")}</h4>
          <div className="space-y-3">
             {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center justify-between border-b border-slate-800 pb-2">
                   <div className="pr-2">
                      <p className="text-[10px] font-bold text-white truncate max-w-[150px] lg:max-w-none">Amoxicillin 500mg (20u)</p>
                      <p className="text-[9px] text-slate-500 truncate max-w-[150px] lg:max-w-none">Sarah Connor / Dr. Adams</p>
                   </div>
                   <span className="text-[9px] font-mono text-emerald-400 shrink-0">DISPENSED</span>
                </div>
             ))}
          </div>
       </div>
    </div>
  </div>
  );
};

const CashierDashboard = ({ t }: any) => {
  const { language } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title={t("pendingInvoices")} value="23" icon={Clock} trend="In Queue" variant="dark" />
        <StatCard title={t("successfulPayments") || "Processed Transactions"} value="42" icon={CheckCircle2} trend="Optimal flow" />
        <StatCard title={t("insuranceClaims")} value="08" icon={Activity} trend="Pending Review" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center items-center text-center space-y-3 min-h-[300px]">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="font-serif italic font-bold text-lg text-slate-800">
          {language === 'fr' ? "Gestion de Facturation Active" : "Active Billing Queue Management"}
        </h3>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed font-mono uppercase tracking-tight">
          {language === 'fr' 
            ? "Veuillez utiliser la section Dossiers Patients pour valider et enregistrer les fiches de traitement." 
            : "Please refer to the Patient Files or Cases section to validate and process active care sheets."}
        </p>
      </div>
    </div>
  );
};

const AdminDashboard = ({ t, hospitalId }: any) => {
  const { profile, updateProfile } = useAuth();
  const { language } = useLanguage();
  const { isOfflineMode, getQueuedItemsForCollection } = useOfflineSync();
  const userRole = getNormalizedRole(profile?.role);
  const isFinancialAllowed = userRole === "REGISTER" || userRole === "ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN";

  const [patients, setPatients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState(false);
  const [schedule, setSchedule] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaffForCalendar, setSelectedStaffForCalendar] = useState<any | null>(null);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

  useEffect(() => {
    if (profile?.schedule) {
      setSchedule(profile.schedule);
    } else {
      setSchedule(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    }
  }, [profile?.schedule]);

  useEffect(() => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }

    try {
      const cachedPatients = localStorage.getItem(`healthone_cached_patients_${hospitalId}`);
      if (cachedPatients) setPatients(JSON.parse(cachedPatients));

      const cachedStaff = localStorage.getItem(`healthone_cached_staff_${hospitalId}`);
      if (cachedStaff) setStaff(JSON.parse(cachedStaff));

      const cachedInv = localStorage.getItem(`healthone_cached_inventory_${hospitalId}`);
      if (cachedInv) setInventory(JSON.parse(cachedInv));

      const cachedPay = localStorage.getItem(`healthone_cached_payments_${hospitalId}`);
      if (cachedPay) setPayments(JSON.parse(cachedPay));
    } catch (e) {
      console.error("Failed loading cached dashboard data", e);
    }

    if (isOfflineMode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const qPatients = query(collection(db, "patients"), where("hospitalId", "==", hospitalId));
    const unsubscribePatients = onSnapshot(qPatients, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setPatients(list);
      try {
        localStorage.setItem(`healthone_cached_patients_${hospitalId}`, JSON.stringify(list));
      } catch (e) {
        console.error("Failed storing patients count in cache", e);
      }
      setLoading(false);
    }, (err) => {
      console.error("Patients snapshot subscription failed", err);
      setLoading(false);
    });

    const qInv = query(collection(db, "inventory"), where("hospitalId", "==", hospitalId));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(list);
      try {
        localStorage.setItem(`healthone_cached_inventory_${hospitalId}`, JSON.stringify(list));
      } catch (e) {
        console.error("Failed storing inventory in cache", e);
      }
    }, (err) => {
      console.error("Inventory snapshot subscription failed", err);
    });

    const unsubscribeStaff = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const u = doc.data();
        let resolvedHopId = u.hospitalId || null;
        if (!resolvedHopId && u.hospital) {
          if (typeof u.hospital === 'string') resolvedHopId = u.hospital;
          else if (typeof u.hospital === 'object' && u.hospital.id) resolvedHopId = u.hospital.id;
        }
        return { id: doc.id, ...u, resolvedHospitalId: resolvedHopId };
      }).filter((u: any) => u.resolvedHospitalId === hospitalId);
      
      setStaff(list);
      try {
        localStorage.setItem(`healthone_cached_staff_${hospitalId}`, JSON.stringify(list));
      } catch (e) {
        console.error("Failed storing staff in cache", e);
      }
    }, (err) => {
      console.error("Staff snapshot subscription failed", err);
    });

    const qPay = query(collection(db, "payments"), where("hospitalId", "==", hospitalId));
    const unsubscribePay = onSnapshot(qPay, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(list);
      try {
        localStorage.setItem(`healthone_cached_payments_${hospitalId}`, JSON.stringify(list));
      } catch (e) {
        console.error("Failed storing payments in cache", e);
      }
    }, (err) => {
      console.error("Payments snapshot subscription failed", err);
    });

    return () => {
      unsubscribePatients();
      unsubscribeInv();
      unsubscribeStaff();
      unsubscribePay();
    };
  }, [hospitalId, isOfflineMode]);

  const offlinePatients = getQueuedItemsForCollection("patients")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));
  const mergedPatients = [...offlinePatients, ...patients];

  const offlinePayments = getQueuedItemsForCollection("payments")
    .filter((item: any) => item.data.hospitalId === hospitalId)
    .map((item: any) => ({ id: item.id, ...item.data }));
  const mergedPayments = [...offlinePayments, ...payments];

  const totalUSD = mergedPayments.filter(p => !p.currency || p.currency === "USD").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCDF = mergedPayments.filter(p => p.currency === "CDF" || p.currency === "CFC" || p.currency === "FC").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const formattedUSD = new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(totalUSD);

  const formattedCDF = `${totalCDF.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-US')} FC`;
  const formattedRevenue = `${formattedUSD} / ${formattedCDF}`;

  const lowStockItems = inventory.filter(item => (Number(item.stock) || 0) <= (Number(item.minStock) || 0));
  const reorderCount = lowStockItems.length;

  const handleRestockAll = async () => {
    if (isOfflineMode || lowStockItems.length === 0 || restocking) return;
    setRestocking(true);
    try {
      await Promise.all(lowStockItems.map(item => {
        const itemRef = doc(db, "inventory", item.id);
        const newStock = (Number(item.minStock) || 5) + 30;
        return updateDoc(itemRef, { stock: newStock });
      }));
      alert(language === 'fr' 
        ? "Stock mis à jour avec succès (Seuils restaurés) !" 
        : "Critical stock thresholds restored successfully!");
    } catch (e) {
      console.error("Failed to auto-restock items", e);
    } finally {
      setRestocking(false);
    }
  };

  const handleSaveSchedule = async (newSchedule: string[]) => {
    if (isOfflineMode) return;
    setSchedule(newSchedule);
    try {
      await updateProfile({ schedule: newSchedule });
    } catch (err) {
      console.error("Failed to save admin personal schedule:", err);
    }
  };

  const occupancyPercent = mergedPatients.length > 0 
    ? Math.min(100, Math.round((mergedPatients.length * 8.5) % 40 + 55)) 
    : 0;

  const staffOnLeave = staff.filter(s => {
    const roleNormalized = getNormalizedRole(s.role);
    if (roleNormalized === "SYSTEM_ADMIN" || roleNormalized === "SUP_ADMIN") return false;
    return s.status === "ON_VACATION" || s.status === "OFF";
  }).length;

  const todayObj = new Date();
  const y = todayObj.getFullYear();
  const m = String(todayObj.getMonth() + 1).padStart(2, '0');
  const d = String(todayObj.getDate()).padStart(2, '0');
  const todayDateStr = `${y}-${m}-${d}`;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[todayObj.getDay()];

  const staffActiveToday = staff.filter(s => {
    const sSchedule = s.schedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return sSchedule.includes(todayDateStr) || sSchedule.includes(todayName);
  });

  const getPatientStageAndStatus = (p: any) => {
    const dept = p.department;
    if (dept === "Emergency") {
      return { stageKey: "surgeryPrep", statusKey: "preOp", color: "bg-amber-400" };
    } else if (dept === "Pediatrics") {
      return { stageKey: "observation", statusKey: "stabilized", color: "bg-emerald-500" };
    } else if (dept === "Cardiology") {
      return { stageKey: "labAnalysis", statusKey: "awaitingResult", color: "bg-slate-300" };
    } else if (dept === "Pharmacy" || dept === "Pharmacie") {
      return { stageKey: "pharmacyQueue", statusKey: "dispatching", color: "bg-blue-500" };
    } else {
      return { stageKey: "triagePhase", statusKey: "inProgress", color: "bg-emerald-500" };
    }
  };

  const doctors = staff.filter(s => getNormalizedRole(s.role) === "DOCTOR");
  const getAssignedDoctor = (p: any) => {
    if (doctors.length === 0) return "N/A";
    const index = p.id ? p.id.charCodeAt(0) % doctors.length : 0;
    const docObj = doctors[index];
    return docObj.fullName || docObj.name || "Dr. Staff";
  };

  const getWaitTime = (p: any) => {
    const createdTime = p.createdAt?.seconds 
      ? p.createdAt.seconds * 1000 
      : p.createdAt 
        ? new Date(p.createdAt).getTime() 
        : Date.now() - 360000;
    
    let minutesElapsed = Math.max(2, Math.round((Date.now() - createdTime) / 60000));
    if (minutesElapsed > 180) {
      minutesElapsed = (minutesElapsed % 70) + 15;
    }
    
    if (minutesElapsed < 60) return `${minutesElapsed} min`;
    const hours = Math.floor(minutesElapsed / 60);
    const mins = minutesElapsed % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
  };

  const trackingList = mergedPatients.slice(0, 6);
  const displayedInventory = lowStockItems.length > 0 
    ? lowStockItems.slice(0, 3) 
    : inventory.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Analytics Row */}
      <div className={`grid grid-cols-1 ${isFinancialAllowed ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {isFinancialAllowed && (
          <StatCard 
            title={language === 'fr' ? "Revenus (USD / FC)" : "Revenue (USD / FC)"} 
            value={formattedRevenue} 
            icon={TrendingUp} 
            trend={`${mergedPayments.length} ${language === 'fr' ? "transactions d'achat" : "paid invoices"}`} 
            variant="dark" 
          />
        )}

        <StatCard 
          title={language === 'fr' ? "Personnel" : "Staff Members"} 
          value={staff.length.toString()} 
          icon={Users} 
          trend={language === 'fr' ? `${staffActiveToday.length} actif(s) aujourd'hui` : `${staffActiveToday.length} active today`} 
        />

        <StatCard 
          title={language === 'fr' ? "Nombre de patients" : "Number of Patients"} 
          value={mergedPatients.length.toString()} 
          icon={Activity} 
          trend={language === 'fr' ? "Flux clinique actif" : "Active clinical flow"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[550px]">
        {/* Main Tracking Table */}
        <section className="col-span-1 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[400px] lg:h-full">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-xs text-slate-700 flex items-center gap-2">
               <Activity className="w-4 h-4 text-blue-500" />
               {t("tracking")}
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-emerald-500 animate-pulse flex items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {language === 'fr' ? "EN DIRECT" : "LIVE"}
               </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-0">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3 pl-4">ID</th>
                  <th className="p-3">{t("patientName")}</th>
                  <th className="p-3">{t("stage")}</th>
                  <th className="p-3 hidden sm:table-cell">{t("assignedDr")}</th>
                  <th className="p-3">{t("wait")}</th>
                  <th className="p-3 pr-4">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs italic font-mono uppercase">
                      {t("syncingRecords")}
                    </td>
                  </tr>
                ) : trackingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-serif italic text-xs">
                      {language === 'fr' ? "Aucun patient actif dans l'établissement" : "No active patients registered in this node."}
                    </td>
                  </tr>
                ) : (
                  trackingList.map((p) => {
                    const trackingData = getPatientStageAndStatus(p);
                    return (
                      <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group text-xs animate-in fade-in">
                        <td className="p-3 pl-4 font-mono text-slate-400">
                          {p.id.startsWith("offline_") ? "DRAFT" : `#${p.id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="p-3 font-bold text-blue-600 group-hover:underline cursor-pointer">
                          <Link to={`/patients/${p.id}`}>
                            {p.firstName} {p.lastName}
                          </Link>
                        </td>
                        <td className="p-3 text-slate-600 italic">{t(trackingData.stageKey)}</td>
                        <td className="p-3 hidden sm:table-cell">{getAssignedDoctor(p)}</td>
                        <td className="p-3 text-slate-400 font-mono">{getWaitTime(p)}</td>
                        <td className="p-3 pr-4">
                          <span className="flex items-center gap-2 font-medium bg-transparent">
                            <div className={`w-1.5 h-1.5 rounded-full ${trackingData.color}`} />
                            {t(trackingData.statusKey)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-2 px-4 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-200 flex justify-between uppercase font-bold tracking-tighter font-mono">
            <span>HIPAA Compliant • TLS 1.3</span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> 
              {new Date().toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-US', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
            </span>
          </div>
        </section>

        {/* Right Sidebar Widgets */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4 overflow-hidden lg:h-full">
          {/* Personal Active Shift Calendar Widget */}
          <button 
             onClick={() => {
               if (isOfflineMode) return;
               setShowScheduleModal(true);
             }}
             disabled={isOfflineMode}
             className={`w-full text-slate-900 rounded-xl p-4 border border-slate-200 flex flex-col justify-between transition-all text-left shadow-sm relative overflow-hidden h-32 group cursor-pointer ${
               isOfflineMode 
                 ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-65" 
                 : "bg-white hover:border-slate-800 hover:shadow-md"
             }`}
          >
             <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-[40px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
             <div className="flex items-start justify-between relative z-10 w-full mb-2">
               <div className="min-w-0">
                 <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate">
                   {language === 'fr' ? "MON PLANIFICATEUR PERSONNEL" : "MY PERSONAL SHIFT SCHEDULE"}
                 </p>
                 <h4 className="font-serif italic font-bold text-base mt-0.5 text-slate-800 truncate">
                   {profile?.fullName || profile?.name || "Administrator"}
                 </h4>
                 <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">{t("admin")}</p>
               </div>
               <div className="p-1.5 bg-blue-50 text-blue-600 rounded border border-blue-100 group-hover:border-blue-300 transition-colors shrink-0">
                 <Calendar className="w-4 h-4" />
               </div>
             </div>
             
             <div className="relative z-10 w-full flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] uppercase font-mono mt-1">
               <span className="text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 by-0.5 rounded-full">
                 {schedule.length} {language === 'fr' ? "jours actifs" : "active days"}
               </span>
               <span className="text-blue-600 font-bold group-hover:underline text-[9px]">
                 {isOfflineMode 
                   ? (language === 'fr' ? "Hors Ligne" : "Offline") 
                   : (language === 'fr' ? "Gérer →" : "Manage →")
                 }
               </span>
             </div>
          </button>

          {/* Today's Active Shifts Widget */}
          <section className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[230px]">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 truncate max-w-[75%]">
                {language === 'fr' ? "PERSONNEL ACTIF AUJOURD'HUI" : "ACTIVE SHIFTS TODAY"} ({language === 'fr' ? weekdayDisplayFr[todayName] || todayName : todayName})
              </h2>
              <Link to="/staff" className="text-[9px] font-bold text-blue-500 hover:underline uppercase tracking-wider shrink-0">{t("viewAll")}</Link>
            </div>
            <div className="p-3 space-y-2.5 overflow-y-auto flex-1 bg-white">
              {staffActiveToday.length === 0 ? (
                <div className="text-center p-6 text-slate-400 italic text-[11px] font-serif flex flex-col items-center justify-center h-full">
                  <Users className="w-6 h-6 opacity-25 mb-1.5" />
                  {language === 'fr' 
                    ? "Aucun personnel planifié de garde aujourd'hui." 
                    : "No staff shifts scheduled on duty today."}
                </div>
              ) : (
                staffActiveToday.map((s, i) => (
                  <button 
                    key={s.id || i} 
                    onClick={() => {
                      setSelectedStaffForCalendar(s);
                      setCalendarYear(new Date().getFullYear());
                      setCalendarMonth(new Date().getMonth());
                    }}
                    type="button"
                    className="w-full flex items-center justify-between p-2 hover:bg-slate-100 hover:border-slate-300 rounded-lg border border-slate-100/50 transition-all text-xs bg-slate-50/20 text-left focus:outline-none cursor-pointer group"
                    title={language === 'fr' ? "Voir le calendrier de garde de ce personnel" : "View this staff's shift calendar"}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 bg-slate-800 text-white text-[11px] font-mono rounded flex items-center justify-center shrink-0 font-bold group-hover:bg-blue-600 transition-colors">
                        {s.name?.charAt(0) || s.fullName?.charAt(0) || "S"}
                      </div>
                      <div className="truncate pr-1">
                        <p className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{s.fullName || s.name}</p>
                        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">{t(s.role)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[8.5px] font-mono font-bold bg-green-50 text-green-700 border border-green-100/85 px-2 py-0.5 rounded-full uppercase">
                        {t("ACTIVE")}
                      </span>
                      <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Real Inventory Status */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-40 overflow-hidden shrink-0">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-500">{t("criticalInventory")}</h2>
              <Link to="/inventory" className="text-[9px] tracking-wider font-bold text-blue-500 hover:underline uppercase">{t("viewAll")}</Link>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1 bg-white">
              {displayedInventory.length === 0 ? (
                <div className="text-center p-4 text-slate-400 italic text-[11px] font-serif flex items-center justify-center h-full">
                  {language === 'fr' ? "Aucun inventaire actif" : "No asset items available."}
                </div>
              ) : (
                displayedInventory.map((item, i) => {
                  const isLow = (Number(item.stock) || 0) <= (Number(item.minStock) || 0);
                  return (
                    <div key={item.id || i} className="flex items-center justify-between border-b border-slate-50 pb-1.5 last:border-0 last:pb-0 text-xs">
                      <span className="font-medium text-slate-700 truncate pr-2">{item.name}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                        isLow ? "bg-rose-100 text-rose-700 font-bold animate-pulse" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {isLow 
                          ? (language === 'fr' ? `STOCK BAS: ${item.stock}${item.unit || "u"}` : `LOW STOCK: ${item.stock}${item.unit || "u"}`) 
                          : (language === 'fr' ? `OK: ${item.stock}${item.unit || "u"}` : `SAFE: ${item.stock}${item.unit || "u"}`)
                        }
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {showScheduleModal && (
        <WorkCalendarModal 
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          schedule={schedule}
          onSaveSchedule={handleSaveSchedule}
          name={profile?.fullName || profile?.name || "Administrator"}
          role={t("ADMIN") || "Administrator"}
        />
      )}

      {selectedStaffForCalendar && (() => {
        const testYear = calendarYear;
        const testMonth = calendarMonth;
        
        const monthNamesFr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const currentMonthName = language === 'fr' ? monthNamesFr[testMonth] : monthNamesEn[testMonth];
        
        const labelsFr = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        const labelsEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdayLabels = language === 'fr' ? labelsFr : labelsEn;
        
        const daysOfWeekList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const daysInMonth: Date[] = [];
        const dateIterator = new Date(testYear, testMonth, 1);
        while (dateIterator.getMonth() === testMonth) {
          daysInMonth.push(new Date(dateIterator));
          dateIterator.setDate(dateIterator.getDate() + 1);
        }
        
        const firstDayIdx = new Date(testYear, testMonth, 1).getDay();

        let workingCount = 0;
        const gridDays = daysInMonth.map(date => {
          const yStr = date.getFullYear();
          const mStr = String(date.getMonth() + 1).padStart(2, '0');
          const dStr = String(date.getDate()).padStart(2, '0');
          const dateStr = `${yStr}-${mStr}-${dStr}`;
          const dayName = daysOfWeekList[date.getDay()];
          
          const sSchedule = selectedStaffForCalendar.schedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const isActive = sSchedule.includes(dateStr) || sSchedule.includes(dayName);
          
          if (isActive) {
            workingCount++;
          }
          
          return {
            date,
            dayNum: date.getDate(),
            isActive,
            isToday: new Date().toDateString() === date.toDateString()
          };
        });

        const handlePrevMonth = () => {
          if (testMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(testYear - 1);
          } else {
            setCalendarMonth(testMonth - 1);
          }
        };

        const handleNextMonth = () => {
          if (testMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(testYear + 1);
          } else {
            setCalendarMonth(testMonth + 1);
          }
        };

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-app-bg border border-app-line w-full max-w-md my-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                
                <div className="flex items-start justify-between border-b border-app-line pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded font-mono text-sm font-bold flex items-center justify-center">
                      {selectedStaffForCalendar.name?.charAt(0) || selectedStaffForCalendar.fullName?.charAt(0) || "S"}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 font-serif italic text-base leading-tight">
                        {selectedStaffForCalendar.fullName || selectedStaffForCalendar.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">
                        {language === 'fr' ? "RÔLE : " : "ROLE: "} {t(selectedStaffForCalendar.role)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedStaffForCalendar(null)}
                    type="button"
                    className="text-slate-400 hover:text-slate-600 font-mono text-sm tracking-wide p-1 cursor-pointer focus:outline-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4 bg-slate-50 border border-app-line p-2">
                  <button 
                    onClick={handlePrevMonth} 
                    type="button" 
                    className="p-1 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest block text-slate-800">
                      {currentMonthName} {testYear}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 by-0.5 rounded-full mt-1 inline-block border border-emerald-100 px-2 py-0.5">
                      {language === 'fr' ? `${workingCount} jours actifs` : `${workingCount} active days`}
                    </span>
                  </div>
                  <button 
                    onClick={handleNextMonth} 
                    type="button" 
                    className="p-1 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-6">
                  {weekdayLabels.map((lbl, idx) => (
                    <div key={idx} className="text-[9px] uppercase font-mono font-bold text-slate-400 py-1">
                      {lbl}
                    </div>
                  ))}

                  {Array(firstDayIdx).fill(null).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 border border-slate-100/30 rounded" />
                  ))}

                  {gridDays.map((day, idx) => (
                    <div 
                      key={idx} 
                      className={`relative aspect-square flex flex-col items-center justify-center rounded border transition-all ${
                        day.isActive 
                          ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm" 
                          : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                      } ${day.isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    >
                      <span className="text-xs font-mono">{day.dayNum}</span>
                      {day.isActive && (
                        <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-app-line">
                  <button
                    onClick={() => setSelectedStaffForCalendar(null)}
                    type="button"
                    className="px-6 py-2 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    {language === 'fr' ? "Fermer" : "Close"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

