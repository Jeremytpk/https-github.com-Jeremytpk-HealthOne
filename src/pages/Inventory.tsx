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
  History
} from "lucide-react";

export default function Inventory() {
  const { hospitalId, profile } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "EQUIPMENT" | "MEDICINE">("ALL");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "EQUIPMENT", stock: 0, unit: "units", minStock: 5 });

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
        createdAt: serverTimestamp()
      });
      
      fetchItems();
    } catch (error) {
      console.error("Error adjusting stock:", error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;

    try {
      await addDoc(collection(db, "inventory"), {
        ...newItem,
        hospitalId,
        stock: Number(newItem.stock),
        minStock: Number(newItem.minStock)
      });
      setShowAddModal(false);
      fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    (filterType === "ALL" || i.type === filterType)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif italic font-bold tracking-tight mb-2 uppercase">{t("inventory")}</h1>
          <p className="text-sm font-mono opacity-50 uppercase tracking-widest">SUPPLY_CHAIN / ASSET_TRACKING</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="h-10 bg-app-ink text-app-bg px-6 flex items-center gap-2 font-mono uppercase text-xs tracking-widest hover:opacity-90 transition-all border border-app-line"
        >
          <Plus className="w-4 h-4" /> ADD_STOCK_ITEM
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="SEARCH_INVENTORY_BY_SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-white border border-app-line pl-12 pr-4 font-mono text-sm focus:outline-none"
          />
        </div>
        <div className="flex bg-white border border-app-line p-1">
          {["ALL", "EQUIPMENT", "MEDICINE"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as any)}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all ${
                filterType === t ? "bg-app-ink text-app-bg" : "hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white border border-app-line p-5 relative group overflow-hidden">
             {item.stock <= item.minStock && (
               <div className="absolute top-0 right-0 p-2 text-orange-600 bg-orange-50 border-l border-b border-app-line">
                  <AlertTriangle className="w-4 h-4" />
               </div>
             )}

            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-mono opacity-50 uppercase tracking-wider mb-1">
                {item.type === 'MEDICINE' ? <Pill className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                {item.type}
              </div>
              <h3 className="font-bold text-lg leading-tight uppercase truncate">{item.name}</h3>
            </div>

            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="col-header">Stock_Level</p>
                <p className={`text-2xl font-mono font-bold tracking-tighter ${item.stock <= item.minStock ? 'text-red-600' : ''}`}>
                  {item.stock} <span className="text-[10px] opacity-40 font-normal uppercase tracking-normal">{item.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="col-header">Min_Threshold</p>
                <p className="text-xs font-mono opacity-50">{item.minStock}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 border-t border-app-line pt-4">
              <button 
                onClick={() => adjustStock(item.id, -1)}
                disabled={item.stock <= 0}
                className="flex-1 h-9 border border-app-line flex items-center justify-center gap-2 text-[10px] font-mono uppercase hover:bg-gray-50 disabled:opacity-30"
              >
                <Minus className="w-3 h-3" /> REMOVE
              </button>
              <button 
                onClick={() => adjustStock(item.id, 1)}
                className="flex-1 h-9 bg-app-ink text-app-bg flex items-center justify-center gap-2 text-[10px] font-mono uppercase hover:opacity-90"
              >
                <Plus className="w-3 h-3" /> ADD
              </button>
            </div>
            
            <Link to="#" className="mt-2 block text-center text-[9px] font-mono opacity-30 uppercase hover:opacity-100 transition-opacity">
              View_Transaction_Log
            </Link>
          </div>
        ))}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-bg border border-app-line w-full max-w-md p-8 relative shadow-2xl">
            <h2 className="text-2xl font-serif italic font-bold mb-6 border-b border-app-line pb-2 font-mono uppercase tracking-widest">NEW_ASSET_ACQUISITION</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Item_Name</label>
                <input 
                  type="text" 
                  required 
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Category</label>
                  <select 
                    value={newItem.type}
                    onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  >
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="MEDICINE">MEDICINE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Unit_Type</label>
                  <input 
                    type="text" 
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Initial_Stock</label>
                  <input 
                    type="number" 
                    value={newItem.stock}
                    onChange={(e) => setNewItem({...newItem, stock: Number(e.target.value)})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1">Alert_Threshold</label>
                  <input 
                    type="number" 
                    value={newItem.minStock}
                    onChange={(e) => setNewItem({...newItem, minStock: Number(e.target.value)})}
                    className="w-full bg-white border border-app-line p-2 font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 border border-app-line font-mono text-xs uppercase">CANCEL</button>
                <button type="submit" className="px-8 py-2 bg-app-ink text-app-bg font-mono text-xs uppercase">SAVE_ASSET</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal placeholder for dedicated Pharmacy page logic if needed, 
// for now they share the Inventory state logic or we redirect
export function Pharmacy() {
    return <Inventory />
}
import { Link } from "react-router-dom";
