import React, { useState } from 'react';
import { BottomNav, TabType } from './components/BottomNav';
import { useInventoryStore } from './lib/store';
import { InventoryView } from './views/InventoryView';
import { ReceiversView } from './views/ReceiversView';
import { HistoryView } from './views/HistoryView';
import { ReportsView } from './views/ReportsView';
import { ItemDetailView } from './views/ItemDetailView';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';

export default function App() {
  const currentTab = useInventoryStore(state => state.activeTab);
  const setCurrentTab = useInventoryStore(state => state.setActiveTab);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
            <span className="text-white text-[10px] font-black tracking-tighter italic">IS</span>
          </div>
          <h1 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">System Core</h1>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 px-3 py-2 rounded-xl transition-all border border-transparent hover:border-red-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      <main className="flex-1 w-full overflow-y-auto px-4 pb-32 pt-6">
        <div className="max-w-xl mx-auto">
          {currentTab === 'inventory' && <InventoryView />}
          {currentTab === 'receivers' && <ReceiversView />}
          {currentTab === 'history' && <HistoryView />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'itemDetail' && <ItemDetailView />}
        </div>
      </main>
      
      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
    </div>
  );
}

