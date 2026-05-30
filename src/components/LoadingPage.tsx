import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";

export default function LoadingPage() {
  const [statusIndex, setStatusIndex] = useState(0);
  const statuses = [
    "INITIALIZING_SECURE_CORE",
    "ESTABLISHING_SECURE_CONNECTION",
    "SYNCHRONIZING_TENANT_SCHEMAS",
    "VERIFYING_ROLE_PRIVILEGES",
    "DECRYPTING_USER_SESSION"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [statuses.length]);

  return (
    <div className="fixed inset-0 bg-slate-50 z-[9999] flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      <style>{`
        @keyframes progress-anim {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
        .custom-progress-bar {
          animation: progress-anim 1.8s infinite linear;
          width: 35%;
        }
      `}</style>

      {/* Background radial effects */}
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse" />

      <div className="text-center space-y-6 relative max-w-sm w-full">
        {/* Animated pulsating Logo and Icon */}
        <div className="relative flex justify-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl shadow-emerald-500/10 flex items-center justify-center border border-slate-100 relative animate-bounce duration-1000">
            <img 
              src="/assets/HealthOneLogo.png" 
              alt="HealthOne" 
              className="w-16 h-16 object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Heartbeat pulse ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse">
            <div className="w-24 h-24 rounded-3xl border-2 border-emerald-500/20 animate-ping absolute duration-1000 opacity-75" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-serif italic font-bold tracking-tight text-slate-800 flex items-center justify-center gap-2">
            Health<span className="text-slate-900 border-b-2 border-emerald-500">One</span>
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-slate-400 mt-2">
            Hospital Management Suite
          </p>
        </div>

        {/* Loading progress indicator */}
        <div className="space-y-3 pt-4">
          <div className="w-full bg-slate-200 h-[3px] rounded-full overflow-hidden relative">
            <div className="bg-emerald-500 h-full rounded-full absolute top-0 left-0 custom-progress-bar" />
          </div>
          
          <div className="flex items-center justify-center gap-2 text-slate-500 font-mono text-[9px] uppercase tracking-[0.15em]">
            <Activity className="w-3 h-3 text-emerald-500 font-bold animate-pulse" />
            <span>{statuses[statusIndex]}...</span>
          </div>
        </div>
      </div>

      {/* Styled Security Badges */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest text-slate-300">
        <span>HIPAA COMPLIANT</span>
        <span>•</span>
        <span>SSL SECURED</span>
      </div>
    </div>
  );
}
