import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  Package, 
  Pill, 
  Plus, 
  Minus, 
  ArrowRightLeft, 
  Search,
  AlertTriangle,
  History,
  Trash2,
  User,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  X as CloseIcon,
  Printer
} from "lucide-react";

export default function Inventory() {
  const { hospitalId, profile } = useAuth();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "EQUIPMENT" | "MEDICINE">("ALL");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "EQUIPMENT", stock: 0, unit: "units", minStock: 5, imageUrl: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setFormError(null);
    setShowAddModal(true);
  };

  const getNormalizedUserRole = (role: string | null | undefined): string => {
    if (!role) return "STAFF";
    const upper = role.toUpperCase();
    if (upper.includes("PHARMAC")) return "PHARMACIE";
    if (upper.includes("INVENT")) return "INVENTAIRE";
    if (upper.includes("ADMIN")) return "ADMIN";
    return upper;
  };

  const userRoleNormalized = getNormalizedUserRole(profile?.role);
  const isPharmacie = userRoleNormalized === "PHARMACIE";
  const isInventaire = userRoleNormalized === "INVENTAIRE";
  const isAdmin = userRoleNormalized === "ADMIN";
  const canAddArticle = isPharmacie || isInventaire || isAdmin;

  useEffect(() => {
    if (isPharmacie) {
      setFilterType("MEDICINE");
      setNewItem(prev => ({ ...prev, type: "MEDICINE" }));
    } else {
      setNewItem(prev => ({ ...prev, type: "EQUIPMENT" }));
    }
  }, [profile?.role, isPharmacie]);

  useEffect(() => {
    if (hospitalId) fetchItems();
  }, [hospitalId]);

  const fetchItems = async () => {
    setLoading(true);
    const q = query(collection(db, "inventory"), where("hospitalId", "==", hospitalId));
    const querySnapshot = await getDocs(q);
    setItems(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const adjustStock = async (itemId: string, amount: number) => {
    try {
      const itemRef = doc(db, "inventory", itemId);
      await updateDoc(itemRef, { stock: increment(amount) });
      
      // Log transaction
      await addDoc(collection(db, "inventory_transactions"), {
        hospitalId,
        itemId,
        type: amount > 0 ? "IN" : "OUT",
        quantity: Math.abs(amount),
        userId: profile?.id,
        userName: profile?.name || "System",
        createdAt: serverTimestamp()
      });
      
      fetchItems();
    } catch (error) {
      console.error("Error adjusting stock:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!window.confirm(t("areYouSure"))) return;
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "inventory", itemId));
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const fetchHistory = async (itemId: string) => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "inventory_transactions"), 
        where("itemId", "==", itemId),
        // orderBy("createdAt", "desc") // requires index, skipping for now to avoid errors
      );
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually if no index
      logs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(logs);
      setShowHistoryModal(items.find(i => i.id === itemId));
    } catch (error) {
      console.error("Error fetching history:", error);
    }
    setLoadingHistory(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!hospitalId) {
      setFormError("No Hospital ID found. Please log in again.");
      return;
    }
    if (!canAddArticle) {
      setFormError("Unauthorized to add item to inventory");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "inventory"), {
        name: newItem.name,
        type: newItem.type,
        stock: Number(newItem.stock),
        unit: newItem.unit,
        minStock: 5,
        imageUrl: "",
        hospitalId,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewItem({ name: "", type: isPharmacie ? "MEDICINE" : "EQUIPMENT", stock: 0, unit: "units", minStock: 5, imageUrl: "" });
      fetchItems();
    } catch (error: any) {
      console.error("Error adding item:", error);
      setFormError(error?.message || "An error occurred while saving the asset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (isPharmacie) {
      return matchesSearch && i.type === "MEDICINE";
    }
    return matchesSearch && (filterType === "ALL" || i.type === filterType);
  });

  const allowedTabs: ("ALL" | "EQUIPMENT" | "MEDICINE")[] = isPharmacie 
    ? ["MEDICINE"] 
    : (isInventaire || isAdmin) 
      ? ["ALL", "EQUIPMENT", "MEDICINE"] 
      : ["ALL", "EQUIPMENT", "MEDICINE"];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="print:hidden space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase">{t("inventory")}</h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">SUPPLY_CHAIN / ASSET_TRACKING</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={() => window.print()}
            className="h-10 bg-slate-800 text-white px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:bg-slate-900 transition-all border border-app-line select-none cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" /> {t("printList")}
          </button>
          {canAddArticle && (
            <button 
              onClick={openAddModal}
              className="h-10 bg-slate-900 text-white px-6 flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest hover:bg-slate-800 transition-all border border-slate-200 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t("addStockItem")}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder={`${t("searchBySku").toUpperCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-white border border-app-line pl-12 pr-4 font-mono text-xs sm:text-sm focus:outline-none"
          />
        </div>
        {allowedTabs.length > 1 && (
          <div className="flex bg-white border border-app-line p-1 w-full lg:w-auto overflow-x-auto no-scrollbar">
            {allowedTabs.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`flex-1 lg:flex-none px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  filterType === type ? "bg-app-ink text-app-bg" : "hover:bg-gray-100"
                }`}
              >
                {t(type.toLowerCase())}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inventory Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-app-line relative group overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
               {item.stock <= item.minStock && (
                 <div className="absolute top-0 right-0 p-2 text-orange-600 bg-orange-50 border-l border-b border-app-line z-10 animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                 </div>
               )}

            <button 
              onClick={() => deleteItem(item.id)}
              className="absolute top-0 left-0 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {item.imageUrl && (
              <div className="h-32 w-full overflow-hidden border-b border-app-line">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="p-5 flex-1">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-xs font-mono opacity-50 uppercase tracking-wider mb-1">
                  {item.type === 'MEDICINE' ? <Pill className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                  {t(item.type.toLowerCase())}
                </div>
                <h3 className="font-bold text-lg leading-tight uppercase truncate">{item.name}</h3>
              </div>

              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="col-header">{t("stockLevel")}</p>
                  <p className={`text-2xl font-mono font-bold tracking-tighter ${item.stock <= item.minStock ? 'text-red-600' : ''}`}>
                    {item.stock} <span className="text-[10px] opacity-40 font-normal uppercase tracking-normal">{item.unit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="col-header">{t("minThreshold")}</p>
                  <p className="text-xs font-mono opacity-50">{item.minStock}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 border-t border-slate-200 pt-4 mt-auto">
                <button 
                  onClick={() => adjustStock(item.id, -1)}
                  disabled={item.stock <= 0}
                  className="flex-1 h-9 border border-slate-200 flex items-center justify-center gap-2 text-[10px] font-mono uppercase hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30"
                  title="Take from inventory"
                >
                  <Minus className="w-3 h-3" /> {t("take")}
                </button>
                <button 
                  onClick={() => adjustStock(item.id, 1)}
                  className="flex-1 h-9 bg-slate-900 text-white flex items-center justify-center gap-2 text-[10px] font-mono uppercase hover:bg-slate-800 transition-colors"
                  title="Restock inventory"
                >
                  <Plus className="w-3 h-3" /> {t("restock")}
                </button>
              </div>
              
              <button 
                onClick={() => fetchHistory(item.id)}
                className="mt-3 w-full text-center text-[9px] font-mono opacity-30 uppercase hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
              >
                <History className="w-3 h-3" /> {t("viewTransactionLog")}
              </button>
            </div>
          </div>
        ))}
      </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 bg-white">
          <div className="max-w-xs mx-auto">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="font-mono text-xs uppercase tracking-widest font-bold mb-2">{t("noItemsFound")}</h3>
            <p className="text-[10px] font-mono opacity-50 uppercase mb-6">{t("startByAddingFirstAsset")}</p>
            {canAddArticle && (
              <button 
                onClick={openAddModal}
                className="bg-slate-900 text-white px-8 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" /> {t("addStockItem")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-md my-auto p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest">{t("newAsset")}</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-mono rounded break-all">
                  ERROR: {formError}
                </div>
              )}
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("itemName")}</label>
                <input 
                  type="text" 
                  required 
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("category")}</label>
                  {isPharmacie ? (
                    <input 
                      type="text" 
                      readOnly 
                      value={t("medicine")} 
                      className="w-full bg-slate-100 border border-app-line p-2.5 font-mono text-sm focus:outline-none select-none"
                    />
                  ) : (
                    <select 
                      value={newItem.type}
                      onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                      className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none"
                    >
                      <option value="EQUIPMENT">{t("equipment")}</option>
                      <option value="MEDICINE">{t("medicine")}</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("unitType")}</label>
                  <input 
                    type="text" 
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1 tracking-widest">{t("inStock")}</label>
                <input 
                  type="number" 
                  value={newItem.stock}
                  onChange={(e) => setNewItem({...newItem, stock: Number(e.target.value)})}
                  className="w-full bg-white border border-app-line p-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-app-ink"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-app-line">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 border border-app-line font-mono text-[10px] uppercase tracking-widest">{t("halt")}</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`px-8 py-2 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  {isSubmitting ? (language === 'fr' ? 'ENREGISTREMENT...' : 'SAVING...') : t("saveAsset")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-app-bg border border-app-line w-full max-w-2xl my-auto p-6 sm:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowHistoryModal(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <CloseIcon className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-serif italic font-bold border-b border-app-line pb-2 font-mono uppercase tracking-widest">{t("transactionHistory")}</h2>
              <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">
                {showHistoryModal.name} / {t(showHistoryModal.type.toLowerCase())}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
              {loadingHistory ? (
                <div className="py-10 text-center font-mono text-xs opacity-50 animate-pulse">{t("fetchingLogs")}</div>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center font-mono text-xs opacity-50">{t("noTransactions")}</div>
              ) : (
                <div className="divide-y divide-app-line border border-app-line">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${tx.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {tx.type === 'IN' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight uppercase font-mono">
                            {tx.type === 'IN' ? t("added") : t("removed")} {tx.quantity} {showHistoryModal.unit}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono opacity-50">
                            <User className="w-3 h-3" /> {tx.userName}
                            <Clock className="w-3 h-3 ml-2" /> {tx.createdAt?.toDate().toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-mono font-bold uppercase ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-app-line flex justify-end">
              <button 
                onClick={() => setShowHistoryModal(null)} 
                className="px-8 py-2 bg-app-ink text-app-bg font-mono text-[10px] uppercase tracking-widest hover:opacity-90"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* PRINT-ONLY EXCEL-LIKE SPREADSHEET CONTAINER */}
      <div className="hidden print:block w-full bg-white text-slate-950 p-6 min-h-screen">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight uppercase leading-none">HealthOne Hospital Network</h1>
            <p className="text-sm font-mono uppercase tracking-widest text-slate-700 font-bold mt-2">
              {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : "Hospital")}
            </p>
            <p className="text-[10px] font-mono mt-1 text-slate-500 font-bold uppercase tracking-wider">
              {language === 'fr' ? "STATUT DES STOCKS ET INVENTAIRE PHARMACEUTIQUE" : "PHARMACEUTICAL ASSETS & INVENTORY STATUS LOGS"}
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p className="font-bold">EXPORTED: {new Date().toLocaleDateString()}</p>
            <p className="text-slate-500 mt-1 font-bold">{filteredItems.length} ROWS</p>
          </div>
        </div>

        <table className="excel-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>{language === 'fr' ? "Nom de l'Article" : "Item Name"}</th>
              <th>{language === 'fr' ? "Date" : "Date"}</th>
              <th>{language === 'fr' ? "Catégorie / Type" : "Category / Type"}</th>
              <th>{t("stockLevel") || "Stock level"}</th>
              <th>{language === 'fr' ? "Statut" : "Status"}</th>
              <th>{language === 'fr' ? "Seuil Minimum" : "Min Threshold"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr key={item.id}>
                <td className="font-mono text-[10px]">{idx + 1}</td>
                <td className="font-bold">{item.name}</td>
                <td className="font-mono text-[10px]">
                  {item.createdAt ? (
                    typeof item.createdAt === 'string' 
                      ? new Date(item.createdAt).toLocaleDateString() 
                      : item.createdAt.seconds 
                      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                      : item.createdAt.toDate 
                      ? item.createdAt.toDate().toLocaleDateString()
                      : "—"
                  ) : "—"}
                </td>
                <td className="uppercase font-mono text-[10px]">{t(item.type.toLowerCase())}</td>
                <td className="font-mono font-bold">
                  {item.stock} <span className="text-[10px] uppercase">{item.unit || "units"}</span>
                </td>
                <td className="font-mono text-[10px] uppercase font-bold">
                  {item.stock <= item.minStock ? (
                    <span className="text-red-600">{language === 'fr' ? "Alerte de Stock" : "Low Stock"}</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">OK</span>
                  )}
                </td>
                <td className="font-mono text-slate-500">{item.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer for Excel Sheet */}
        <div className="print-footer">
          <span>HealthOne</span>
          <span>Jerttech</span>
        </div>
      </div>
    </div>
  );
}

// Minimal placeholder for dedicated Pharmacy page logic if needed, 
// for now they share the Inventory state logic or we redirect
export function Pharmacy() {
    return <Inventory />
}
