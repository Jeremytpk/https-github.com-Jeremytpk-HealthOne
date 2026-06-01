import React, { useState } from "react";
import { useOfflineSync, OfflineQueuedItem } from "../contexts/OfflineSyncContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  CloudLightning, 
  Database,
  FileText,
  User,
  Wallet,
  Settings,
  AlertCircle,
  CheckCircle2,
  XSquare,
  HelpCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OfflineSyncCenterProps {
  onClose?: () => void;
}

export default function OfflineSyncCenter({ onClose }: OfflineSyncCenterProps) {
  const { 
    isOnline, 
    isOfflineMode, 
    setOfflineMode, 
    queuedItems, 
    removeQueuedItem, 
    syncOfflineQueue, 
    isSyncing, 
    syncError 
  } = useOfflineSync();

  const { t, language } = useLanguage();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error' | 'syncing'>('idle');
  const [syncResult, setSyncResult] = useState<{ syncedCount: number; errors: string[] }>({ syncedCount: 0, errors: [] });
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  // Translate helper labels dynamically
  const getFriendlyTypeName = (collectionName: string) => {
    switch (collectionName) {
      case "patients":
        return language === "fr" ? "Fiche Patient" : "Patient File";
      case "medical_cases":
        return language === "fr" ? "Dossier Médical" : "Medical Case";
      case "evolution_notes":
        return language === "fr" ? "Notes d'Évolution" : "Evolution Notes";
      case "payments":
        return language === "fr" ? "Paiement / Facture" : "Payment Record";
      case "inventory":
        return language === "fr" ? "Article Inventaire" : "Inventory Item";
      case "inventory_transactions":
        return language === "fr" ? "Transaction Stock" : "Stock Transaction";
      case "users":
        return language === "fr" ? "Utilisateur / Staff" : "User / Staff Account";
      case "hospitals":
        return language === "fr" ? "Structure Hospitalière" : "Hospital Tenant";
      default:
        return collectionName;
    }
  };

  const getCollectionIcon = (collectionName: string) => {
    switch (collectionName) {
      case "patients":
        return <User className="w-4 h-4 text-blue-500" />;
      case "payments":
        return <Wallet className="w-4 h-4 text-emerald-500" />;
      case "inventory":
      case "inventory_transactions":
        return <Database className="w-4 h-4 text-cyan-500" />;
      default:
        return <FileText className="w-4 h-4 text-orange-500" />;
    }
  };

  const handleToggleOffline = () => {
    setOfflineMode(!isOfflineMode);
  };

  const handleTriggerSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await syncOfflineQueue();
      setSyncResult({ syncedCount: res.syncedCount, errors: res.errors });
      if (res.success) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[85vh] w-full max-w-lg md:max-w-xl">
      {/* HEADER banner */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="font-bold text-sm tracking-tight font-sans uppercase">
              {language === 'fr' ? "Centre d'Accès Hors-Ligne (Workspace Sync)" : "Offline Workspace Sync Node"}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              VERSION 4.2.1-HYBRID • DUAL-STATE ACTIVE
            </p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1 px-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white text-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* BODY Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Connection Network Status Tracker Card */}
        <div className={`p-4 rounded-xl border transition-all ${
          isOfflineMode 
            ? 'bg-rose-50/50 border-rose-250/20' 
            : 'bg-emerald-50/30 border-emerald-250/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isOfflineMode ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {isOfflineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold font-sans">
                  {language === 'fr' ? "Statut du Système Actuellement" : "System Environment Mode"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${
                    isOfflineMode ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                  <span className="text-xs font-semibold font-mono tracking-wide uppercase">
                    {isOfflineMode 
                      ? (language === 'fr' ? "MODE HORS-LIGNE LOCAL" : "OFFLINE LOCAL STORE") 
                      : (language === 'fr' ? "MODE CLOUD FIREBASE" : "ONLINE CLOUD FIREBASE")
                    }
                  </span>
                </div>
              </div>
            </div>
            
            {/* FORCE OFFLINE Toggle trigger */}
            <button
              type="button"
              onClick={handleToggleOffline}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider pointer-events-auto border transition-all ${
                isOfflineMode 
                  ? 'bg-white hover:bg-rose-100 border-rose-200 text-rose-700' 
                  : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isOfflineMode 
                ? (language === 'fr' ? "Passer En Direct" : "Go Online") 
                : (language === 'fr' ? "Passer Hors-Ligne" : "Force Offline")
              }
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            {isOfflineMode 
              ? (language === 'fr' 
                  ? "Vous êtes déconnecté du Cloud Firebase. Toutes les fiches créées (patients, paiements, diagnostics) sont immédiatement encapsulées dans la mémoire locale sécurisée de votre navigateur sans latence." 
                  : "Disconnected from the cloud node. All transactions, registrations, progress notes, and finances will preserve safely in local browser container with zero-latency writes."
                )
              : (language === 'fr'
                  ? "Connecté en toute sécurité au serveur de base de données Firebase Cloud. Les données sont instantanément synchronisées avec la production pour tout le personnel."
                  : "Active telemetry connection to global cloud servers. All operational logs synchronize instantaneously with real-time replication services."
                )
            }
          </p>
        </div>

        {/* Explain the local storage feature */}
        <div className="text-xs bg-slate-50 border border-slate-150 p-3 rounded-lg flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block text-slate-700">How Hybrid Sync Works</span>
            <span className="text-slate-500 leading-normal block mt-0.5">
              {language === 'fr'
                ? "Si vous perdez votre réseau internet au milieu d'une consultation ou facturation, l'application continue de fonctionner. Écrivez vos données normalement, réactivez la connection, puis cliquez sur 'Synchroniser' ci-dessous pour tout téléverser."
                : "Should you lose connection during care-delivery, HealthOne captures any write payloads silently on-device. Switch back to Cloud mode to deploy your pending offline records to the main database when ready."}
            </span>
          </div>
        </div>

        {/* Queued database payloads monitor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              {language === 'fr' ? `OBJETS EN ATTENTE (${queuedItems.length})` : `PENDING SYNC WORKLOAD (${queuedItems.length})`}
            </h3>
            {queuedItems.length > 0 && isOnline && !isOfflineMode && (
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                {language === 'fr' ? "Prêt à être envoyé" : "Connection Ready"}
              </span>
            )}
          </div>

          {queuedItems.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">
                {language === 'fr' ? "Aucun objet en attente de synchronisation." : "No entries waiting in offline storage."}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {language === 'fr' ? "Tous vos dossiers sont à jour sur le Cloud." : "All data structures are replicated in full."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {queuedItems.map((item) => (
                <div 
                  key={item.id}
                  className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-slate-100">
                      {getCollectionIcon(item.collectionName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {item.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                          {getFriendlyTypeName(item.collectionName)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeQueuedItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title={language === 'fr' ? "Supprimer de la file" : "Delete offline entry"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Progress / Status Banner */}
        <AnimatePresence>
          {syncStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                syncStatus === 'syncing' 
                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                  : syncStatus === 'success'
                  ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                  : 'bg-rose-50 border-rose-250 text-rose-800'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin mt-0.5 shrink-0" />
              ) : syncStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              )}
              
              <div className="text-xs">
                {syncStatus === 'syncing' && (
                  <p className="font-bold">
                    {language === 'fr' ? "Synchronisation en cours..." : "Deploying offline records to Cloud..."}
                  </p>
                )}
                {syncStatus === 'success' && (
                  <div>
                    <p className="font-bold">
                      {language === 'fr' ? "Synchronisation terminée avec succès !" : "Cloud Database Synthesized Successfully!"}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                      {language === 'fr' 
                        ? `${syncResult.syncedCount} nouveau(x) dossier(s) transféré(s) avec succès dans le Cloud.`
                        : `${syncResult.syncedCount} document(s) uploaded and saved to active Firestore collections.`
                      }
                    </p>
                  </div>
                )}
                {syncStatus === 'error' && (
                  <div>
                    <p className="font-bold">
                      {language === 'fr' ? "Échec de la synchronisation" : "Sync Session Halted"}
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      {syncError || (language === 'fr' ? "Vérifiez votre connexion internet." : "Verify you have a valid internet connection to reach Firebase.")}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER Action Toolbar */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => setShowConfigDetails(!showConfigDetails)}
          className="text-[10px] text-slate-500 hover:text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          {showConfigDetails ? (language === 'fr' ? "Masquer les détails" : "Hide Details") : (language === 'fr' ? "Voir les détails" : "View System details")}
        </button>

        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors bg-white text-slate-700"
            >
              {language === 'fr' ? "Fermer" : "Close"}
            </button>
          )}
          
          <button
            onClick={handleTriggerSync}
            disabled={queuedItems.length === 0 || isSyncing || (isOfflineMode && isOnline)}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              queuedItems.length === 0 || isSyncing || (isOfflineMode && isOnline)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {language === 'fr' 
              ? (isSyncing ? "Envoi..." : "Tout synchroniser") 
              : (isSyncing ? "Syncing..." : "Sync All & Upload")
            }
          </button>
        </div>
      </div>

      {showConfigDetails && (
        <div className="bg-slate-100/50 p-4 border-t border-slate-150 text-[10px] font-mono text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 uppercase mb-1">Local Sandbox Telemetry:</p>
          <p>• Device Network Telemetry: {isOnline ? 'Online/Reachable' : 'No Network Connection'}</p>
          <p>• Offline Forced Setting: {isOfflineMode ? 'TRUE (Local-mode prioritised)' : 'FALSE'}</p>
          <p>• Key Container: localStorage:healthone_offline_queue</p>
          <p>• Sandbox Client: Google Firestore SDK 10.x Web Core</p>
        </div>
      )}
    </div>
  );
}
