'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ShoppingCart,
  Receipt,
  Wrench,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Vendor {
  id: number;
  name: string;
  defaultCategory: string;
  typicalAmount: number | null;
  isRecurring: boolean;
  recurrenceRule: string;
  dueDayOfMonth: number | null;
  avgSpend: number | null;
  totalSpend: number;
  txCount: number;
}

const CATEGORIES = [
  { key: 'COGS', label: 'COGS', example: 'inventory, food cost, raw materials', icon: ShoppingCart },
  { key: 'OPEX', label: 'OPEX', example: 'rent, payroll, utilities', icon: Receipt },
  { key: 'CAPEX', label: 'CAPEX', example: 'equipment, renovations, vehicles', icon: Wrench },
  { key: 'OWNER_DRAW', label: 'Owner Draw', example: 'personal withdrawals', icon: User },
  { key: 'supplies', label: 'Supplies', example: 'cups, lids, napkins, bags', icon: ShoppingCart },
  { key: 'services', label: 'Services', example: 'IT support, cleaning, consulting', icon: Receipt },
  { key: 'utilities', label: 'Utilities', example: 'electric, gas, water, trash', icon: Receipt },
  { key: 'insurance', label: 'Insurance', example: 'liability, property, workers comp', icon: Receipt },
  { key: 'marketing', label: 'Marketing', example: 'ads, signage, promotions', icon: Receipt },
  { key: 'shipping', label: 'Shipping', example: 'freight, postage, delivery', icon: ShoppingCart },
  { key: 'maintenance', label: 'Maintenance', example: 'repairs, HVAC, plumbing', icon: Wrench },
  { key: 'fees', label: 'Fees', example: 'bank fees, processing, licenses', icon: Receipt },
];

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [userViewEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userViewEnabled') === 'true';
    }
    return false;
  });
  const [formData, setFormData] = useState({
    name: '',
    defaultCategory: '',
    typicalAmount: '',
    isRecurring: false,
    recurrenceRule: 'NONE',
    dueDayOfMonth: '',
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)));

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const url = userViewEnabled ? '/api/vendors?showcase=true' : '/api/vendors';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      defaultCategory: '',
      typicalAmount: '',
      isRecurring: false,
      recurrenceRule: 'NONE',
      dueDayOfMonth: '',
    });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      defaultCategory: vendor.defaultCategory,
      typicalAmount: vendor.typicalAmount?.toString() || '',
      isRecurring: vendor.isRecurring,
      recurrenceRule: vendor.recurrenceRule,
      dueDayOfMonth: vendor.dueDayOfMonth?.toString() || '',
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;

    try {
      const payload = {
        id: editingVendor?.id,
        name: formData.name,
        defaultCategory: formData.defaultCategory,
        typicalAmount: formData.typicalAmount ? parseFloat(formData.typicalAmount) : null,
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.recurrenceRule,
        dueDayOfMonth: formData.dueDayOfMonth ? parseInt(formData.dueDayOfMonth) : null,
      };

      const res = await fetch('/api/vendors', {
        method: editingVendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchVendors();
        setDrawerOpen(false);
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this vendor?')) return;

    try {
      await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
      setVendors(vendors.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat ? cat.icon : Receipt;
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - violet accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
            Vendors
          </div>
        </div>

        {/* Add Button */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <button
              onClick={handleOpenCreate}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-3 font-light tracking-wide text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
            >
              <Plus className="h-4 w-4" />
              Add Vendor Template
            </button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {editingVendor ? 'Edit Vendor' : 'New Vendor'}
              </SheetTitle>
              <SheetDescription>
                Create templates for frequently used vendors
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5">
              <div>
                <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Vendor Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sysco, Landlord, AT&T"
                  className="mt-2 border-zinc-700/50 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                />
              </div>

              <div>
                <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Category</Label>
                <select
                  value={formData.defaultCategory}
                  onChange={(e) => setFormData({ ...formData, defaultCategory: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-white"
                >
                  <option value="" disabled>Choose a category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.label} — {cat.example}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Usual Amount</Label>
                <Input
                  type="number"
                  value={formData.typicalAmount}
                  onChange={(e) => setFormData({ ...formData, typicalAmount: e.target.value })}
                  placeholder="e.g. 350"
                  className="mt-2 border-zinc-700/50 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                />
                <p className="mt-1 text-xs text-zinc-600">What you normally pay this vendor</p>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-3">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-cyan-500"
                />
                <Label htmlFor="isRecurring" className="text-sm text-zinc-300">
                  Recurring expense
                </Label>
              </div>

              {formData.isRecurring && (
                <>
                  <div>
                    <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Recurrence</Label>
                    <div className="mt-2 flex gap-2">
                      {['WEEKLY', 'MONTHLY'].map((rule) => (
                        <button
                          key={rule}
                          type="button"
                          onClick={() => setFormData({ ...formData, recurrenceRule: rule })}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-all ${
                            formData.recurrenceRule === rule
                              ? 'border-violet-500/50 bg-violet-500/20 text-violet-300'
                              : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {rule.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.recurrenceRule === 'MONTHLY' && (
                    <div>
                      <Label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Due Day of Month</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dueDayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dueDayOfMonth: e.target.value })}
                        placeholder="1-31"
                        className="mt-2 border-zinc-700/50 bg-zinc-800/50 text-white"
                      />
                    </div>
                  )}
                </>
              )}

              <button 
                onClick={handleSave} 
                className="mt-2 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-3 font-medium tracking-wide text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
              >
                {editingVendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Vendor List */}
        {loading ? (
          <div className="py-12 text-center text-zinc-400">Loading...</div>
        ) : vendors.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-zinc-400">No vendors yet</p>
              <p className="mt-1 text-sm text-zinc-600">
                Add vendor templates to speed up expense entry
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const categoryVendors = vendors.filter(v => v.defaultCategory === cat.key).sort((a, b) => a.name.localeCompare(b.name));
              if (categoryVendors.length === 0) return null;
              
              const isExpanded = expandedCategories.has(cat.key);
              const categoryTotal = categoryVendors.reduce((sum, v) => sum + (v.totalSpend || 0), 0);
              const CatIcon = cat.icon;
              
              return (
                <div key={cat.key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  <button
                    onClick={() => {
                      const newSet = new Set(expandedCategories);
                      isExpanded ? newSet.delete(cat.key) : newSet.add(cat.key);
                      setExpandedCategories(newSet);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                      <CatIcon className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-300">{cat.label}</span>
                      <span className="text-xs text-zinc-600">({categoryVendors.length})</span>
                    </div>
                    {categoryTotal > 0 && (
                      <span className="text-xs text-zinc-500">${categoryTotal.toLocaleString()} total</span>
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-zinc-800/50 divide-y divide-zinc-800/30">
                      {categoryVendors.map((vendor) => (
                        <div key={vendor.id} className="flex items-center justify-between px-3 py-1.5 pl-9 hover:bg-zinc-800/20">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm text-white truncate">{vendor.name}</span>
                            {vendor.isRecurring && (
                              <span className="text-[10px] text-violet-400 uppercase">{vendor.recurrenceRule}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {vendor.avgSpend ? (
                              <span className="text-xs text-emerald-400/70" title={`${vendor.txCount} tx`}>
                                avg {formatCurrency(vendor.avgSpend)}
                              </span>
                            ) : vendor.typicalAmount ? (
                              <span className="text-xs text-zinc-600">{formatCurrency(vendor.typicalAmount)}</span>
                            ) : null}
                            <button onClick={() => handleOpenEdit(vendor)} className="p-1 text-zinc-600 hover:text-white">
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(vendor.id)} className="p-1 text-zinc-600 hover:text-red-400">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
