import React from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { CashFlowMonth } from '../types';
import { formatMMK, formatCompactMMK } from '../lib/formatters';

interface CashFlowViewProps {
  cashFlowData: CashFlowMonth[];
  currency: string;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({ cashFlowData, currency }) => {
  const avgIncome = cashFlowData.length > 0
    ? cashFlowData.reduce((sum, m) => sum + m.income, 0) / cashFlowData.length
    : 0;

  const avgExpenses = cashFlowData.length > 0
    ? cashFlowData.reduce((sum, m) => sum + m.expenses, 0) / cashFlowData.length
    : 0;

  const avgSurplus = avgIncome - avgExpenses;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">12-Month Cash Flow & Trend Analysis</h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical monthly breakdown of income vs expenses and cumulative liquidity growth in {currency}.
          </p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Monthly Inflow</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
            {formatMMK(avgIncome, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">12-month rolling income average</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Monthly Burn Rate</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-400">
            {formatMMK(avgExpenses, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">12-month rolling expense average</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Monthly Savings</span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-400">
            {formatMMK(avgSurplus, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Net monthly surplus reinvestment capacity</p>
        </div>
      </div>

      {/* Income vs Expense Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span>Monthly Income vs Expenses Breakdown</span>
        </h3>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickFormatter={(val) => formatCompactMMK(val, currency)}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                formatter={(val: any) => [formatMMK(val, currency)]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative Cash Growth Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Cumulative Cash Balance Projection</span>
        </h3>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickFormatter={(val) => formatCompactMMK(val, currency)}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                formatter={(val: any) => [formatMMK(val, currency), 'Cumulative Cash']}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCash"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCash)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white">Monthly Statement Log</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Total Income</th>
                <th className="py-3 px-3">Total Expenses</th>
                <th className="py-3 px-3">Net Surplus</th>
                <th className="py-3 px-3 text-right">Cumulative Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {cashFlowData.map((row) => (
                <tr key={row.monthName} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-white">{row.monthName}</td>
                  <td className="py-3.5 px-3 text-emerald-400">{formatMMK(row.income, currency)}</td>
                  <td className="py-3.5 px-3 text-rose-400">{formatMMK(row.expenses, currency)}</td>
                  <td
                    className={`py-3.5 px-3 font-bold ${
                      row.surplus >= 0 ? 'text-indigo-400' : 'text-rose-400'
                    }`}
                  >
                    {formatMMK(row.surplus, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-200">
                    {formatMMK(row.cumulativeCash, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
