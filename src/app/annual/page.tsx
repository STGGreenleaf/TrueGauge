'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Download,
} from 'lucide-react';

interface MonthSummary {
  month: number;
  monthName: string;
  netSales: number;
  cogs: number;
  opex: number;
  capex: number;
  ownerDraw: number;
  survivalGoal: number;
  survivalPercent: number;
  cashResult: number;
}

interface AnnualData {
  year: number;
  months: MonthSummary[];
  ytd: {
    netSales: number;
    cogs: number;
    opex: number;
    capex: number;
    ownerDraw: number;
    survivalGoal: number;
    survivalPercent: number;
    cashResult: number;
  };
}

export default function AnnualPage() {
  const router = useRouter();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<AnnualData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnualData();
  }, [year]);

  const fetchAnnualData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/annual?year=${year}`);
      if (res.ok) {
        const annualData = await res.json();
        setData(annualData);
      }
    } catch (error) {
      console.error('Error fetching annual data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.open('/api/export', '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return formatCurrency(value);
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 100) return 'text-green-400';
    if (percent >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getResultColor = (result: number) => {
    if (result >= 0) return 'text-green-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={handleExport}
            className="text-zinc-500 transition-colors hover:text-cyan-400"
            title="Export CSV"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>

        {/* Year Navigator */}
        <div className="mb-8 flex items-center justify-center gap-6">
          <button
            onClick={() => setYear(year - 1)}
            className="text-zinc-600 transition-colors hover:text-cyan-400"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <div className="text-4xl font-light tracking-wide text-white" style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.3)' }}>{year}</div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">Annual Summary</div>
          </div>
          <button
            onClick={() => setYear(year + 1)}
            className="text-zinc-600 transition-colors hover:text-cyan-400"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500">Loading...</div>
        ) : data ? (
          <>
            {/* YTD Summary Cards */}
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-cyan-400" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.4)' }}>
                  {formatCurrency(data.ytd.netSales)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">YTD Sales</div>
              </div>
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 text-center backdrop-blur-sm">
                <div className={`text-2xl font-bold ${getPercentColor(data.ytd.survivalPercent)}`} style={{ textShadow: '0 0 20px currentColor' }}>
                  {Math.round(data.ytd.survivalPercent)}%
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">of YTD Goal</div>
              </div>
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-red-400" style={{ textShadow: '0 0 20px rgba(248, 113, 113, 0.4)' }}>
                  {formatCurrency(data.ytd.cogs + data.ytd.opex)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">YTD Expenses</div>
              </div>
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 text-center backdrop-blur-sm">
                <div className={`flex items-center justify-center gap-1 text-2xl font-bold ${getResultColor(data.ytd.cashResult)}`} style={{ textShadow: '0 0 20px currentColor' }}>
                  {data.ytd.cashResult >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {formatCurrency(Math.abs(data.ytd.cashResult))}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">YTD Result</div>
              </div>
            </div>

            {/* Monthly Table */}
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
              <div className="border-b border-zinc-800/50 px-6 py-4">
                <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Monthly Breakdown
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-zinc-500">
                        <th className="pb-3 font-medium">Month</th>
                        <th className="pb-3 text-right font-medium">Sales</th>
                        <th className="pb-3 text-right font-medium">COGS</th>
                        <th className="pb-3 text-right font-medium">OPEX</th>
                        <th className="pb-3 text-right font-medium">Goal %</th>
                        <th className="pb-3 text-right font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.months.map((month) => (
                        <tr
                          key={month.month}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <td className="py-3 font-medium text-white">
                            {month.monthName.substring(0, 3)}
                          </td>
                          <td className="py-3 text-right font-mono text-green-400">
                            {month.netSales > 0 ? formatCompact(month.netSales) : '-'}
                          </td>
                          <td className="py-3 text-right font-mono text-zinc-400">
                            {month.cogs > 0 ? formatCompact(month.cogs) : '-'}
                          </td>
                          <td className="py-3 text-right font-mono text-zinc-400">
                            {month.opex > 0 ? formatCompact(month.opex) : '-'}
                          </td>
                          <td className={`py-3 text-right font-mono ${getPercentColor(month.survivalPercent)}`}>
                            {month.netSales > 0 ? `${Math.round(month.survivalPercent)}%` : '-'}
                          </td>
                          <td className={`py-3 text-right font-mono ${getResultColor(month.cashResult)}`}>
                            {month.netSales > 0 ? formatCompact(month.cashResult) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-700 font-bold">
                        <td className="pt-3 text-white">TOTAL</td>
                        <td className="pt-3 text-right font-mono text-green-400">
                          {formatCompact(data.ytd.netSales)}
                        </td>
                        <td className="pt-3 text-right font-mono text-zinc-300">
                          {formatCompact(data.ytd.cogs)}
                        </td>
                        <td className="pt-3 text-right font-mono text-zinc-300">
                          {formatCompact(data.ytd.opex)}
                        </td>
                        <td className={`pt-3 text-right font-mono ${getPercentColor(data.ytd.survivalPercent)}`}>
                          {Math.round(data.ytd.survivalPercent)}%
                        </td>
                        <td className={`pt-3 text-right font-mono ${getResultColor(data.ytd.cashResult)}`}>
                          {formatCompact(data.ytd.cashResult)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-zinc-500">No data available</div>
        )}
      </div>
    </div>
  );
}
