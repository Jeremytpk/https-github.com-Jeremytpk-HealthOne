import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface OfflineQueuedItem {
  id: string; // client-side temp id representing the document
  collectionName: string;
  data: any;
  timestamp: string;
  label: string;
}

interface OfflineSyncContextType {
  isOnline: boolean;
  isOfflineMode: boolean;
  setOfflineMode: (offline: boolean) => void;
  queuedItems: OfflineQueuedItem[];
  addOfflineDoc: (collectionName: string, data: any, label: string) => Promise<{ id: string }>;
  removeQueuedItem: (id: string) => void;
  syncOfflineQueue: () => Promise<{ success: boolean; syncedCount: number; errors: string[] }>;
  isSyncing: boolean;
  syncError: string | null;
  getQueuedItemsForCollection: (collectionName: string) => OfflineQueuedItem[];
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? window.navigator.onLine : true
  );

  const [isOfflineMode, setIsOfflineModeState] = useState<boolean>(() => {
    const cached = localStorage.getItem("healthone_forced_offline_mode");
    return cached === "true";
  });

  const [queuedItems, setQueuedItems] = useState<OfflineQueuedItem[]>(() => {
    const cached = localStorage.getItem("healthone_offline_queue");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse cached offline queue", e);
        return [];
      }
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Monitor real-world network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-reconnect if they weren't explicitly forcing offline mode
      console.log("Device network connected.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("Device network lost.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update cached state for forced offline mode
  const setOfflineMode = (offline: boolean) => {
    setIsOfflineModeState(offline);
    localStorage.setItem("healthone_forced_offline_mode", offline ? "true" : "false");
  };

  // Sync state to local storage when queue changes
  useEffect(() => {
    localStorage.setItem("healthone_offline_queue", JSON.stringify(queuedItems));
  }, [queuedItems]);

  // Push an item to local offline queue instead of cloud database
  const addOfflineDoc = async (collectionName: string, data: any, label: string) => {
    const tempId = `offline_${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // We clean or resolve serverTimestamps since they are clientside
    const processedData = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      isOfflinePending: true,
      offlineId: tempId,
    };

    const newItem: OfflineQueuedItem = {
      id: tempId,
      collectionName,
      data: processedData,
      timestamp: new Date().toISOString(),
      label,
    };

    setQueuedItems((prev) => [...prev, newItem]);
    
    // Return a resolved doc index resembling typical firebase object
    return { id: tempId };
  };

  const removeQueuedItem = (id: string) => {
    setQueuedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const getQueuedItemsForCollection = (collectionName: string) => {
    return queuedItems.filter((item) => item.collectionName === collectionName);
  };

  // Run synchronization of all queued local stores with the Firebase Cloud node
  const syncOfflineQueue = async () => {
    if (queuedItems.length === 0) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    setIsSyncing(true);
    setSyncError(null);
    let successCount = 0;
    const errors: string[] = [];
    const remainingItems: OfflineQueuedItem[] = [];
    
    // Store mappings from temp offline IDs to real Firestore IDs (e.g., {"offline_patients_123": "xHsR9..."})
    const idMap: Record<string, string> = {};

    // Sort items so "patients" are always synced first before "medical_cases" or "evolution_notes"
    const itemsToProcess = [...queuedItems].sort((a, b) => {
      const priority = (name: string) => {
        if (name === "patients") return 1;
        if (name === "medical_cases") return 2;
        if (name === "evolution_notes") return 3;
        return 4;
      };
      return priority(a.collectionName) - priority(b.collectionName);
    });

    for (const item of itemsToProcess) {
      try {
        // Strip out the helper flags we used for client side display
        const { isOfflinePending, offlineId, ...finalCleanData } = item.data;
        
        let uploadData = { ...finalCleanData };

        // Replace any patientId fields if they reference an draft offline patient ID that was resolved in this session
        if (uploadData.patientId && idMap[uploadData.patientId]) {
          uploadData.patientId = idMap[uploadData.patientId];
        }

        // Convert ISO string back to server timestamp if the page had that
        if (typeof uploadData.createdAt === 'string') {
          uploadData.createdAt = serverTimestamp();
        }
        if (typeof uploadData.updatedAt === 'string') {
          uploadData.updatedAt = serverTimestamp();
        }

        // Add to Firebase firestore
        const docRef = await addDoc(collection(db, item.collectionName), uploadData);
        successCount++;

        // Save mapping for child records if synced item can be referenced
        if (item.collectionName === "patients") {
          idMap[item.id] = docRef.id;
        }
      } catch (err: any) {
        console.error(`Failed to sync queued item: ${item.label}`, err);
        errors.push(`${item.label}: ${err?.message || "Unknown error"}`);
        // Keep in queue for retry
        remainingItems.push(item);
      }
    }

    // Update queue state with elements that failed
    setQueuedItems(remainingItems);
    setIsSyncing(false);

    if (errors.length > 0) {
      setSyncError(`${errors.length} item(s) failed during synchronization.`);
      return { success: false, syncedCount: successCount, errors };
    }

    return { success: true, syncedCount: successCount, errors: [] };
  };

  // Evaluated status (checks actual connection AND whether user forced local mode)
  const isCurrentlyOffline = isOfflineMode || !isOnline;

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        isOfflineMode: isCurrentlyOffline, // External layers see simple derived "isOfflineMode"
        setOfflineMode,
        queuedItems,
        addOfflineDoc,
        removeQueuedItem,
        syncOfflineQueue,
        isSyncing,
        syncError,
        getQueuedItemsForCollection,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error("useOfflineSync must be used within an OfflineSyncProvider");
  }
  return context;
};
