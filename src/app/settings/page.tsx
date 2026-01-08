'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, ArrowLeft, Building2, ChevronDown, ChevronUp, Download, Check, AlertCircle, Wallet, Pencil } from 'lucide-react';
import { DEFAULT_SETTINGS, type Settings as SettingsType } from '@/lib/types';
import { OwnerMenu } from '@/components/OwnerMenu';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userViewEnabled, setUserViewEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userViewEnabled') === 'true';
    }
    return false;
  });
  
  // Persist userViewEnabled to localStorage
  useEffect(() => {
    localStorage.setItem('userViewEnabled', String(userViewEnabled));
  }, [userViewEnabled]);
  const [nutExpanded, setNutExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [refYearExpanded, setRefYearExpanded] = useState(false);
  const [financialsExpanded, setFinancialsExpanded] = useState(false);
  const [yearStartExpanded, setYearStartExpanded] = useState(false);
  const [businessInfoExpanded, setBusinessInfoExpanded] = useState(true);
    const [refYear, setRefYear] = useState(new Date().getFullYear() - 1);
  const [refMonths, setRefMonths] = useState<Record<number, number>>({});
  const [refSaving, setRefSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS as SettingsType);
  
  // Backup state
  const [backupExpanded, setBackupExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Cash snapshot state
  const [cashSnapshotExpanded, setCashSnapshotExpanded] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  
  // Cash injections state
  const [injectionsExpanded, setInjectionsExpanded] = useState(false);
  const [injections, setInjections] = useState<Array<{ id: number; date: string; amount: number; type: string; note: string | null }>>([]);
  const [newInjectionDate, setNewInjectionDate] = useState('');
  const [newInjectionAmount, setNewInjectionAmount] = useState('');
  const [newInjectionNote, setNewInjectionNote] = useState('');
  const [newInjectionType, setNewInjectionType] = useState<'injection' | 'withdrawal' | 'owner_draw'>('injection');
  const [injectionSaving, setInjectionSaving] = useState(false);
  
  // Reference months saved confirmation
  const [refSaved, setRefSaved] = useState(false);
  
  // Auto-save cash snapshot
  const saveSnapshot = async (amount: number | null, asOf: string | null) => {
    setSnapshotSaving(true);
    setSnapshotSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, cashSnapshotAmount: amount, cashSnapshotAsOf: asOf }),
      });
      if (res.ok) {
        setSnapshotSaved(true);
        setTimeout(() => setSnapshotSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving snapshot:', error);
    } finally {
      setSnapshotSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings(userViewEnabled);
    fetchReferenceMonths(refYear, userViewEnabled);
    fetchInjections(userViewEnabled);
  }, [userViewEnabled]);
  
  // Fetch cash injections
  const fetchInjections = async (useShowcase = false) => {
    try {
      const url = useShowcase ? '/api/cash-injections?showcase=true' : '/api/cash-injections';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInjections(data);
      }
    } catch (error) {
      console.error('Error fetching injections:', error);
    }
  };
  
  // Add new injection
  const addInjection = async () => {
    if (!newInjectionDate || !newInjectionAmount) return;
    setInjectionSaving(true);
    try {
      const res = await fetch('/api/cash-injections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newInjectionDate,
          amount: parseFloat(newInjectionAmount),
          type: newInjectionType,
          note: newInjectionNote || null,
        }),
      });
      if (res.ok) {
        setNewInjectionDate('');
        setNewInjectionAmount('');
        setNewInjectionNote('');
        fetchInjections(userViewEnabled);
      }
    } catch (error) {
      console.error('Error adding injection:', error);
    } finally {
      setInjectionSaving(false);
    }
  };
  
  // Delete injection
  const deleteInjection = async (id: number) => {
    try {
      const res = await fetch(`/api/cash-injections?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInjections(userViewEnabled);
      }
    } catch (error) {
      console.error('Error deleting injection:', error);
    }
  };

  const fetchReferenceMonths = async (year: number, useShowcase = false) => {
    try {
      const url = useShowcase 
        ? `/api/reference-months?year=${year}&showcase=true` 
        : `/api/reference-months?year=${year}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const monthMap: Record<number, number> = {};
        data.forEach((m: { month: number; referenceNetSalesExTax: number }) => {
          monthMap[m.month] = m.referenceNetSalesExTax;
        });
        setRefMonths(monthMap);
      }
    } catch (error) {
      console.error('Error fetching reference months:', error);
    }
  };

  const saveReferenceMonths = async () => {
    setRefSaving(true);
    setRefSaved(false);
    try {
      const res = await fetch('/api/reference-months', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: refYear, months: refMonths }),
      });
      if (res.ok) {
        setRefSaved(true);
        setTimeout(() => setRefSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving reference months:', error);
    } finally {
      setRefSaving(false);
    }
  };

  const fetchSettings = async (useShowcase = false) => {
    try {
      const url = useShowcase ? '/api/settings?showcase=true' : '/api/settings';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setExporting(true);
    setExportStatus('idle');
    try {
      const res = await fetch(`/api/export?format=${exportFormat}`);
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `hb-health-backup.${exportFormat === 'json' ? 'json' : 'zip'}`;
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 5000);
    } finally {
      setExporting(false);
    }
  };

  // Recalculate total NUT from individual items
  const recalculateNut = (s: SettingsType) => {
    const total = (s.nutRent || 0) + (s.nutUtilities || 0) + (s.nutPhone || 0) + 
                  (s.nutInternet || 0) + (s.nutInsurance || 0) + (s.nutLoanPayment || 0) + 
                  (s.nutPayroll || 0) + (s.nutSubscriptions || 0) + (s.nutOther1 || 0) + (s.nutOther2 || 0) + (s.nutOther3 || 0);
    setSettings((prev) => ({ ...prev, monthlyFixedNut: total }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-zinc-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 transition-colors hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
              Settings
            </div>
            <OwnerMenu 
              onToggleUserView={setUserViewEnabled} 
              userViewEnabled={userViewEnabled} 
            />
          </div>
        </div>

        {/* Business Info Card */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setBusinessInfoExpanded(!businessInfoExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Business Information</h2>
            {businessInfoExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
          </button>
          {businessInfoExpanded && (
          <div className="space-y-4 p-5 border-t border-zinc-800/50">
            <div>
              <Label htmlFor="businessName" className="text-zinc-300">
                Business Name
              </Label>
              <Input
                id="businessName"
                value={settings.businessName}
                onChange={(e) => updateSetting('businessName', e.target.value)}
                className="mt-1 border-zinc-700 bg-zinc-800 text-white"
              />
            </div>
            {/* Store Info - Collapsible */}
            <div className="rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60">
              <button
                type="button"
                onClick={() => setHoursExpanded(!hoursExpanded)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="text-left">
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Store Info</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {Object.values(settings.openHoursTemplate || {}).reduce((a: number, b: number) => a + b, 0)}h/week • Closes {(settings.storeCloseHour ?? 16) === 0 ? '12 AM' : (settings.storeCloseHour ?? 16) < 12 ? `${settings.storeCloseHour} AM` : (settings.storeCloseHour ?? 16) === 12 ? '12 PM' : `${(settings.storeCloseHour ?? 16) - 12} PM`}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="text-xs">{hoursExpanded ? 'Hide' : 'Show'}</span>
                  {hoursExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              
              {hoursExpanded && (
                <div className="border-t border-zinc-700/30 p-4 space-y-4">
                  {/* Weekly Hours Grid */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Hours Open Per Day</div>
                    <div className="grid grid-cols-7 gap-2">
                      {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((day) => (
                        <div key={day} className="text-center">
                          <div className="text-[10px] uppercase text-zinc-500 mb-1">
                            {day.charAt(0).toUpperCase() + day.slice(1, 2)}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            value={settings.openHoursTemplate?.[day] ?? 0}
                            onChange={(e) => {
                              const val = Math.min(24, Math.max(0, parseInt(e.target.value) || 0));
                              updateSetting('openHoursTemplate', {
                                ...settings.openHoursTemplate,
                                [day]: val,
                              });
                            }}
                            className="h-9 w-full border-zinc-700 bg-zinc-800 text-center text-sm text-white px-1"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">0 = closed. Used for weighted pacing targets.</p>
                  </div>
                  
                  {/* Business Start Date */}
                  <div>
                    <Label htmlFor="businessStartDate" className="text-zinc-400 text-xs">
                      Business Start Date
                    </Label>
                    <Input
                      id="businessStartDate"
                      type="date"
                      value={settings.businessStartDate || ''}
                      onChange={(e) => updateSetting('businessStartDate', e.target.value || null)}
                      className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                    />
                    <p className="mt-1 text-xs text-zinc-600">Used for "Days in Business" counter</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="storeCloseHour" className="text-zinc-400 text-xs">
                        Closing Hour
                      </Label>
                      <select
                        id="storeCloseHour"
                        value={settings.storeCloseHour ?? 16}
                        onChange={(e) => updateSetting('storeCloseHour', parseInt(e.target.value))}
                        className="mt-1 w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-white"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="timezone" className="text-zinc-400 text-xs">
                        Timezone
                      </Label>
                      <select
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white"
                      >
                        <option value="America/New_York">Eastern (ET)</option>
                        <option value="America/Chicago">Central (CT)</option>
                        <option value="America/Denver">Mountain (MT)</option>
                        <option value="America/Phoenix">Arizona (MST)</option>
                        <option value="America/Los_Angeles">Pacific (PT)</option>
                        <option value="America/Anchorage">Alaska (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii (HT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}</div>

        {/* Financial Targets Card */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setFinancialsExpanded(!financialsExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Financial Targets</h2>
            {financialsExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
          </button>
          {financialsExpanded && (
          <div className="space-y-4 p-5 border-t border-zinc-800/50">
            {/* Monthly Fixed Nut - Collapsible Breakdown */}
            <div className="rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60">
              <button
                type="button"
                onClick={() => setNutExpanded(!nutExpanded)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="text-left">
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Monthly Fixed Nut</div>
                  <div className="mt-1 text-2xl font-bold text-white">
                    ${(settings.monthlyFixedNut || 0).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="text-xs">{nutExpanded ? 'Hide' : 'Show'} breakdown</span>
                  {nutExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              
              {nutExpanded && (
                <div className="border-t border-zinc-700/30 p-4">
                  <div className="mb-3 text-[10px] uppercase tracking-widest text-zinc-600">Expense Breakdown</div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Rent</Label></div>
                      <Input
                        type="number"
                        value={settings.nutRent || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutRent', val);
                          recalculateNut({ ...settings, nutRent: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Utilities</Label></div>
                      <Input
                        type="number"
                        value={settings.nutUtilities || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutUtilities', val);
                          recalculateNut({ ...settings, nutUtilities: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Phone</Label></div>
                      <Input
                        type="number"
                        value={settings.nutPhone || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutPhone', val);
                          recalculateNut({ ...settings, nutPhone: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Internet</Label></div>
                      <Input
                        type="number"
                        value={settings.nutInternet || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutInternet', val);
                          recalculateNut({ ...settings, nutInternet: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Insurance</Label></div>
                      <Input
                        type="number"
                        value={settings.nutInsurance || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutInsurance', val);
                          recalculateNut({ ...settings, nutInsurance: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Loan Payment</Label></div>
                      <Input
                        type="number"
                        value={settings.nutLoanPayment || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutLoanPayment', val);
                          recalculateNut({ ...settings, nutLoanPayment: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Payroll</Label></div>
                      <Input
                        type="number"
                        value={settings.nutPayroll || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutPayroll', val);
                          recalculateNut({ ...settings, nutPayroll: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="h-5 flex items-center"><Label className="text-xs text-zinc-400">Subscriptions</Label></div>
                      <Input
                        type="number"
                        value={settings.nutSubscriptions || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('nutSubscriptions', val);
                          recalculateNut({ ...settings, nutSubscriptions: val });
                        }}
                        className="mt-1 h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                      />
                    </div>
                    {/* Other 1 - editable label */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={settings.nutOther1Label || 'Other 1'}
                          onChange={(e) => updateSetting('nutOther1Label', e.target.value)}
                          className="h-5 flex-1 bg-transparent text-xs text-cyan-400 focus:outline-none"
                        />
                        <Pencil className="h-3 w-3 text-cyan-400/50" />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          value={settings.nutOther1 || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateSetting('nutOther1', val);
                            recalculateNut({ ...settings, nutOther1: val });
                          }}
                          className="h-9 w-24 border-zinc-700 bg-zinc-800 text-sm text-white"
                        />
                        <Input
                          type="text"
                          placeholder="Notes (e.g. bundled items)"
                          value={settings.nutOther1Note || ''}
                          onChange={(e) => updateSetting('nutOther1Note', e.target.value || null)}
                          className="h-9 flex-1 border-zinc-700 bg-zinc-800 text-xs text-zinc-400"
                        />
                      </div>
                    </div>
                    {/* Other 2 - editable label */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={settings.nutOther2Label || 'Other 2'}
                          onChange={(e) => updateSetting('nutOther2Label', e.target.value)}
                          className="h-5 flex-1 bg-transparent text-xs text-cyan-400 focus:outline-none"
                        />
                        <Pencil className="h-3 w-3 text-cyan-400/50" />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          value={settings.nutOther2 || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateSetting('nutOther2', val);
                            recalculateNut({ ...settings, nutOther2: val });
                          }}
                          className="h-9 w-24 border-zinc-700 bg-zinc-800 text-sm text-white"
                        />
                        <Input
                          type="text"
                          placeholder="Notes (e.g. bundled items)"
                          value={settings.nutOther2Note || ''}
                          onChange={(e) => updateSetting('nutOther2Note', e.target.value || null)}
                          className="h-9 flex-1 border-zinc-700 bg-zinc-800 text-xs text-zinc-400"
                        />
                      </div>
                    </div>
                    {/* Other 3 - editable label */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={settings.nutOther3Label || 'Other 3'}
                          onChange={(e) => updateSetting('nutOther3Label', e.target.value)}
                          className="h-5 flex-1 bg-transparent text-xs text-cyan-400 focus:outline-none"
                        />
                        <Pencil className="h-3 w-3 text-cyan-400/50" />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          value={settings.nutOther3 || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateSetting('nutOther3', val);
                            recalculateNut({ ...settings, nutOther3: val });
                          }}
                          className="h-9 w-24 border-zinc-700 bg-zinc-800 text-sm text-white"
                        />
                        <Input
                          type="text"
                          placeholder="Notes (e.g. bundled items)"
                          value={settings.nutOther3Note || ''}
                          onChange={(e) => updateSetting('nutOther3Note', e.target.value || null)}
                          className="h-9 flex-1 border-zinc-700 bg-zinc-800 text-xs text-zinc-400"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-700/30 bg-zinc-800/50 p-3">
                    <span className="text-xs text-zinc-500">Sum of expenses:</span>
                    <span className="font-bold text-white">
                      ${((settings.nutRent || 0) + (settings.nutUtilities || 0) + (settings.nutPhone || 0) + 
                         (settings.nutInternet || 0) + (settings.nutInsurance || 0) + (settings.nutLoanPayment || 0) + 
                         (settings.nutPayroll || 0) + (settings.nutSubscriptions || 0) + (settings.nutOther1 || 0) + (settings.nutOther2 || 0) + (settings.nutOther3 || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetCogsPct" className="text-zinc-300">
                  Target COGS %
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="targetCogsPct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.targetCogsPct}
                    onChange={(e) => updateSetting('targetCogsPct', parseFloat(e.target.value) || 0)}
                    className="border-zinc-700 bg-zinc-800 pr-8 text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    {Math.round(settings.targetCogsPct * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="targetFeesPct" className="text-zinc-300">
                  Target Fees %
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="targetFeesPct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.targetFeesPct}
                    onChange={(e) => updateSetting('targetFeesPct', parseFloat(e.target.value) || 0)}
                    className="border-zinc-700 bg-zinc-800 pr-8 text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    {Math.round(settings.targetFeesPct * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Calculated Survival Goal */}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Calculated Survival Goal</div>
              <div className="mt-1 text-2xl font-bold text-cyan-400" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.4)' }}>
                $
                {Math.round(
                  (settings.monthlyFixedNut + (settings.monthlyRoofFund || 0) + (settings.monthlyOwnerDrawGoal || 0)) /
                    (1 - settings.targetCogsPct - settings.targetFeesPct)
                ).toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Includes fixed nut, reserves, and owner draw after COGS ({Math.round(settings.targetCogsPct * 100)}%) 
                and fees ({Math.round(settings.targetFeesPct * 100)}%)
              </div>
            </div>

            {/* Monthly Goals */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-700/30">
              <div>
                <div className="h-5 flex items-center gap-1">
                  <input
                    type="text"
                    value={settings.monthlyRoofFundLabel || 'Monthly Roof Fund'}
                    onChange={(e) => updateSetting('monthlyRoofFundLabel', e.target.value)}
                    className="flex-1 bg-transparent text-xs text-cyan-400 focus:outline-none"
                  />
                  <Pencil className="h-3 w-3 text-cyan-400/50" />
                </div>
                <Input
                  id="monthlyRoofFund"
                  type="number"
                  value={settings.monthlyRoofFund || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateSetting('monthlyRoofFund', parseFloat(e.target.value) || 0)}
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                />
                <p className="mt-1 text-xs text-zinc-600">Included in survival goal</p>
              </div>
              <div>
                <div className="h-5 flex items-center">
                  <Label htmlFor="monthlyOwnerDrawGoal" className="text-zinc-300 text-xs">
                    Monthly Owner Draw Goal
                  </Label>
                </div>
                <Input
                  id="monthlyOwnerDrawGoal"
                  type="number"
                  value={settings.monthlyOwnerDrawGoal || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateSetting('monthlyOwnerDrawGoal', parseFloat(e.target.value) || 0)}
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                />
                <p className="mt-1 text-xs text-zinc-600">Included in survival goal</p>
              </div>
            </div>
          </div>
          )}</div>

        {/* Reference Year Card */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setRefYearExpanded(!refYearExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Reference Year (Last Year)</h2>
              <span className="text-xs text-zinc-600">{refYear} • ${Object.values(refMonths).reduce((a, b) => a + b, 0).toLocaleString()}</span>
            </div>
            {refYearExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
          </button>
          {refYearExpanded && (
          <div className="p-5 border-t border-zinc-800/50">
            <div className="rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60">
              <button
                type="button"
                onClick={() => setRefYearExpanded(!refYearExpanded)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="text-left">
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Monthly Totals</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {refYear} • ${Object.values(refMonths).reduce((a, b) => a + b, 0).toLocaleString()} total
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="text-xs">{refYearExpanded ? 'Hide' : 'Edit'}</span>
                  {refYearExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              
              {refYearExpanded && (
                <div className="border-t border-zinc-700/30 p-4 space-y-4">
                  {/* Year selector */}
                  <div className="flex items-center gap-3">
                    <Label className="text-zinc-400 text-xs">Year:</Label>
                    <select
                      value={refYear}
                      onChange={(e) => {
                        const yr = parseInt(e.target.value);
                        setRefYear(yr);
                        fetchReferenceMonths(yr, userViewEnabled);
                      }}
                      className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 12 month inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, idx) => (
                      <div key={idx}>
                        <div className="text-[10px] uppercase text-zinc-500 mb-1">{monthName}</div>
                        <Input
                          type="number"
                          value={refMonths[idx + 1] || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRefMonths((prev) => ({ ...prev, [idx + 1]: val }));
                          }}
                          placeholder="0"
                          className="h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={saveReferenceMonths}
                    disabled={refSaving}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg border py-2 text-sm transition-all disabled:opacity-50 ${
                      refSaved 
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300' 
                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20'
                    }`}
                  >
                    {refSaving ? 'Saving...' : refSaved ? `✓ ${refYear} Data Saved!` : `Save ${refYear} Reference Year`}
                  </button>
                  
                  <p className="text-xs text-zinc-600">
                    Enter last year's monthly net sales (ex-tax) for dashboard comparison.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}</div>

        
        {/* Cash Snapshot Section */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setCashSnapshotExpanded(!cashSnapshotExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-zinc-500" />
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Cash Snapshot</h2>
            </div>
            {cashSnapshotExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>
          
          {cashSnapshotExpanded && (
            <div className="border-t border-zinc-800/50 p-5 space-y-4">
              <div>
                <Label htmlFor="cashSnapshotAmount" className="text-zinc-300">
                  Cash on Hand ($)
                </Label>
                <Input
                  id="cashSnapshotAmount"
                  type="number"
                  value={settings.cashSnapshotAmount ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                    updateSetting('cashSnapshotAmount', val);
                  }}
                  onBlur={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                    saveSnapshot(val, settings.cashSnapshotAsOf ?? null);
                  }}
                  placeholder="e.g. 12500"
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="cashSnapshotAsOf" className="text-zinc-300">
                  As of Date (YYYY-MM-DD)
                </Label>
                <Input
                  id="cashSnapshotAsOf"
                  type="date"
                  value={settings.cashSnapshotAsOf ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value;
                    updateSetting('cashSnapshotAsOf', val);
                    // Auto-save on date change (date picker closes on select)
                    saveSnapshot(settings.cashSnapshotAmount ?? null, val);
                  }}
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white [color-scheme:dark]"
                />
              </div>
              
              {/* Summary display with save status */}
              {settings.cashSnapshotAmount !== null && settings.cashSnapshotAmount !== undefined && settings.cashSnapshotAsOf ? (
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 flex items-center justify-between">
                  <p className="text-sm text-cyan-300">
                    ${settings.cashSnapshotAmount.toLocaleString()} as of {settings.cashSnapshotAsOf}
                  </p>
                  {snapshotSaving && <span className="text-xs text-zinc-500">Saving...</span>}
                  {snapshotSaved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span>}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                  <p className="text-sm text-zinc-500">not set</p>
                </div>
              )}
              
              <p className="text-xs text-zinc-600">
                Steer the ship by feel, not forensic accounting. A quick cash check-in — no bank login needed — just a snapshot that moves the needle over time.
              </p>
            </div>
          )}
        </div>

        {/* Cash Injections Section */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setInjectionsExpanded(!injectionsExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-cyan-500" />
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Capital Flow</h2>
              {injections.length > 0 && (() => {
                const totalIn = injections.filter(i => i.type === 'injection').reduce((sum, i) => sum + i.amount, 0);
                const totalOut = injections.filter(i => i.type === 'withdrawal' || i.type === 'owner_draw').reduce((sum, i) => sum + i.amount, 0);
                const net = totalIn - totalOut;
                return (
                  <span className={`text-xs ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${Math.abs(net).toLocaleString()} {net >= 0 ? 'in' : 'out'}
                  </span>
                );
              })()}
            </div>
            {injectionsExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>
          
          {injectionsExpanded && (
            <div className="border-t border-zinc-800/50 p-5">
              {/* Two column layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Money In Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Money In</h3>
                    <span className="text-xs text-emerald-400/70">
                      ${injections.filter(i => i.type === 'injection').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {injections.filter(i => i.type === 'injection').sort((a, b) => b.date.localeCompare(a.date)).map((inj) => (
                      <div key={inj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-emerald-950/30 border border-emerald-900/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-medium text-sm">+${inj.amount.toLocaleString()}</span>
                            <span className="text-zinc-600 text-xs">{inj.date}</span>
                          </div>
                          {inj.note && <p className="text-zinc-500 text-xs truncate">{inj.note}</p>}
                        </div>
                        <button onClick={() => deleteInjection(inj.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-2">×</button>
                      </div>
                    ))}
                    {injections.filter(i => i.type === 'injection').length === 0 && (
                      <p className="text-zinc-600 text-xs py-2">No capital injections</p>
                    )}
                  </div>
                </div>
                
                {/* Money Out Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider">Money Out</h3>
                    <span className="text-xs text-red-400/70">
                      ${injections.filter(i => i.type === 'withdrawal' || i.type === 'owner_draw').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {injections.filter(i => i.type === 'withdrawal' || i.type === 'owner_draw').sort((a, b) => b.date.localeCompare(a.date)).map((inj) => (
                      <div key={inj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-red-950/30 border border-red-900/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-medium text-sm">−${inj.amount.toLocaleString()}</span>
                            <span className="text-zinc-600 text-xs">{inj.date}</span>
                          </div>
                          {inj.note && <p className="text-zinc-500 text-xs truncate">{inj.note}</p>}
                        </div>
                        <button onClick={() => deleteInjection(inj.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-2">×</button>
                      </div>
                    ))}
                    {injections.filter(i => i.type === 'withdrawal' || i.type === 'owner_draw').length === 0 && (
                      <p className="text-zinc-600 text-xs py-2">No owner draws</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Add new entry form */}
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setNewInjectionType('injection')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                      newInjectionType === 'injection' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    + Money In
                  </button>
                  <button
                    onClick={() => setNewInjectionType('owner_draw')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                      newInjectionType === 'owner_draw' || newInjectionType === 'withdrawal'
                        ? 'bg-red-600 text-white' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    − Money Out
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    type="date"
                    value={newInjectionDate}
                    onChange={(e) => setNewInjectionDate(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-white text-xs [color-scheme:dark]"
                  />
                  <Input
                    type="number"
                    value={newInjectionAmount}
                    onChange={(e) => setNewInjectionAmount(e.target.value)}
                    placeholder="Amount"
                    className="border-zinc-700 bg-zinc-800 text-white text-xs"
                  />
                  <Input
                    type="text"
                    value={newInjectionNote}
                    onChange={(e) => setNewInjectionNote(e.target.value)}
                    placeholder="Note"
                    className="border-zinc-700 bg-zinc-800 text-white text-xs"
                  />
                  <button
                    onClick={addInjection}
                    disabled={injectionSaving || !newInjectionDate || !newInjectionAmount}
                    className={`py-2 px-3 rounded disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium transition-colors ${
                      newInjectionType === 'injection' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                    }`}
                  >
                    {injectionSaving ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Year Start Cash Section */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setYearStartExpanded(!yearStartExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-violet-500" />
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Starting Cash (Year Anchor)</h2>
            </div>
            {yearStartExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
          </button>
          {yearStartExpanded && (
          <div className="px-5 pb-5 pt-0 border-t border-zinc-800/50">
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="yearStartCashAmount" className="text-zinc-300">
                  Starting Cash Balance ($)
                </Label>
                <Input
                  id="yearStartCashAmount"
                  type="number"
                  value={settings.yearStartCashAmount ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                    updateSetting('yearStartCashAmount', val);
                  }}
                  placeholder="e.g. 60000"
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="yearStartCashDate" className="text-zinc-300">
                  Year Start Date (YYYY-MM-DD)
                </Label>
                <Input
                  id="yearStartCashDate"
                  type="date"
                  value={settings.yearStartCashDate ?? ''}
                  onChange={(e) => {
                    updateSetting('yearStartCashDate', e.target.value);
                  }}
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white [color-scheme:dark]"
                />
              </div>
              
              {/* Summary display */}
              {settings.yearStartCashAmount !== null && settings.yearStartCashAmount !== undefined && settings.yearStartCashDate ? (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                  <p className="text-sm text-violet-300">
                    Starting with ${settings.yearStartCashAmount.toLocaleString()} on {settings.yearStartCashDate}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                  <p className="text-sm text-zinc-500">not set</p>
                </div>
              )}
              
              <p className="text-xs text-zinc-600">
                Sets the starting cash balance for year-over-year reference in the Liquidity dial.
              </p>
              
              {/* Emergency Floor */}
              <div className="mt-6 pt-4 border-t border-zinc-700/50">
                <Label htmlFor="operatingFloorCash" className="text-zinc-300">
                  Emergency Floor ($)
                </Label>
                <Input
                  id="operatingFloorCash"
                  type="number"
                  value={settings.operatingFloorCash ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    updateSetting('operatingFloorCash', val);
                  }}
                  placeholder="e.g. 20000"
                  className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                />
                <p className="text-xs text-zinc-600 mt-2">
                  Your &quot;don&apos;t go below&quot; amount. Burn analysis shows days until hitting this floor.
                </p>
              </div>
            </div>
          </div>
          )}</div>

        {/* Backup Section */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setBackupExpanded(!backupExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-zinc-500" />
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Backup</h2>
            </div>
            {backupExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>
          
          {backupExpanded && (
            <div className="border-t border-zinc-800/50 p-5 space-y-4">
              <div>
                <Label className="text-zinc-300 text-sm">Export Format</Label>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm transition-all ${
                      exportFormat === 'json'
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm transition-all ${
                      exportFormat === 'csv'
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    CSV (ZIP)
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  {exportFormat === 'json' 
                    ? 'Single file with all data. Best for full backup.'
                    : 'ZIP with 4 CSV files. Opens in spreadsheets.'}
                </p>
              </div>
              
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`w-full flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
                  exportStatus === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : exportStatus === 'error'
                    ? 'border-red-500/50 bg-red-500/10 text-red-300'
                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20'
                } disabled:opacity-50`}
              >
                {exporting ? (
                  'Exporting...'
                ) : exportStatus === 'success' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Backup Downloaded
                  </>
                ) : exportStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Export Failed
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Backup
                  </>
                )}
              </button>
              
              <p className="text-xs text-zinc-600">
                Exports Settings, Day Entries, Expenses, and Reference Months.
                Raw data only — no computed values.
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-4 font-light tracking-wide text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {saving ? (
            'Saving...'
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>

        {/* Vendors Link */}
        <button
          onClick={() => router.push('/vendors')}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/30 py-4 font-light tracking-wide text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-300"
        >
          <Building2 className="h-4 w-4" />
          Manage Vendors
        </button>
      </div>
    </div>
  );
}
