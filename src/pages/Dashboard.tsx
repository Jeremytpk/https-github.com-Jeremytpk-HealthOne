import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
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
  AlertCircle
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
  const [patients, setPatients] = useState<any[]>([]);
  const [pediatricians, setPediatricians] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingPedSchedule, setViewingPedSchedule] = useState<any | null>(null);

  // Deletion States
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "patients", patientToDelete.id));
      setShowDeleteConfirm(false);
      setPatientToDelete(null);
    } catch (err) {
      console.error("Failed to delete patient on dashboard:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePedSchedule = async (newSchedule: string[]) => {
    if (!viewingPedSchedule) return;
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
      setPatients(patientData.slice(0, 10));
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
    }, (error) => {
      console.error("Staff fetch snap error:", error);
    });

    return () => {
      unsubscribe();
      unsubscribeStaff();
    };
  }, [hospitalId, profile]);

  const displayList = showAllStaff ? allStaff : pediatricians;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title={t("labRegistry")} value={patients.length.toString()} icon={Users} trend="+12 today" variant="dark" />
        <StatCard title={t("avgTriageWait")} value="14 min" icon={Clock} trend="↑ 2m vs yesterday" />
        <StatCard title={t("insuranceVerified")} value="82%" icon={CheckCircle2} trend="Optimal" />
        <StatCard title={t("emergencyAdmits")} value="03" icon={Activity} trend="Active Now" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Registration Terminal & Today's Load Side-by-Side on top */}
        <div className="col-span-1 lg:col-span-12 flex flex-col sm:flex-row gap-4">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-200 flex-1">
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

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between min-h-[160px]">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{t("appointmentLoad")}</p>
              <h4 className="text-4xl font-black text-slate-800 tracking-tight">12 / 24</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-400 uppercase">{t("dailyCapacity")}</span>
                <span className="text-blue-600">50%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-2.5 rounded-full w-1/2" />
              </div>
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
                ) : patients.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs italic">{t("noPatientsRegistered")}</td></tr>
                ) : patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group text-xs text-nowrap lg:text-wrap">
                    <td className="p-3 pl-4 font-mono text-slate-400 italic">#{p.id.slice(-6).toUpperCase()}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link to={`/patients/${p.id}`} className="font-bold text-blue-600 hover:underline">
                          {p.firstName} {p.lastName}
                        </Link>
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
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors inline-block"
                          title={t("deletePatient")}
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
                          className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 text-[9px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Calendar className="w-3 h-3" />
                          {language === 'fr' ? "Gérer" : "Calendar"}
                        </button>
                      </div>

                      <MiniAuditedCalendar 
                        schedule={docSchedule} 
                        onChangeSchedule={async (newSchedule) => {
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
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    setSchedule(newSchedule);
    try {
      await updateProfile({ schedule: newSchedule });
    } catch (err) {
      console.error("Failed to update schedule:", err);
    }
  };

  const toggleDay = async (day: string) => {
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
      setLoading(false);
    }, (error) => {
      console.error("Doctor Dashboard Snap Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [hospitalId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title={t("activeConsultations")} value={patients.length > 0 ? `0${patients.length}`.slice(-2) : "00"} icon={Users} trend="Current Shift" variant="dark" />
        <StatCard title={t("pendingLabResults")} value="12" icon={Activity} trend="Critical: 02" />
        
        {/* Interactive Pediatre Availability Card replacing Chirurgies Aujourd'hui */}
        <button 
          onClick={() => setShowCalendarModal(true)}
          className="p-4 rounded-xl border flex flex-col justify-between shadow-sm relative overflow-hidden h-28 bg-white border-slate-200 text-slate-900 group cursor-pointer text-left hover:border-blue-500 hover:shadow-md transition-all duration-200"
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
               <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{patients.length}</span>
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
                     ) : patients.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                           {t("noPatientsRegistered") || "No patients found in your queue."}
                         </td>
                       </tr>
                     ) : (
                       patients.map((p) => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 pl-4 font-bold text-slate-800">
                              {p.firstName} {p.lastName}
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

const PharmacistDashboard = ({ t }: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title={t("pendingPrescriptions")} value="18" icon={Package} trend="Live Queue" variant="dark" />
      <StatCard title={t("lowStockAlarms")} value="06" icon={TrendingUp} trend="Needs ordering" />
      <StatCard title={t("narcoticsCount")} value="Verified" icon={CheckCircle2} trend="Confirmed 08:00" />
      <StatCard title={t("dailyTurnover")} value="$4,200" icon={TrendingUp} trend="↑ 5% vs Avg" />
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

const CashierDashboard = ({ t }: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title={t("revenueToday")} value="$12,450" icon={TrendingUp} trend="+15% vs Goal" variant="dark" />
      <StatCard title={t("pendingInvoices")} value="23" icon={Clock} trend="Awaiting Insurar" />
      <StatCard title={t("successfulPayments")} value="42" icon={CheckCircle2} trend="Optimal flow" />
      <StatCard title={t("insuranceClaims")} value="08" icon={Activity} trend="Pending Review" />
    </div>
    <div className="bg-white rounded-xl border border-slate-200 h-[400px] lg:h-[500px] flex flex-col">
       <div className="p-4 border-b font-bold text-xs uppercase tracking-tight text-slate-500">{t("financialOverview")}</div>
       <div className="flex-1 p-4 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} />
               <XAxis dataKey="name" fontSize={10} />
               <YAxis fontSize={10} width={40} />
               <Tooltip />
               <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
       </div>
    </div>
  </div>
);

const AdminDashboard = ({ t }: any) => (
  <div className="space-y-4">
    {/* Analytics Row */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title={`${t("revenue")} (CAD)`} value="$142,400.00" icon={TrendingUp} trend="↑ 12% vs Yesterday" variant="dark" />
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
        <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t("occupancy")}</p>
        <p className="text-2xl font-bold">84%</p>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
          <div className="bg-blue-500 h-1.5 rounded-full w-[84%] transition-all duration-1000" />
        </div>
      </div>
      <StatCard title={t("leave")} value="12" icon={Users} trend="Critical level" />
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
        <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t("reorders")}</p>
        <p className="text-2xl font-bold text-amber-600">08</p>
        <button className="w-full py-1 text-[9px] font-bold bg-slate-800 text-white rounded uppercase tracking-widest hover:bg-slate-700 transition-colors">
          {t("autoRestockAll")}
        </button>
      </div>
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
               <div className="w-1 h-1 rounded-full bg-emerald-500" /> LIVE
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
             {[
                { id: "772-019", name: "Sarah Connor", stageKey: "triagePhase", dr: "Dr. Adams", wait: "12 min", statusKey: "inProgress", color: "bg-emerald-500" },
                { id: "881-224", name: "Marc Dupont", stageKey: "labAnalysis", dr: "Dr. LeClerc", wait: "45 min", statusKey: "awaitingResult", color: "bg-slate-300" },
                { id: "440-101", name: "Jean-Luc Picard", stageKey: "observation", dr: "Dr. Beverly", wait: "2h 15m", statusKey: "stabilized", color: "bg-emerald-500" },
                { id: "992-414", name: "Alice Smith", stageKey: "pharmacyQueue", dr: "N/A", wait: "5 min", statusKey: "dispatching", color: "bg-blue-500" },
                { id: "551-092", name: "Robert Barath", stageKey: "surgeryPrep", dr: "Dr. Stark", wait: "1h 10m", statusKey: "preOp", color: "bg-amber-400" },
                { id: "123-456", name: "Ellen Ripley", stageKey: "discharge", dr: "Dr. Ash", wait: "N/A", statusKey: "ready", color: "bg-emerald-500" },
              ].map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group text-xs">
                  <td className="p-3 pl-4 font-mono text-slate-400">#{p.id}</td>
                  <td className="p-3 font-bold text-blue-600 group-hover:underline cursor-pointer">{p.name}</td>
                  <td className="p-3 text-slate-600 italic">{t(p.stageKey)}</td>
                  <td className="p-3 hidden sm:table-cell">{p.dr}</td>
                  <td className="p-3 text-slate-400 font-mono">{p.wait === "N/A" ? t("NA") : p.wait}</td>
                  <td className="p-3 pr-4">
                    <span className="flex items-center gap-2 font-medium">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                      {t(p.statusKey)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 px-4 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-200 flex justify-between uppercase font-bold tracking-tighter">
          <span>HIPAA Compliant</span>
          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> 09:14:22 AM</span>
        </div>
      </section>

      {/* Right Sidebar Widgets */}
      <div className="col-span-1 lg:col-span-4 flex flex-col gap-4 overflow-hidden lg:h-full">
        <section className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[300px] lg:h-auto">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-500">{t("staffSchedules")}</h2>
            <button className="text-[9px] font-bold text-blue-500 hover:underline uppercase">{t("viewAll")}</button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 text-center flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400">09:00</p>
                <div className="w-[1px] flex-1 bg-slate-100 mt-1" />
              </div>
              <div className="flex-1 bg-blue-50 border-l-2 border-blue-500 p-2.5 rounded shadow-sm">
                <p className="text-[10px] font-bold text-blue-700">Cardiology Rounds</p>
                <p className="text-[9px] text-blue-600/80 mt-0.5">Dr. Marcus / Ward 4B</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 text-center flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400">10:30</p>
                <div className="w-[1px] h-8 bg-slate-100 mt-1" />
              </div>
              <div className="flex-1 bg-rose-50 border-l-2 border-rose-500 p-2.5 rounded shadow-sm">
                <p className="text-[10px] font-bold text-rose-700">Emergency Surgery</p>
                <p className="text-[9px] text-rose-600/80 mt-0.5">OR-2 / Multi-Staff</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-40 overflow-hidden shrink-0">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 uppercase">{t("criticalInventory")}</h2>
          </div>
          <div className="p-3 overflow-y-auto space-y-2">
             {[
               { name: "MRI Scanner #1", statusKey: "available", color: "bg-emerald-100 text-emerald-700" },
               { name: "Amoxicillin 500mg", statusKey: "lowStock", quantity: 14, color: "bg-rose-100 text-rose-700" },
               { name: "Ventilator B-12", statusKey: "maintenance", color: "bg-amber-100 text-amber-700" },
             ].map((item, i) => (
               <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-1.5 last:border-0">
                 <span className="text-[10px] font-medium text-slate-700">{item.name}</span>
                 <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${item.color}`}>
                   {item.statusKey === "lowStock" ? t("lowStock").replace("{quantity}", String(item.quantity)) : t(item.statusKey)}
                 </span>
               </div>
             ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

