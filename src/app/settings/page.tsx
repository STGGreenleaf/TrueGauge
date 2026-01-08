'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Building2, ChevronDown, ChevronUp, ChevronRight, Download, Upload, Check, AlertCircle, Wallet, Pencil, Rocket, Users, Store, ChartCandlestick, CalendarRange, Aperture, ChartColumnStacked, Ruler, Landmark, Plus, X, Clock } from 'lucide-react';
import { DEFAULT_SETTINGS, type Settings as SettingsType } from '@/lib/types';
import { Nav } from '@/components/Nav';

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
  
  useEffect(() => {
    localStorage.setItem('userViewEnabled', String(userViewEnabled));
  }, [userViewEnabled]);
  
  const [nutExpanded, setNutExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [refYearExpanded, setRefYearExpanded] = useState(false);
  const [financialsExpanded, setFinancialsExpanded] = useState(false);
  const [yearStartExpanded, setYearStartExpanded] = useState(false);
  const [businessInfoExpanded, setBusinessInfoExpanded] = useState(false);
    const [refYear, setRefYear] = useState(new Date().getFullYear() - 1);
  const [refMonths, setRefMonths] = useState<Record<number, number>>({});
  const [refSaving, setRefSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS as SettingsType);
  
  // Backup state
  const [backupExpanded, setBackupExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showStartStoreModal, setShowStartStoreModal] = useState(false);
  const [startingStore, setStartingStore] = useState(false);
  
  // Cash snapshot state
  const [cashSnapshotExpanded, setCashSnapshotExpanded] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; date: string; amount: number }>>([]);
  const [showMoreSnapshotYears, setShowMoreSnapshotYears] = useState(false);
  const [expandedSnapshotYears, setExpandedSnapshotYears] = useState<Set<string>>(new Set());
  
  // Year start anchors state
  const [yearAnchors, setYearAnchors] = useState<Array<{ id: string; year: number; amount: number; date: string; note: string | null }>>([]);
  const [yearAnchorsHistoryExpanded, setYearAnchorsHistoryExpanded] = useState(false);
  
  // Cash injections state
  const [injectionsExpanded, setInjectionsExpanded] = useState(false);
  const [showMoreYearsIn, setShowMoreYearsIn] = useState(false);
  const [showMoreYearsOut, setShowMoreYearsOut] = useState(false);
  const [expandedYearsIn, setExpandedYearsIn] = useState<Set<string>>(new Set());
  const [expandedYearsOut, setExpandedYearsOut] = useState<Set<string>>(new Set());
  const [injections, setInjections] = useState<Array<{ id: number; date: string; amount: number; type: string; note: string | null }>>([]);
  const [newInjectionDate, setNewInjectionDate] = useState('');
  const [newInjectionAmount, setNewInjectionAmount] = useState('');
  const [newInjectionNote, setNewInjectionNote] = useState('');
  const [newInjectionType, setNewInjectionType] = useState<'injection' | 'withdrawal' | 'owner_draw'>('injection');
  const [injectionSaving, setInjectionSaving] = useState(false);
  
  // Reference months saved confirmation
  const [refSaved, setRefSaved] = useState(false);
  
  // Users state
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [orgUsers, setOrgUsers] = useState<Array<{ id: string; visibleId: string; email: string; name: string | null; role: string; joinedAt: string; avatarUrl: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; role: string; createdAt: string }>>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  
  // Auto-save cash snapshot (saves to history + updates settings)
  const saveSnapshot = async (amount: number | null, asOf: string | null) => {
    if (amount === null || !asOf) return;
    setSnapshotSaving(true);
    setSnapshotSaved(false);
    try {
      const res = await fetch('/api/cash-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date: asOf }),
      });
      if (res.ok) {
        setSnapshotSaved(true);
        setTimeout(() => setSnapshotSaved(false), 2000);
        fetchSnapshots(userViewEnabled);
      }
    } catch (error) {
      console.error('Error saving snapshot:', error);
    } finally {
      setSnapshotSaving(false);
    }
  };
  
  // Delete a snapshot
  const deleteSnapshot = async (id: string) => {
    try {
      const res = await fetch(`/api/cash-snapshots?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSnapshots(userViewEnabled);
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
    }
  };

  useEffect(() => {
    fetchSettings(userViewEnabled);
    fetchReferenceMonths(refYear, userViewEnabled);
    fetchInjections(userViewEnabled);
    fetchSnapshots(userViewEnabled);
    fetchYearAnchors(userViewEnabled);
  }, [userViewEnabled]);
  
  // Fetch users and invites when drawer expands
  useEffect(() => {
    if (usersExpanded) {
      if (orgUsers.length === 0) fetchUsers();
      fetchInvites();
    }
  }, [usersExpanded]);
  
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setOrgUsers(data.users || []);
        setCurrentUserId(data.currentUserId || null);
        setIsAdmin(data.isAdmin || false);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  const updateUserRole = async (visibleId: string, newRole: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleId, role: newRole }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };
  
  const removeUser = async (visibleId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return;
    try {
      const res = await fetch(`/api/users?id=${visibleId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };
  
  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/invites');
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };
  
  const sendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) return;
    setInviting(true);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail('');
        setShowInviteForm(false);
        fetchInvites();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
    } finally {
      setInviting(false);
    }
  };
  
  const cancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites?id=${inviteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvites();
      }
    } catch (error) {
      console.error('Error canceling invite:', error);
    }
  };
  
  // Fetch cash snapshots history
  const fetchSnapshots = async (useShowcase = false) => {
    try {
      const url = useShowcase ? '/api/cash-snapshots?showcase=true' : '/api/cash-snapshots';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    }
  };
  
  // Fetch year start anchors
  const fetchYearAnchors = async (useShowcase = false) => {
    try {
      const url = useShowcase ? '/api/year-start-anchors?showcase=true' : '/api/year-start-anchors';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setYearAnchors(data);
      }
    } catch (error) {
      console.error('Error fetching year anchors:', error);
    }
  };
  
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

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportStatus('idle');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, wipeFirst: false }),
      });
      
      if (!res.ok) throw new Error('Import failed');
      
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
      
      // Refresh all data
      fetchSettings(userViewEnabled);
      fetchSnapshots(userViewEnabled);
      fetchYearAnchors(userViewEnabled);
      fetchInjections(userViewEnabled);
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 5000);
    } finally {
      setImporting(false);
    }
  };

  const handleStartStore = async () => {
    setStartingStore(true);
    try {
      // Wipe all data and create fresh settings
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { 
            meta: { schemaVersion: 2 },
            settings: { businessName: 'My Store' }
          }, 
          wipeFirst: true 
        }),
      });
      
      if (!res.ok) throw new Error('Failed to start store');
      
      // Turn off demo mode
      localStorage.setItem('userViewEnabled', 'false');
      setUserViewEnabled(false);
      
      // Refresh
      window.location.reload();
    } catch (error) {
      console.error('Start store error:', error);
    } finally {
      setStartingStore(false);
      setShowStartStoreModal(false);
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

      <Nav showRefresh={false} />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-8">

        {/* Business Info Card */}
        <div className="mb-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <button
            onClick={() => setBusinessInfoExpanded(!businessInfoExpanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500"><Building2 className="h-4 w-4" />Business Information</h2>
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
                <div className="flex items-center gap-3">
                  <Store className="h-4 w-4 text-zinc-500" />
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Store Info</div>
                </div>
                {hoursExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
              </button>
              
              {hoursExpanded && (
                <div className="border-t border-zinc-700/30 p-4 space-y-4">
                  {/* Hours Summary */}
                  <div className="text-sm text-zinc-300 font-medium">
                    {Object.values(settings.openHoursTemplate || {}).reduce((a: number, b: number) => a + b, 0)}h/week • Closes {(settings.storeCloseHour ?? 16) === 0 ? '12 AM' : (settings.storeCloseHour ?? 16) < 12 ? `${settings.storeCloseHour} AM` : (settings.storeCloseHour ?? 16) === 12 ? '12 PM' : `${(settings.storeCloseHour ?? 16) - 12} PM`}
                  </div>
                  
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
            
            {/* Users Drawer */}
            <div className="rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60">
              <button
                type="button"
                onClick={() => setUsersExpanded(!usersExpanded)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-zinc-500" />
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Users</div>
                </div>
                {usersExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
              </button>
              
              {usersExpanded && (
                <div className="border-t border-zinc-700/30 p-4">
                  <div className="text-sm text-zinc-300 font-medium mb-3">
                    {orgUsers.length > 0 ? `${orgUsers.length} user${orgUsers.length > 1 ? 's' : ''} with access` : 'Who can access this store'}
                  </div>
                  
                  {orgUsers.length === 0 ? (
                    <div className="text-sm text-zinc-500 py-4 text-center">
                      Loading users...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orgUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border ${
                            user.id === currentUserId ? 'border-cyan-700/50' : 'border-zinc-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatarUrl}
                              alt={user.email}
                              className="w-9 h-9 rounded-full bg-zinc-700"
                            />
                            <div>
                              <div className="text-sm text-zinc-200 flex items-center gap-2">
                                {user.email}
                                {user.id === currentUserId && (
                                  <span className="text-[9px] text-cyan-400">(you)</span>
                                )}
                              </div>
                              {user.name && <div className="text-xs text-zinc-500">{user.name}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdmin && user.id !== currentUserId ? (
                              <>
                                <select
                                  value={user.role}
                                  onChange={(e) => updateUserRole(user.visibleId, e.target.value)}
                                  className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-zinc-700/50 text-zinc-300 border border-zinc-600/50 cursor-pointer"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                </select>
                                <button
                                  onClick={() => removeUser(user.visibleId)}
                                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors"
                                  title="Remove user"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                                user.role === 'admin' 
                                  ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-700/30' 
                                  : 'bg-zinc-700/50 text-zinc-400'
                              }`}>
                                {user.role}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pending Invites */}
                  {pendingInvites.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-700/30">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Pending Invites</div>
                      <div className="space-y-2">
                        {pendingInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-amber-900/10 border border-amber-700/20"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-500" />
                              <span className="text-sm text-zinc-300">{invite.email}</span>
                              <span className="text-[9px] uppercase text-amber-400">({invite.role})</span>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => cancelInvite(invite.id)}
                                className="text-zinc-500 hover:text-red-400 p-1"
                                title="Cancel invite"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Invite Form */}
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-zinc-700/30">
                      {showInviteForm ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-zinc-400 text-xs">Email Address</Label>
                            <Input
                              type="email"
                              placeholder="partner@email.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="mt-1 border-zinc-700 bg-zinc-800 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-400 text-xs">Role</Label>
                            <select
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                              className="mt-1 w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={sendInvite}
                              disabled={inviting || !inviteEmail}
                              className="flex-1 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
                            >
                              {inviting ? 'Sending...' : 'Send Invite'}
                            </button>
                            <button
                              onClick={() => { setShowInviteForm(false); setInviteEmail(''); }}
                              className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            When they sign in with Google, they&apos;ll automatically join this store.
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowInviteForm(true)}
                          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                        >
                          <Plus className="w-4 h-4" />
                          Invite User
                        </button>
                      )}
                    </div>
                  )}
                  
                  {!isAdmin && (
                    <p className="mt-3 text-xs text-zinc-600">
                      Users are added when they sign in with access to this organization.
                    </p>
                  )}
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
            <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500"><ChartCandlestick className="h-4 w-4 text-emerald-500" />Financial Targets</h2>
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
              <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500"><CalendarRange className="h-4 w-4 text-amber-500" />Reference Year (Last Year)</h2>
              <span className="text-xs text-zinc-600">{refYear} • ${Object.values(refMonths).reduce((a, b) => a + b, 0).toLocaleString()}</span>
            </div>
            {refYearExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
          </button>
          {refYearExpanded && (
          <div className="p-5 border-t border-zinc-800/50">
            <div className="rounded-lg border border-zinc-700/30 bg-gradient-to-b from-zinc-800/40 to-zinc-900/60">
              <div className="p-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Monthly Totals</div>
                <div className="mt-1 text-sm text-zinc-400">
                  {refYear} • ${Object.values(refMonths).reduce((a, b) => a + b, 0).toLocaleString()} total
                </div>
              </div>
              
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
              <Aperture className="h-4 w-4 text-cyan-300" />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="cashSnapshotAmount" className="text-zinc-300">
                    Cash on Hand ($)
                  </Label>
                  <span className="text-xs text-amber-400">Auto-saves</span>
                </div>
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
              
              {/* Snapshot History */}
              {snapshots.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">History</div>
                  {(() => {
                    const recent = snapshots.slice(0, 3);
                    const allYears = [...new Set(snapshots.map(s => s.date.substring(0, 4)))].sort((a, b) => b.localeCompare(a));
                    const displayYears = showMoreSnapshotYears ? allYears : allYears.slice(0, 3);
                    
                    return (
                      <div className="space-y-2">
                        {/* Recent entries */}
                        <div className="mb-2">
                          <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Recent</div>
                          {recent.map((snap, idx) => {
                            const prev = snapshots[idx + 1];
                            const diff = prev ? snap.amount - prev.amount : 0;
                            return (
                              <div key={snap.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/50 border border-zinc-700/30 mb-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-cyan-400 font-medium text-sm">${snap.amount.toLocaleString()}</span>
                                  <span className="text-zinc-600 text-xs">{snap.date}</span>
                                  {prev && diff !== 0 && (
                                    <span className={`text-xs ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {diff > 0 ? '+' : ''}${diff.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <button onClick={() => deleteSnapshot(snap.id)} className="text-zinc-600 hover:text-red-400 text-xs">×</button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Collapsible years */}
                        {displayYears.map(year => {
                          const yearItems = snapshots.filter(s => s.date.startsWith(year));
                          const isExpanded = expandedSnapshotYears.has(year);
                          return (
                            <div key={year} className="border-t border-zinc-800/30 pt-1">
                              <button
                                onClick={() => {
                                  const newSet = new Set(expandedSnapshotYears);
                                  isExpanded ? newSet.delete(year) : newSet.add(year);
                                  setExpandedSnapshotYears(newSet);
                                }}
                                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 w-full"
                              >
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {year} ({yearItems.length})
                              </button>
                              {isExpanded && yearItems.map((snap, idx) => {
                                const allIdx = snapshots.findIndex(s => s.id === snap.id);
                                const prev = snapshots[allIdx + 1];
                                const diff = prev ? snap.amount - prev.amount : 0;
                                return (
                                  <div key={snap.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/50 border border-zinc-700/30 mb-1 ml-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-cyan-400 font-medium text-sm">${snap.amount.toLocaleString()}</span>
                                      <span className="text-zinc-600 text-xs">{snap.date.substring(5)}</span>
                                      {prev && diff !== 0 && (
                                        <span className={`text-xs ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {diff > 0 ? '+' : ''}${diff.toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                    <button onClick={() => deleteSnapshot(snap.id)} className="text-zinc-600 hover:text-red-400 text-xs">×</button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        
                        {allYears.length > 3 && (
                          <button onClick={() => setShowMoreSnapshotYears(!showMoreSnapshotYears)} className="text-xs text-cyan-400/70 hover:text-cyan-400">
                            {showMoreSnapshotYears ? 'Show less years' : `Show more years (${allYears.length - 3})`}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
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
              <ChartColumnStacked className="h-4 w-4 text-cyan-500" />
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
                  <div className="space-y-2">
                    {(() => {
                      const moneyIn = injections.filter(i => i.type === 'injection').sort((a, b) => b.date.localeCompare(a.date));
                      const recent = moneyIn.slice(0, 3);
                      const allYears = [...new Set(moneyIn.map(i => i.date.substring(0, 4)))].sort((a, b) => b.localeCompare(a));
                      const displayYears = showMoreYearsIn ? allYears : allYears.slice(0, 3);
                      
                      return moneyIn.length > 0 ? (
                        <>
                          {/* Recent entries */}
                          {recent.length > 0 && (
                            <div className="mb-2">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Recent</div>
                              {recent.map(inj => (
                                <div key={inj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-emerald-950/30 border border-emerald-900/30 mb-1">
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
                            </div>
                          )}
                          {/* Collapsible years */}
                          {displayYears.map(year => {
                            const yearItems = moneyIn.filter(i => i.date.startsWith(year));
                            const isExpanded = expandedYearsIn.has(year);
                            return (
                              <div key={year} className="border-t border-zinc-800/30 pt-1">
                                <button
                                  onClick={() => {
                                    const newSet = new Set(expandedYearsIn);
                                    isExpanded ? newSet.delete(year) : newSet.add(year);
                                    setExpandedYearsIn(newSet);
                                  }}
                                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 w-full"
                                >
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  {year} ({yearItems.length})
                                </button>
                                {isExpanded && yearItems.map(inj => (
                                  <div key={inj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-emerald-950/30 border border-emerald-900/30 mb-1 ml-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-emerald-400 font-medium text-sm">+${inj.amount.toLocaleString()}</span>
                                        <span className="text-zinc-600 text-xs">{inj.date.substring(5)}</span>
                                      </div>
                                      {inj.note && <p className="text-zinc-500 text-xs truncate">{inj.note}</p>}
                                    </div>
                                    <button onClick={() => deleteInjection(inj.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-2">×</button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          {allYears.length > 3 && (
                            <button onClick={() => setShowMoreYearsIn(!showMoreYearsIn)} className="text-xs text-emerald-400/70 hover:text-emerald-400">
                              {showMoreYearsIn ? 'Show less years' : `Show more years (${allYears.length - 3})`}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-zinc-600 text-xs py-2">No capital injections</p>
                      );
                    })()}
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
                  <div className="space-y-2">
                    {(() => {
                      const moneyOut = injections.filter(i => i.type === 'withdrawal' || i.type === 'owner_draw').sort((a, b) => b.date.localeCompare(a.date));
                      const recent = moneyOut.slice(0, 3);
                      const allYears = [...new Set(moneyOut.map(i => i.date.substring(0, 4)))].sort((a, b) => b.localeCompare(a));
                      const displayYears = showMoreYearsOut ? allYears : allYears.slice(0, 3);
                      
                      return moneyOut.length > 0 ? (
                        <>
                          {/* Recent entries */}
                          {recent.length > 0 && (
                            <div className="mb-2">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Recent</div>
                              {recent.map(inj => (
                                <div key={inj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-red-950/30 border border-red-900/30 mb-1">
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
                            </div>
                          )}
                          {/* Collapsible years */}
                          {displayYears.map(year => {
                            const yearItems = moneyOut.filter(i => i.date.startsWith(year));
                            const isExpanded = expandedYearsOut.has(year);
                            return (
                              <div key={year} className="border-t border-zinc-800/30 pt-1">
                                <button
                                  onClick={() => {
                                    const newSet = new Set(expandedYearsOut);
                                    isExpanded ? newSet.delete(year) : newSet.add(year);
                                    setExpandedYearsOut(newSet);
                                  }}
                                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 w-full"
                                >
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  {year} ({yearItems.length})
                                </button>
                                {isExpanded && yearItems.map(inj => (
                                  <div key={inj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-red-950/30 border border-red-900/30 mb-1 ml-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-red-400 font-medium text-sm">−${inj.amount.toLocaleString()}</span>
                                        <span className="text-zinc-600 text-xs">{inj.date.substring(5)}</span>
                                      </div>
                                      {inj.note && <p className="text-zinc-500 text-xs truncate">{inj.note}</p>}
                                    </div>
                                    <button onClick={() => deleteInjection(inj.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-2">×</button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          {allYears.length > 3 && (
                            <button onClick={() => setShowMoreYearsOut(!showMoreYearsOut)} className="text-xs text-red-400/70 hover:text-red-400">
                              {showMoreYearsOut ? 'Show less years' : `Show more years (${allYears.length - 3})`}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-zinc-600 text-xs py-2">No owner draws</p>
                      );
                    })()}
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
              <Ruler className="h-4 w-4 text-violet-500" />
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
                Set your opening cash balance for the year. This anchors the Liquidity dial — showing how far you've come since day one of the fiscal year.
              </p>
              
              {/* Year Anchors History - Collapsible */}
              {yearAnchors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                  <button
                    onClick={() => setYearAnchorsHistoryExpanded(!yearAnchorsHistoryExpanded)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Year History ({yearAnchors.length})</div>
                    {yearAnchorsHistoryExpanded ? <ChevronUp className="h-3 w-3 text-zinc-500" /> : <ChevronDown className="h-3 w-3 text-zinc-500" />}
                  </button>
                  {yearAnchorsHistoryExpanded && (
                    <div className="space-y-1 mt-2">
                      {yearAnchors.map((anchor, idx) => {
                        const prev = yearAnchors[idx + 1];
                        const diff = prev ? anchor.amount - prev.amount : 0;
                        return (
                          <div key={anchor.id} className="py-2 px-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-900/5 border border-violet-500/20 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                            <div className="flex items-center justify-between relative">
                              <div className="flex items-center gap-3">
                                <span className="text-violet-300 font-bold">{anchor.year}</span>
                                <span className="text-violet-200/80 font-medium">${anchor.amount.toLocaleString()}</span>
                                <span className="text-zinc-500 text-xs">{anchor.date}</span>
                                {prev && diff !== 0 && (
                                  <span className={`text-xs ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {diff > 0 ? '+' : ''}${diff.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {anchor.note && <p className="text-violet-300/50 text-xs mt-1 italic relative">{anchor.note}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
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
                  The safety net — enough to cover exit strategy. e.g. moving costs, storage, and a graceful transition if needed. Burn analysis shows days until hitting this floor.
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
                    ? 'Complete backup — all data in one portable file.'
                    : 'ZIP with 8 CSV files. Opens in spreadsheets.'}
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
              
              {/* Import Section */}
              <div className="pt-4 border-t border-zinc-800/50">
                <Label className="text-zinc-300 text-sm">Import Backup</Label>
                <p className="text-xs text-zinc-600 mt-1 mb-2">
                  Load a JSON backup to restore your data. Merges with existing data.
                </p>
                <label className={`w-full flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all cursor-pointer ${
                  importStatus === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : importStatus === 'error'
                    ? 'border-red-500/50 bg-red-500/10 text-red-300'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                } ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImport(file);
                      e.target.value = '';
                    }}
                    disabled={importing}
                  />
                  {importing ? (
                    'Importing...'
                  ) : importStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Import Complete
                    </>
                  ) : importStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Import Failed
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Choose JSON File
                    </>
                  )}
                </label>
              </div>
              
              <p className="text-xs text-zinc-600">
                Exports everything: Settings, Sales, Expenses, Cash Snapshots, Year Anchors, Capital Flow, Vendors.
              </p>
              
              {/* Start Your Store - Demo mode only */}
              {userViewEnabled && (
                <div className="pt-4 border-t border-zinc-800/50">
                  <button
                    onClick={() => setShowStartStoreModal(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-medium text-emerald-300 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/20"
                  >
                    <Rocket className="h-4 w-4" />
                    Start Your Store
                  </button>
                  <p className="text-xs text-zinc-600 mt-2">
                    Ready to build your own? This wipes the demo and starts fresh with your store.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Start Your Store Modal */}
        {showStartStoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-red-500/30 bg-zinc-900 p-6 shadow-2xl">
              <h3 className="text-lg font-medium text-white mb-2">Start Your Store</h3>
              <p className="text-sm text-zinc-400 mb-4">
                This will <span className="text-red-400 font-medium">permanently delete</span> all demo data and create a fresh, empty store for you to build.
              </p>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
                <p className="text-xs text-amber-300">
                  ⚠️ No going back — demo data will be gone forever. You&apos;ll start with a clean slate and work your way down this settings page to configure your store.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartStoreModal(false)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartStore}
                  disabled={startingStore}
                  className="flex-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {startingStore ? 'Starting...' : 'Start Fresh'}
                </button>
              </div>
            </div>
          </div>
        )}

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
          <Landmark className="h-4 w-4" />
          Manage Vendors
        </button>
      </div>
    </div>
  );
}
