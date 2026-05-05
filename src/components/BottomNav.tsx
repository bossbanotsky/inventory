import React from 'react';
import { Package, Send, Users, History, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

export type TabType = 'inventory' | 'receivers' | 'history' | 'reports';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-between w-full max-w-md mx-auto items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as TabType)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 h-full w-full",
                "active:scale-95 transition-transform duration-200",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-blue-50/50")} />
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
