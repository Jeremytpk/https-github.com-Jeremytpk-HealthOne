import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit 
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
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
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

  const userRole = profile?.role?.toUpperCase();

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

const ReceptionistDashboard = ({ t, profile, hospitalId }: any) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    return () => unsubscribe();
  }, [hospitalId, profile]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Lab Registry" value={patients.length.toString()} icon={Users} trend="+12 today" variant="dark" />
        <StatCard title="Average Triage Wait" value="14 min" icon={Clock} trend="↑ 2m vs yesterday" />
        <StatCard title="Insurance Verified" value="82%" icon={CheckCircle2} trend="Optimal" />
        <StatCard title="Emergency Admits" value="03" icon={Activity} trend="Active Now" />
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[500px]">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-xs text-slate-700 flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               Recent Registrations
            </h2>
            <Link to="/patients" className="text-[10px] font-bold text-blue-500 hover:underline">VIEW ALL</Link>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 shadow-sm">
                <tr className="text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3 pl-4">ID</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">GENDER</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">Syncing records...</td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">No patients registered yet.</td></tr>
                ) : patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group text-xs">
                    <td className="p-3 pl-4 font-mono text-slate-400 italic">#{p.id.slice(-6).toUpperCase()}</td>
                    <td className="p-3">
                      <Link to={`/patients/${p.id}`} className="font-bold text-blue-600 hover:underline">
                        {p.firstName} {p.lastName}
                      </Link>
                    </td>
                    <td className="p-3 uppercase text-slate-500">{p.gender || 'N/A'}</td>
                    <td className="p-3 text-slate-500 font-mono">{p.phone || 'No Contact'}</td>
                    <td className="p-3 font-medium">{p.age || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        
        <div className="col-span-4 space-y-4 h-[500px] flex flex-col">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-200 flex-shrink-0">
            <h3 className="text-xl font-bold tracking-tight mb-2 italic underline decoration-blue-500 underline-offset-4">Registration Terminal</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-6">Queue Management v4.2</p>
            
            <div className="space-y-4">
              <Link 
                to="/patients?register=true" 
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">New Registration</p>
                    <p className="text-[9px] text-slate-500">Add walk-in patient</p>
                  </div>
                </div>
                <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Insurance Verify</p>
                    <p className="text-[9px] text-slate-500">Scan Policy ID</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Today's Appointment Load</p>
              <h4 className="text-3xl font-black text-slate-800">12 / 24</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-400 uppercase">Daily Capacity</span>
                <span className="text-blue-600">50%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DoctorDashboard = ({ t }: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Active Consultations" value="04" icon={Users} trend="Current Shift" variant="dark" />
      <StatCard title="Pending Lab Results" value="12" icon={Activity} trend="Critical: 02" />
      <StatCard title="Surgeries Today" value="02" icon={Bed} trend="OR-1 Scheduled" />
      <StatCard title="Avg Consult Time" value="18m" icon={Clock} trend="Within standard" />
    </div>
    <div className="grid grid-cols-12 gap-4 h-[500px]">
       <section className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 font-bold text-xs">My Patient Queue</div>
          <div className="p-0 overflow-auto">
             <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                   <tr className="text-[10px] text-slate-400">
                      <th className="p-3 pl-4">Patient</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Vitals Status</th>
                      <th className="p-3">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   <tr>
                      <td className="p-3 pl-4 font-bold">Marc Dupont</td>
                      <td className="p-3 text-slate-500">Persistent Fever (Lab Req)</td>
                      <td className="p-3"><span className="text-emerald-500 font-bold">STABLE</span></td>
                      <td className="p-3"><button className="px-2 py-1 bg-blue-600 text-white rounded font-bold text-[10px]">OPEN FILE</button></td>
                   </tr>
                </tbody>
             </table>
          </div>
       </section>
       <div className="col-span-4 bg-blue-900 rounded-xl p-4 text-white">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Med-Bot Assistant</h4>
          <p className="text-xs mt-2 italic text-blue-100/70">"You have 2 pathology reports awaiting review from the morning rounds."</p>
          <div className="mt-4 pt-4 border-t border-blue-800">
             <button className="text-[10px] font-bold underline">REVIEW LABS</button>
          </div>
       </div>
    </div>
  </div>
);

const PharmacistDashboard = ({ t }: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Pending Prescriptions" value="18" icon={Package} trend="Live Queue" variant="dark" />
      <StatCard title="Low Stock Alarms" value="06" icon={TrendingUp} trend="Needs ordering" />
      <StatCard title="Narcotics Count" value="Verified" icon={CheckCircle2} trend="Confirmed 08:00" />
      <StatCard title="Daily Turnover" value="$4,200" icon={TrendingUp} trend="↑ 5% vs Avg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
       <div className="bg-white rounded-xl border p-4">
          <h4 className="text-xs font-bold mb-4">Stock Utilization</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="patients" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
       </div>
       <div className="bg-slate-900 rounded-xl p-4 text-white overflow-y-auto">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Dispensing Logs</h4>
          <div className="space-y-3">
             {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center justify-between border-b border-slate-800 pb-2">
                   <div>
                      <p className="text-[10px] font-bold text-white">Amoxicillin 500mg (20u)</p>
                      <p className="text-[9px] text-slate-500">Sarah Connor / Dr. Adams</p>
                   </div>
                   <span className="text-[9px] font-mono text-emerald-400">DISPENSED</span>
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
      <StatCard title="Revenue (Today)" value="$12,450" icon={TrendingUp} trend="+15% vs Goal" variant="dark" />
      <StatCard title="Pending Invoices" value="23" icon={Clock} trend="Awaiting Insurar" />
      <StatCard title="Successful Payments" value="42" icon={CheckCircle2} trend="Optimal flow" />
      <StatCard title="Insurance Claims" value="08" icon={Activity} trend="Pending Review" />
    </div>
    <div className="bg-white rounded-xl border border-slate-200 h-[500px] flex flex-col">
       <div className="p-4 border-b font-bold text-xs uppercase tracking-tight text-slate-500">Financial Stream Overview</div>
       <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} />
               <XAxis dataKey="name" fontSize={10} />
               <YAxis fontSize={10} />
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
          Auto-Restock All
        </button>
      </div>
    </div>

    <div className="grid grid-cols-12 gap-4 h-[500px]">
      {/* Main Tracking Table */}
      <section className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
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
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr className="text-[10px] font-bold text-slate-400 uppercase">
                <th className="p-3 pl-4">ID</th>
                <th className="p-3">{t("patientName")}</th>
                <th className="p-3">{t("stage")}</th>
                <th className="p-3">{t("assignedDr")}</th>
                <th className="p-3">{t("wait")}</th>
                <th className="p-3 pr-4">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: "772-019", name: "Sarah Connor", stage: "Triage Phase", dr: "Dr. Adams", wait: "12 min", status: "In Progress", color: "bg-emerald-500" },
                { id: "881-224", name: "Marc Dupont", stage: "Lab Analysis", dr: "Dr. LeClerc", wait: "45 min", status: "Awaiting Result", color: "bg-slate-300" },
                { id: "440-101", name: "Jean-Luc Picard", stage: "Observation", dr: "Dr. Beverly", wait: "2h 15m", status: "Stabilized", color: "bg-emerald-500" },
                { id: "992-414", name: "Alice Smith", stage: "Pharmacy Queue", dr: "N/A", wait: "5 min", status: "Dispatching", color: "bg-blue-500" },
                { id: "551-092", name: "Robert Barath", stage: "Surgery Prep", dr: "Dr. Stark", wait: "1h 10m", status: "Pre-Op", color: "bg-amber-400" },
                { id: "123-456", name: "Ellen Ripley", stage: "Discharge", dr: "Dr. Ash", wait: "N/A", status: "Ready", color: "bg-emerald-500" },
              ].map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group text-xs">
                  <td className="p-3 pl-4 font-mono text-slate-400">#{p.id}</td>
                  <td className="p-3 font-bold text-blue-600 group-hover:underline cursor-pointer">{p.name}</td>
                  <td className="p-3 text-slate-600 italic">{p.stage}</td>
                  <td className="p-3">{p.dr}</td>
                  <td className="p-3 text-slate-400 font-mono">{p.wait}</td>
                  <td className="p-3 pr-4">
                    <span className="flex items-center gap-2 font-medium">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 px-4 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-200 flex justify-between uppercase font-bold tracking-tighter">
          <span>HIPAA Compliant Session Active</span>
          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Audit Trail: Logged at 09:14:22 AM</span>
        </div>
      </section>

      {/* Right Sidebar Widgets */}
      <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
        <section className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Staff Schedules</h2>
            <button className="text-[9px] font-bold text-blue-500 hover:underline">View All</button>
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

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-40 overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Critical Inventory</h2>
          </div>
          <div className="p-3 overflow-y-auto space-y-2">
            {[
              { name: "MRI Scanner #1", status: "Available", color: "bg-emerald-100 text-emerald-700" },
              { name: "Amoxicillin 500mg", status: "Low Stock: 14u", color: "bg-rose-100 text-rose-700" },
              { name: "Ventilator B-12", status: "Maintenance", color: "bg-amber-100 text-amber-700" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-1.5 last:border-0">
                <span className="text-[10px] font-medium text-slate-700">{item.name}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${item.color}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

