import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Smartphone,
  Download,
  Upload,
  Save,
  CheckCircle,
  Code,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';
import { SyncResponse } from '../types';
import { formatMMK } from '../lib/formatters';

interface SettingsViewProps {
  currency: string;
  startingBalance: number;
  onUpdateSettings: (newCurrency: string, newStartingBalance: number) => void;
  onResetSeedData?: () => void;
  onTriggerSync: (payload?: any) => Promise<SyncResponse | null>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currency,
  startingBalance,
  onUpdateSettings,
  onResetSeedData,
  onTriggerSync,
}) => {
  const [curr, setCurr] = useState(currency);
  const [startBal, setStartBal] = useState(startingBalance.toString());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResponse | null>(null);
  const [sampleJsonPayload, setSampleJsonPayload] = useState<string>(
    JSON.stringify(
      {
        categories: [
          {
            name: 'Pawn / Gold Savings',
            icon: '🪙',
            color: '#F59E0B',
            isPlanBudget: true,
            budgetAmount: 300000,
            uuid: 'mobile-cat-uuid-001',
            updatedAt: Date.now(),
          },
        ],
        expenses: [
          {
            name: 'Mobile App Paw San Rice Purchase',
            amount: 150000,
            category: 'Rice & Staples',
            date: Date.now(),
            method: 'kpay',
            note: 'Purchased via Android Mobile App',
            uuid: 'mobile-exp-uuid-999',
            updatedAt: Date.now(),
          },
        ],
        income: [
          {
            amount: 800000,
            date: Date.now(),
            uuid: 'mobile-inc-uuid-888',
            updatedAt: Date.now(),
            note: 'Freelance Mobile Client',
          },
        ],
        deletedExpenseUuids: [],
        deletedCategoryUuids: [],
        deletedIncomeUuids: [],
      },
      null,
      2
    )
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(startBal) || 0;
    onUpdateSettings(curr, parsed);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRunSyncSimulation = async () => {
    setIsSimulating(true);
    try {
      const parsedPayload = JSON.parse(sampleJsonPayload);
      const res = await onTriggerSync(parsedPayload);
      setLastSyncResult(res);
    } catch (err: any) {
      alert('Invalid JSON Payload: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      currency,
      startingBalance,
      exportVersion: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyFinance_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Settings & Mobile Sync Debugger</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure system currency, initial cash reserve, and simulate Kotlin Room REST API sync.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <SettingsIcon className="w-4 h-4 text-blue-400" />
            <span>General Preferences</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Unit</label>
              <select
                value={curr}
                onChange={(e) => setCurr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="MMK">MMK (Myanmar Kyat - Ks)</option>
                <option value="USD">USD ($)</option>
                <option value="THB">THB (฿)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Starting Cash Balance ({curr})
              </label>
              <input
                type="number"
                value={startBal}
                onChange={(e) => setStartBal(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used in Available Cash formula: <span className="text-slate-300 font-mono">Available = Starting + Received - Expenses</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Settings Saved
                </span>
              )}
              <button
                type="submit"
                className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>

          {/* Backup Section */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <h4 className="font-semibold text-xs text-slate-300">Data Backup</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export JSON Backup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Android Sync Simulator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Mobile Sync Payload Tester</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">
              POST /api/sync
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Simulate a mobile push sync from Kotlin / Room database. Tests UUID conflict resolution and timestamp ordering.
          </p>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Sample Sync JSON Request Payload
            </label>
            <textarea
              value={sampleJsonPayload}
              onChange={(e) => setSampleJsonPayload(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 font-mono text-[11px] text-emerald-300 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleRunSyncSimulation}
            disabled={isSimulating}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowRightLeft className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Processing Sync Request...' : 'Simulate POST /api/sync Request'}</span>
          </button>

          {/* Sync Response Log Display */}
          {lastSyncResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Sync Successful
                </span>
                <span>
                  Synced: {lastSyncResult.synced.categories} Cat, {lastSyncResult.synced.expenses} Exp, {lastSyncResult.synced.income} Inc
                </span>
              </div>

              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                Active server datasets updated for current month ({lastSyncResult.serverData.month}/{lastSyncResult.serverData.year}).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
