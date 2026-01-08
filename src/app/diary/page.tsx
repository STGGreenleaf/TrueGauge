'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Calendar,
  DollarSign,
  Plus,
  ShoppingCart,
  Receipt,
  User,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { Nav } from '@/components/Nav';

interface DayEntry {
  id?: number;
  date: string;
  netSalesExTax: number | null;
  notes: string | null;
}

interface ExpenseTransaction {
  id?: number;
  date: string;
  vendorName: string;
  category: string;
  amount: number;
  memo?: string;
  spreadMonths?: number;
}

const EXPENSE_CATEGORIES = [
  { key: 'COGS', label: 'COGS (Purchase Order)', icon: ShoppingCart, color: 'bg-blue-600' },
  { key: 'OPEX', label: 'OPEX (Bill)', icon: Receipt, color: 'bg-yellow-600' },
  { key: 'OWNER_DRAW', label: 'Owner Draw', icon: User, color: 'bg-purple-600' },
  { key: 'CAPEX', label: 'CAPEX (Equipment)', icon: Wrench, color: 'bg-orange-600' },
];

function DiaryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [entry, setEntry] = useState<DayEntry>({
    date: currentDate,
    netSalesExTax: null,
    notes: null,
  });
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<ExpenseTransaction>>({
    date: currentDate,
    vendorName: '',
    category: 'COGS',
    amount: 0,
  });

  useEffect(() => {
    fetchDayData();
  }, [currentDate]);

  const fetchDayData = async () => {
    setLoading(true);
    try {
      // Fetch day entry
      const entryRes = await fetch(`/api/day-entries?date=${currentDate}`);
      if (entryRes.ok) {
        const data = await entryRes.json();
        if (data) {
          setEntry(data);
        } else {
          setEntry({ date: currentDate, netSalesExTax: null, notes: null });
        }
      }

      // Fetch expenses for this date
      const expensesRes = await fetch(`/api/expenses?month=${currentDate.substring(0, 7)}`);
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.filter((e: ExpenseTransaction) => e.date === currentDate));
      }
    } catch (error) {
      console.error('Error fetching day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    setSaving(true);
    try {
      await fetch('/api/day-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      router.push('/');
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.vendorName || !newExpense.amount) return;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          date: currentDate,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setExpenses([...expenses, saved]);
        setNewExpense({
          date: currentDate,
          vendorName: '',
          category: 'COGS',
          amount: 0,
        });
        setExpenseDrawerOpen(false);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const goToPreviousDay = () => {
    const prev = format(subDays(parseISO(currentDate), 1), 'yyyy-MM-dd');
    setCurrentDate(prev);
  };

  const goToNextDay = () => {
    const next = format(addDays(parseISO(currentDate), 1), 'yyyy-MM-dd');
    setCurrentDate(next);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const displayDate = parseISO(currentDate);
  const isToday = format(new Date(), 'yyyy-MM-dd') === currentDate;

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <Nav showRefresh={false} />

      <div className="relative z-10 mx-auto max-w-lg px-6 py-8">

        {/* Date Navigator */}
        <div className="mb-8 flex items-center justify-center gap-6">
          <button
            onClick={goToPreviousDay}
            className="text-zinc-600 transition-colors hover:text-cyan-400"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <div className="text-3xl font-light tracking-wide text-white" style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.3)' }}>
              {format(displayDate, 'EEEE')}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-zinc-500">
              {format(displayDate, 'MMMM d, yyyy')}
              {isToday && (
                <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-400">
                  Today
                </span>
              )}
            </div>
          </div>
          <button
            onClick={goToNextDay}
            className="text-zinc-600 transition-colors hover:text-cyan-400"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500">Loading...</div>
        ) : (
          <>
            {/* Net Sales Card */}
            <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
              <div className="border-b border-zinc-800/50 px-5 py-4">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  <DollarSign className="h-4 w-4 text-cyan-400" />
                  Net Sales (ex-tax)
                </div>
              </div>
              <div className="p-5">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-zinc-600">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={entry.netSalesExTax ?? ''}
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        netSalesExTax: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="h-16 border-zinc-700/50 bg-zinc-800/50 pl-10 text-3xl font-bold text-cyan-400"
                    style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.3)' }}
                  />
                </div>
                <p className="mt-3 text-[10px] text-zinc-600">
                  Use the Net Sales line from your POS daily summary
                </p>
                <button
                  onClick={handleSaveEntry}
                  disabled={saving}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-3 font-light tracking-wide text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Sales
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expense Quick Add Buttons */}
            <div className="mb-4">
              <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Add Expense
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Sheet key={cat.key} open={expenseDrawerOpen && newExpense.category === cat.key} onOpenChange={(open) => setExpenseDrawerOpen(open)}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNewExpense({ ...newExpense, category: cat.key });
                          setExpenseDrawerOpen(true);
                        }}
                        className={`h-auto flex-col gap-1 border-zinc-700 bg-zinc-800/50 py-3 text-zinc-300 hover:bg-zinc-700`}
                      >
                        <cat.icon className="h-5 w-5" />
                        <span className="text-xs">{cat.label.split(' ')[0]}</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Add {cat.label}</SheetTitle>
                        <SheetDescription>
                          Record an expense for {format(displayDate, 'MMM d, yyyy')}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-5">
                        <div>
                          <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Vendor Name</Label>
                          <Input
                            value={newExpense.vendorName || ''}
                            onChange={(e) =>
                              setNewExpense({ ...newExpense, vendorName: e.target.value })
                            }
                            placeholder="e.g., Sysco, Landlord"
                            className="mt-2 border-zinc-700/50 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Amount ($)</Label>
                          <Input
                            type="number"
                            value={newExpense.amount || ''}
                            onChange={(e) =>
                              setNewExpense({
                                ...newExpense,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                            className="mt-2 border-zinc-700/50 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Memo (optional)</Label>
                          <Input
                            value={newExpense.memo || ''}
                            onChange={(e) =>
                              setNewExpense({ ...newExpense, memo: e.target.value })
                            }
                            placeholder="Optional notes"
                            className="mt-2 border-zinc-700/50 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                          />
                        </div>
                        {(cat.key === 'COGS' || cat.key === 'CAPEX') && (
                          <div>
                            <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                              Spread for True Health
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {[
                                { value: 1, label: 'None' },
                                { value: 3, label: '3 mo' },
                                { value: 6, label: '6 mo' },
                                { value: 12, label: '12 mo' },
                                { value: -1, label: 'Thru Year' },
                              ].map((opt) => {
                                const monthsToEndOfYear = 12 - new Date().getMonth();
                                const effectiveMonths = opt.value === -1 ? monthsToEndOfYear : opt.value;
                                const isSelected = opt.value === -1 
                                  ? newExpense.spreadMonths === monthsToEndOfYear && (newExpense as any).spreadType === 'year'
                                  : (newExpense.spreadMonths === opt.value || (opt.value === 1 && !newExpense.spreadMonths));
                                return (
                                  <Button
                                    key={opt.value}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setNewExpense({
                                        ...newExpense,
                                        spreadMonths: opt.value === 1 ? undefined : effectiveMonths,
                                        spreadType: opt.value === -1 ? 'year' : undefined,
                                      } as any)
                                    }
                                    className={
                                      isSelected
                                        ? 'border-violet-500/50 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                                        : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                                    }
                                  >
                                    {opt.label}
                                  </Button>
                                );
                              })}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  max="60"
                                  placeholder="Custom"
                                  value={(newExpense as any).customSpread || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setNewExpense({
                                      ...newExpense,
                                      spreadMonths: val > 0 ? val : undefined,
                                      spreadType: 'custom',
                                      customSpread: e.target.value,
                                    } as any);
                                  }}
                                  className="h-8 w-20 border-zinc-700/50 bg-zinc-800/50 text-sm text-white placeholder:text-zinc-600"
                                />
                                <span className="text-xs text-zinc-500">mo</span>
                              </div>
                            </div>
                            {newExpense.spreadMonths && newExpense.spreadMonths > 1 && newExpense.amount && (
                              <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-purple-300">Monthly portion:</span>
                                  <span className="font-mono font-bold text-purple-200">
                                    {formatCurrency(newExpense.amount / newExpense.spreadMonths)}/mo
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-purple-400">
                                  Cash Health sees full ${newExpense.amount?.toLocaleString()} • True Health sees {newExpense.spreadMonths} mo spread
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={handleAddExpense}
                          className="mt-2 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-3 font-medium tracking-wide text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
                        >
                          Add Expense
                        </button>
                      </div>
                    </SheetContent>
                  </Sheet>
                ))}
              </div>
            </div>

            {/* Today's Expenses */}
            {expenses.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm font-medium uppercase tracking-wider text-zinc-500">
                    <span>Today&apos;s Expenses</span>
                    <span className="font-mono text-white">
                      {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {expenses.map((expense) => {
                    const cat = EXPENSE_CATEGORIES.find((c) => c.key === expense.category);
                    const isSpread = expense.spreadMonths && expense.spreadMonths > 1;
                    const monthlyPortion = isSpread ? expense.amount / expense.spreadMonths! : expense.amount;
                    return (
                      <div
                        key={expense.id}
                        className={`rounded-lg border p-3 ${
                          isSpread 
                            ? 'border-purple-500/30 bg-purple-500/5' 
                            : 'border-zinc-800 bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {cat && <cat.icon className={`h-4 w-4 ${isSpread ? 'text-purple-400' : 'text-zinc-400'}`} />}
                            <div>
                              <div className="font-medium text-white">{expense.vendorName}</div>
                              <div className="text-xs text-zinc-500">
                                {cat?.label.split(' ')[0]}
                                {expense.memo && <span className="ml-1 text-zinc-600">• {expense.memo}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-mono font-semibold text-white">
                                {formatCurrency(expense.amount)}
                              </span>
                              {isSpread && (
                                <div className="text-xs text-purple-400">
                                  ÷{expense.spreadMonths} = {formatCurrency(monthlyPortion)}/mo
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => expense.id && handleDeleteExpense(expense.id)}
                              className="h-8 w-8 text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}


export default function DiaryPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white">Loading...</div>}>
      <DiaryPageContent />
    </Suspense>
  );
}
