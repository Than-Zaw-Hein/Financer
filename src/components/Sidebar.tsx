import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  FolderTree,
  Landmark,
  BarChart3,
  Settings,
  ArrowRightLeft
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'expenses'
  | 'income'
  | 'categories'
  | 'loans'
  | 'cashflow'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'expenses' as ActiveTab,
      label: 'Expenses & Budget',
      icon: Receipt,
      badge: 'Plan',
    },
    {
      id: 'income' as ActiveTab,
      label: 'Income Tracker',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'categories' as ActiveTab,
      label: 'Categories',
      icon: FolderTree,
      badge: null,
    },
    {
      id: 'loans' as ActiveTab,
      label: 'Loans & Amortization',
      icon: Landmark,
      badge: 'Amortize',
    },
    {
      id: 'cashflow' as ActiveTab,
      label: 'Cash Flow Analysis',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings & Mobile Sync',
      icon: Settings,
      badge: 'Sync',
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 min-h-[calc(100vh-61px)] text-slate-300 select-none">
        <div className="mb-4 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Navigation Menu
        </div>

        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync Info Box */}
        <div className="mt-auto p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Mobile Android Sync</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Supports automatic REST sync with UUID deduplication and updatedAt timestamps.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-2 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[50px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
