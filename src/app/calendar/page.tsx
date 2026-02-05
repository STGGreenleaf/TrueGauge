'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  Rows3,
  Check,
  X,
  Download,
  ChevronDown,
} from 'lucide-react';
import { Nav } from '@/components/Nav';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, getDay, addWeeks, subWeeks, isSameWeek } from 'date-fns';

interface DayData {
  date: string;
  netSalesExTax: number | null;
  expenseTotal: number;
  expenseCount: number;
  lyNetSales?: number | null;
}

interface OpenHoursTemplate {
  sun: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
}

interface LYReference {
  year: number;
  month: number;
  netSales: number;
}

interface MonthData {
  days: DayData[];
  mtdNetSales: number;
  mtdExpenses: number;
  survivalGoal: number;
  survivalPercent: number;
  paceTarget: number;
  openHoursTemplate: OpenHoursTemplate;
  lyReference: LYReference | null;
  lyDays?: DayData[];
}

type ViewMode = 'month' | 'week';

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isShowcase = searchParams.get('showcase') === 'true';
  const dateParam = searchParams.get('date');
  
  // Determine initial date based on params
  const getInitialDate = () => {
    if (dateParam) {
      return new Date(dateParam + 'T12:00:00');
    }
    if (isShowcase) {
      return new Date('2025-08-08T12:00:00');
    }
    return new Date();
  };
  
  const [currentDate, setCurrentDate] = useState(getInitialDate);
  
  // Update date when URL params change
  useEffect(() => {
    setCurrentDate(getInitialDate());
  }, [dateParam, isShowcase]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [lyMonthData, setLyMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('calendarViewMode') as ViewMode) || 'month';
    }
    return 'month';
  });
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editRawCents, setEditRawCents] = useState(''); // Raw cents for auto-decimal
  const [saving, setSaving] = useState(false);
  const [showLY, setShowLY] = useState(false);
  const [showJumpTo, setShowJumpTo] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const lyMonthStr = `${year - 1}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    fetchMonthData();
  }, [monthStr, isShowcase]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const showcaseParam = isShowcase ? '&showcase=true' : '';
      const res = await fetch(`/api/calendar?month=${monthStr}${showcaseParam}`);
      if (res.ok) {
        const data = await res.json();
        setMonthData(data);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch LY data when showLY is enabled
  useEffect(() => {
    if (showLY) {
      fetchLYData();
    }
  }, [showLY, lyMonthStr]);

  const fetchLYData = async () => {
    try {
      const showcaseParam = isShowcase ? '&showcase=true' : '';
      const res = await fetch(`/api/calendar?month=${lyMonthStr}${showcaseParam}`);
      if (res.ok) {
        const data = await res.json();
        setLyMonthData(data);
      }
    } catch (error) {
      console.error('Error fetching LY data:', error);
    }
  };

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('calendarViewMode', viewMode);
  }, [viewMode]);

  // Focus input when editing
  useEffect(() => {
    if (editingDay && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingDay]);

  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(year, month - 2, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(year, month, 1));
    }
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Get days based on view mode
  const getVisibleDays = () => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const visibleDays = getVisibleDays();
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  
  // Pad start of month to align with weekday (only for month view)
  const startPadding = viewMode === 'month' ? getDay(startOfMonth(currentDate)) : 0;
  const paddedDays = viewMode === 'month' 
    ? [...Array(startPadding).fill(null), ...visibleDays]
    : visibleDays;

  const getDayData = (date: Date): DayData | null => {
    if (!monthData) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData.days.find(d => d.date === dateStr) || null;
  };

  // Hours-weighted target for a single day (same as calc.targetForDay)
  const getTargetForDay = (dateStr: string, monthGoal: number, template: OpenHoursTemplate): number => {
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
    const dayKeys: (keyof OpenHoursTemplate)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayHours = template[dayKeys[dayOfWeek]] || 0;
    
    // Calculate total hours in month
    const [y, m] = dateStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let totalHours = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(dStr + 'T12:00:00').getDay();
      totalHours += template[dayKeys[dow]] || 0;
    }
    
    if (totalHours <= 0) return 0;
    return monthGoal * (dayHours / totalHours);
  };

  const getLYDayData = (date: Date): DayData | null => {
    // Get same day of month from last year
    const lyDateStr = `${year - 1}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    // Current year date string (for hours weighting - use THIS year's day-of-week)
    const currentDateStr = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // First check for actual LY daily data
    if (lyMonthData) {
      const actualDay = lyMonthData.days.find(d => d.date === lyDateStr);
      if (actualDay && actualDay.netSalesExTax !== null) {
        return actualDay;
      }
    }
    
    // Fallback: use hours-weighted estimate from LY monthly reference
    // Use CURRENT year's day-of-week for hours (Feb 3, 2026 = Tue, not Feb 3, 2025 = Mon)
    if (monthData?.lyReference && monthData?.openHoursTemplate) {
      const estimatedSales = getTargetForDay(currentDateStr, monthData.lyReference.netSales, monthData.openHoursTemplate);
      if (estimatedSales > 0) {
        return {
          date: lyDateStr,
          netSalesExTax: estimatedSales,
          expenseTotal: 0,
          expenseCount: 0,
        };
      }
    }
    
    return null;
  };

  const getDayColor = (dayData: DayData | null): string => {
    if (!dayData || dayData.netSalesExTax === null) return 'bg-zinc-800/50';
    if (!monthData) return 'bg-zinc-800/50';
    
    const dailyGoal = monthData.survivalGoal / monthDays.length;
    const percent = (dayData.netSalesExTax / dailyGoal) * 100;
    
    if (percent >= 100) return 'bg-emerald-600/20 border-emerald-500/30';
    if (percent >= 75) return 'bg-amber-600/20 border-amber-500/30';
    return 'bg-red-600/20 border-red-500/30';
  };

  // Auto-decimal formatting helper (e.g., 77826 → 778.26)
  const formatCentsToDisplay = (cents: string): string => {
    if (!cents) return '';
    const num = parseInt(cents, 10);
    if (isNaN(num)) return '';
    return (num / 100).toFixed(2);
  };

  // Inline edit handlers
  const startEdit = (dateStr: string, currentValue: number | null) => {
    setEditingDay(dateStr);
    // Convert current value to cents string for editing
    if (currentValue !== null) {
      const cents = Math.round(currentValue * 100).toString();
      setEditRawCents(cents);
      setEditValue((currentValue).toFixed(2));
    } else {
      setEditRawCents('');
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingDay(null);
    setEditValue('');
    setEditRawCents('');
  };

  const handleEditInput = (input: string) => {
    // Only allow digits
    const digits = input.replace(/\D/g, '');
    setEditRawCents(digits);
    setEditValue(formatCentsToDisplay(digits));
  };

  const saveEdit = async () => {
    if (!editingDay) return;
    setSaving(true);
    try {
      const value = editRawCents === '' ? null : parseInt(editRawCents, 10) / 100;
      const res = await fetch('/api/day-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: editingDay, netSalesExTax: value }),
      });
      if (res.ok) {
        // Refresh data
        await fetchMonthData();
      } else {
        console.error('Save failed:', res.status, await res.text());
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
      setEditingDay(null);
      setEditValue('');
      setEditRawCents('');
    }
  };

  // Calculate running MTD total up to each day
  const getRunningMTD = (date: Date): number => {
    if (!monthData) return 0;
    const dateStr = format(date, 'yyyy-MM-dd');
    let total = 0;
    for (const day of monthData.days) {
      if (day.date <= dateStr && day.netSalesExTax !== null) {
        total += day.netSalesExTax;
      }
    }
    return total;
  };

  // Calculate pace (where we should be by this day to hit goal)
  const getPaceTarget = (dayOfMonth: number): number => {
    if (!monthData) return 0;
    return (monthData.survivalGoal / monthDays.length) * dayOfMonth;
  };

  // Export report as CSV or HTML
  const exportReport = async (scope: 'month' | 'year', format: 'csv' | 'html' = 'csv') => {
    try {
      const params = scope === 'year' 
        ? `year=${year}&format=${format}` 
        : `month=${monthStr}&format=${format}`;
      const res = await fetch(`/api/calendar/export?${params}`);
      if (res.ok) {
        if (format === 'html') {
          // Open HTML in new tab for printing
          const html = await res.text();
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(html);
            newWindow.document.close();
          }
        } else {
          // Download CSV
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = scope === 'year' 
            ? `truegauge-${year}-report.csv` 
            : `truegauge-${monthStr}-report.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <Nav showRefresh={false} />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        {/* View Mode Toggle + LY Toggle */}
        <div className="mb-6 flex items-center justify-end">
          <div className="flex items-center gap-3">
            {/* LY Comparison Toggle */}
            <button
              onClick={() => setShowLY(!showLY)}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest transition-all ${
                showLY 
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              vs LY
            </button>
            
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setViewMode('month')}
                className={`p-2 transition-all ${viewMode === 'month' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                title="Month View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setViewMode('week'); setCurrentDate(new Date()); }}
                className={`p-2 transition-all ${viewMode === 'week' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                title="Week View"
              >
                <Rows3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigator */}
        <div className="mb-6 flex items-center justify-center gap-6">
          <button
            onClick={goToPrevious}
            className="text-zinc-600 transition-colors hover:text-cyan-400"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center min-w-[200px]">
            <div className="text-2xl font-light tracking-wide text-white" style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.3)' }}>
              {viewMode === 'week' 
                ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </div>
          </div>
          <button
            onClick={goToNext}
            className="text-zinc-600 transition-colors hover:text-cyan-400"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Jump To & Export Row */}
        <div className="mb-4 flex items-center justify-center gap-4">
          {/* Jump To dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowJumpTo(!showJumpTo); setShowExport(false); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Jump to <ChevronDown className="h-3 w-3" />
            </button>
            {showJumpTo && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl min-w-[200px]">
                <div className="flex gap-2 mb-2">
                  <select
                    value={month}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      setCurrentDate(new Date(year, newMonth - 1, 1));
                    }}
                    className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => {
                      const newYear = parseInt(e.target.value);
                      setCurrentDate(new Date(newYear, month - 1, 1));
                    }}
                    className="w-20 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white text-sm"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const y = new Date().getFullYear() - 5 + i;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>
                <button
                  onClick={() => { setCurrentDate(new Date()); setShowJumpTo(false); }}
                  className="w-full text-xs text-cyan-400 hover:text-cyan-300 py-1"
                >
                  Today
                </button>
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowExport(!showExport); setShowJumpTo(false); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Export Report"
            >
              <Download className="h-4 w-4" />
            </button>
            {showExport && (
              <div className="absolute top-full right-0 mt-1 z-50 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl min-w-[160px]">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">This Month</div>
                <button
                  onClick={() => {
                    exportReport('month', 'csv');
                    setShowExport(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    exportReport('month', 'html');
                    setShowExport(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Print Report
                </button>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 mt-3 pt-2 border-t border-zinc-700">Full Year</div>
                <button
                  onClick={() => {
                    exportReport('year', 'csv');
                    setShowExport(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Download CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Month Summary with Pace Indicator */}
        {monthData && (
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-center backdrop-blur-sm">
                <div className="text-xl font-bold text-cyan-400" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.4)' }}>
                  {formatCurrency(monthData.mtdNetSales)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">MTD Sales</div>
              </div>
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-center backdrop-blur-sm">
                <div className="text-xl font-bold text-white">
                  {Math.round(monthData.survivalPercent)}%
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">of Goal</div>
              </div>
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-center backdrop-blur-sm">
                <div className="text-xl font-bold text-red-400" style={{ textShadow: '0 0 20px rgba(248, 113, 113, 0.4)' }}>
                  {formatCurrency(monthData.mtdExpenses)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">MTD Expenses</div>
              </div>
              {/* Pace indicator - uses hours-weighted target from API */}
              {(() => {
                const paceVsActual = monthData.mtdNetSales - monthData.paceTarget;
                const isAhead = paceVsActual >= 0;
                return (
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-center backdrop-blur-sm">
                    <div className={`text-xl font-bold ${isAhead ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isAhead ? '+' : ''}{formatCurrency(paceVsActual)}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">
                      {isAhead ? 'Ahead' : 'Behind'} Pace
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* LY Comparison Summary - use lyReference when lyMonthData not available */}
            {showLY && (lyMonthData || monthData.lyReference) && (() => {
              const lyTotal = lyMonthData?.mtdNetSales || monthData.lyReference?.netSales || 0;
              if (lyTotal <= 0) return null;
              const diff = monthData.mtdNetSales - lyTotal;
              const pct = Math.round(((monthData.mtdNetSales / lyTotal) - 1) * 100);
              return (
                <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                  <span>LY {lyMonthData ? 'MTD' : 'Month'}: <span className="text-violet-400">{formatCurrency(lyTotal)}</span></span>
                  <span>
                    vs LY: {' '}
                    <span className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({pct}%)
                    </span>
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Calendar Grid */}
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-2 sm:p-4 backdrop-blur-sm">
          {/* Day Headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {(viewMode === 'week' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day, i) => (
              <div
                key={`${day}-${i}`}
                className="py-1 sm:py-2 text-center text-[10px] sm:text-xs font-medium uppercase text-zinc-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {loading ? (
            <div className="py-12 text-center text-zinc-400">Loading...</div>
          ) : (
            <div className={`grid grid-cols-7 gap-1 ${viewMode === 'week' ? 'min-h-[120px]' : ''}`}>
              {paddedDays.map((day, index) => {
                if (!day) {
                  return <div key={`pad-${index}`} className={viewMode === 'week' ? 'min-h-[100px]' : 'min-h-[72px] sm:min-h-0 sm:aspect-[3/2]'} />;
                }
                
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayData = getDayData(day);
                const lyDayData = showLY ? getLYDayData(day) : null;
                const dayColor = getDayColor(dayData);
                const isCurrentDay = isToday(day);
                const isEditing = editingDay === dateStr;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`${viewMode === 'week' ? 'min-h-[100px]' : 'min-h-[72px] sm:min-h-0 sm:aspect-[3/2]'} rounded-lg border p-1 sm:p-1.5 transition-all ${dayColor} ${
                      isCurrentDay ? 'ring-2 ring-cyan-500' : 'border-zinc-700'
                    }`}
                  >
                    <div className="relative flex h-full flex-col">
                      {/* Day number + actions */}
                      <div className="flex items-start justify-between">
                        <span className={`text-[10px] font-medium ${isCurrentDay ? 'text-cyan-400' : 'text-zinc-500'}`}>
                          {format(day, 'd')}
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(dateStr, dayData?.netSalesExTax ?? null)}
                            className="text-zinc-600 hover:text-cyan-400 transition-colors p-0.5"
                            title="Quick edit"
                          >
                            <CalendarIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      
                      {/* Content area */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                            {dayData && dayData.netSalesExTax !== null ? (
                              <div className="flex flex-col items-center">
                                <button
                                  onClick={() => router.push(`/diary?date=${dateStr}`)}
                                  className="text-xs font-bold text-white hover:text-cyan-400 transition-colors"
                                >
                                  {formatCurrency(dayData.netSalesExTax)}
                                </button>
                                {dayData.expenseCount > 0 && (
                                  <div className="text-[9px] text-red-400">
                                    -{formatCurrency(dayData.expenseTotal)}
                                  </div>
                                )}
                                {/* LY comparison - purple amount below white */}
                                {showLY && lyDayData?.netSalesExTax !== null && lyDayData?.netSalesExTax !== undefined && (
                                  <div className="text-[10px] text-violet-400 font-bold">
                                    vs LY {formatCurrency(lyDayData.netSalesExTax)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => router.push(`/diary?date=${dateStr}`)}
                                className="text-xs sm:text-[10px] text-zinc-500 hover:text-cyan-400 transition-colors py-2 px-3 sm:py-0 sm:px-0"
                              >
                                + add
                              </button>
                            )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-[10px] text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded bg-emerald-600/30 border border-emerald-500/30" />
            <span>≥100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded bg-amber-600/30 border border-amber-500/30" />
            <span>75-99%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded bg-red-600/30 border border-red-500/30" />
            <span>&lt;75%</span>
          </div>
          {showLY && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded bg-violet-600/30 border border-violet-500/30" />
              <span>LY data</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Loading calendar...</div>
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}
