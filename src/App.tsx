import React, { useState } from 'react';
import { BottomNav, TabType } from './components/BottomNav';
import { InventoryView } from './views/InventoryView';
import { DisburseView } from './views/DisburseView';
import { ReceiversView } from './views/ReceiversView';
import { HistoryView } from './views/HistoryView';
import { ReportsView } from './views/ReportsView';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('inventory');

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">Inventory System</h1>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      <main className="flex-1 w-full overflow-y-auto pb-safe">
        {currentTab === 'inventory' && <InventoryView />}
        {currentTab === 'disburse' && <DisburseView />}
        {currentTab === 'receivers' && <ReceiversView />}
        {currentTab === 'history' && <HistoryView />}
        {currentTab === 'reports' && <ReportsView />}
      </main>
      
      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
    </div>
  );
}

