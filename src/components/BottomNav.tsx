import React from 'react';
import { Package, Send, Users, History, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

export type TabType = 'inventory' | 'receivers' | 'history' | 'reports' | 'itemDetail';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'receivers', label: 'Receivers', icon: Users },
    { id: 'history', label: 'History', icon: History },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ] as const;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md mx-auto">
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex justify-between items-center h-20 px-4 ring-1 ring-slate-900/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id || (currentTab === 'itemDetail' && tab.id === 'inventory');
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as TabType)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-1.5 h-16 w-full rounded-2xl transition-all duration-300",
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {isActive && (
                <div className="absolute inset-x-2 inset-y-1 bg-blue-50 rounded-2xl -z-10 animate-in zoom-in-95 duration-200" />
              )}
              <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", isActive ? "opacity-100" : "opacity-70")}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
