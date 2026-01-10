'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Nav } from '@/components/Nav';
import { Button } from '@/components/ui/button';
import { 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Share2, 
  Square,
  Copy,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  Download,
  Trash2,
  Star,
  Plus
} from 'lucide-react';

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

interface ColorSwatch {
  name: string;
  variable: string;
  hex: string;
  usage: string;
}

const brandColors: ColorSwatch[] = [
  { name: 'Cyan Primary', variable: '--cyan-400', hex: '#22d3ee', usage: 'Primary actions, highlights, gauges' },
  { name: 'Cyan Glow', variable: '--cyan-500', hex: '#06b6d4', usage: 'Hover states, emphasis' },
  { name: 'Violet Accent', variable: '--violet-500', hex: '#8b5cf6', usage: 'Owner mode, premium features' },
  { name: 'Zinc 900', variable: '--zinc-900', hex: '#18181b', usage: 'Card backgrounds' },
  { name: 'Zinc 800', variable: '--zinc-800', hex: '#27272a', usage: 'Borders, secondary bg' },
  { name: 'Zinc 400', variable: '--zinc-400', hex: '#a1a1aa', usage: 'Body text' },
  { name: 'Zinc 500', variable: '--zinc-500', hex: '#71717a', usage: 'Muted text, labels' },
  { name: 'Black', variable: '--black', hex: '#000000', usage: 'Page background' },
  { name: 'White', variable: '--white', hex: '#ffffff', usage: 'Headings, emphasis' },
  { name: 'Red Alert', variable: '--red-500', hex: '#ef4444', usage: 'Negative values, warnings' },
  { name: 'Green Success', variable: '--green-500', hex: '#22c55e', usage: 'Positive values, success' },
  { name: 'Amber Caution', variable: '--amber-500', hex: '#f59e0b', usage: 'Caution, estimates' },
];

export default function BrandGuidelinesPage() {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  // Collapsible sections - persist state in localStorage
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brandDrawerState');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  // Social card editable text
  const [ogTitle, setOgTitle] = useState('TrueGauge - Precision Business Health');
  const [ogDescription, setOgDescription] = useState('Your instrument panel for business clarity');
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialSaved, setSocialSaved] = useState(false);
  
  // Saved variations (up to 3)
  interface SavedVariation {
    id: string;
    title: string;
    description: string;
    image: string | null;
    thumbnail: string | null;
    isMain: boolean;
  }
  const [savedVariations, setSavedVariations] = useState<SavedVariation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ogVariations');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const saveCurrentAsVariation = async () => {
    if (savedVariations.length >= 3) {
      alert('Maximum 3 variations. Delete one to add more.');
      return;
    }
    
    // Capture thumbnail
    let thumbnail: string | null = null;
    const previewEl = document.getElementById('og-preview');
    if (previewEl) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(previewEl, {
          backgroundColor: '#000',
          scale: 0.5,
          useCORS: true,
          allowTaint: true,
        });
        thumbnail = canvas.toDataURL('image/png');
      } catch (e) {
        console.error('Failed to capture thumbnail:', e);
      }
    }
    
    const newVariation: SavedVariation = {
      id: Date.now().toString(),
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      thumbnail,
      isMain: savedVariations.length === 0,
    };
    const updated = [...savedVariations, newVariation];
    setSavedVariations(updated);
    localStorage.setItem('ogVariations', JSON.stringify(updated));
  };
  
  const setAsMain = (id: string) => {
    const updated = savedVariations.map(v => ({ ...v, isMain: v.id === id }));
    setSavedVariations(updated);
    localStorage.setItem('ogVariations', JSON.stringify(updated));
    // Load this variation into the editor
    const variation = savedVariations.find(v => v.id === id);
    if (variation) {
      setOgTitle(variation.title);
      setOgDescription(variation.description);
      setOgImage(variation.image);
    }
  };
  
  const deleteVariation = (id: string) => {
    const updated = savedVariations.filter(v => v.id !== id);
    // If we deleted the main one, make the first remaining one main
    if (updated.length > 0 && !updated.some(v => v.isMain)) {
      updated[0].isMain = true;
    }
    setSavedVariations(updated);
    localStorage.setItem('ogVariations', JSON.stringify(updated));
  };
  
  // SEO settings
  const [seoTitle, setSeoTitle] = useState('TrueGauge');
  const [seoDescription, setSeoDescription] = useState('Business health dashboard for smart operators');
  const [seoKeywords, setSeoKeywords] = useState('business dashboard, financial health, business analytics, cash flow');
  const [robotsIndex, setRobotsIndex] = useState(true);
  const [robotsFollow, setRobotsFollow] = useState(true);
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(false);
  
  // Export preview - render to canvas manually for perfect output
  const exportPreview = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#18181b');
    gradient.addColorStop(0.5, '#000000');
    gradient.addColorStop(1, '#18181b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // Load and draw icon
    const icon = new window.Image();
    icon.crossOrigin = 'anonymous';
    icon.src = '/truegauge_icon.png';
    
    await new Promise((resolve) => {
      icon.onload = resolve;
      icon.onerror = resolve;
    });
    
    // Draw icon centered, slightly above middle
    const iconSize = 240;
    const iconX = (1200 - iconSize) / 2;
    const iconY = 120;
    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
    
    // Draw text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 96px system-ui, -apple-system, sans-serif';
    
    // "TRUE" in cyan
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = 'rgba(34, 211, 238, 0.5)';
    ctx.shadowBlur = 40;
    ctx.fillText('TRUE', 480, 480);
    
    // "GAUGE" in light gray
    ctx.fillStyle = '#d4d4d8';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.font = '300 96px system-ui, -apple-system, sans-serif';
    ctx.fillText('GAUGE', 780, 480);
    
    // Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'truegauge-social-preview.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Load brand config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/brand');
        if (res.ok) {
          const config = await res.json();
          setOgTitle(config.ogTitle || '');
          setOgDescription(config.ogDescription || '');
          setOgImage(config.ogImage || null);
          setSeoTitle(config.seoTitle || '');
          setSeoDescription(config.seoDescription || '');
          setSeoKeywords(config.seoKeywords?.join(', ') || '');
          setRobotsIndex(config.robotsIndex ?? true);
          setRobotsFollow(config.robotsFollow ?? true);
        }
      } catch (error) {
        console.error('Failed to load brand config:', error);
      }
    };
    loadConfig();
  }, []);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOgImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      localStorage.setItem('brandDrawerState', JSON.stringify(newState));
      return newState;
    });
  };
  
  const saveSocialSettings = async () => {
    setSocialSaving(true);
    try {
      const res = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ogTitle,
          ogDescription,
          ogImage,
          seoTitle,
          seoDescription,
          seoKeywords: seoKeywords.split(',').map(k => k.trim()).filter(Boolean),
          robotsIndex,
          robotsFollow,
        }),
      });
      if (res.ok) {
        setSocialSaved(true);
        setTimeout(() => setSocialSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSocialSaving(false);
    }
  };
  
  const saveSeoSettings = async () => {
    setSeoSaving(true);
    try {
      const res = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ogTitle,
          ogDescription,
          ogImage,
          seoTitle,
          seoDescription,
          seoKeywords: seoKeywords.split(',').map(k => k.trim()).filter(Boolean),
          robotsIndex,
          robotsFollow,
        }),
      });
      if (res.ok) {
        setSeoSaved(true);
        setTimeout(() => setSeoSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSeoSaving(false);
    }
  };

  useEffect(() => {
    const checkOwner = async () => {
      // Allow access in dev mode
      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
      if (isDevMode) {
        setIsOwner(true);
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setIsOwner(data.email === OWNER_EMAIL);
        }
      } catch {
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };
    checkOwner();
  }, []);

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(name);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Access denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <Nav showRefresh={false} showDashboard={true} />

      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-14 pb-16">
        
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <Palette className="h-5 w-5 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Brand Guidelines</h1>
          </div>
          <p className="text-zinc-500">Visual reference for TrueGauge branding. Changes here sync across the site.</p>
        </div>

        {/* Logo Section */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('logo')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Logo</h2>
            </div>
            {openSections.logo ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.logo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Primary Logo - Dark BG */}
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <div className="mb-4 flex items-center justify-center h-20">
                <span className="text-2xl font-bold tracking-tight">
                  <span className="text-cyan-400" style={{ textShadow: '0 0 20px #22d3ee50' }}>TRUE</span>
                  <span className="font-light text-zinc-300">GAUGE</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500">Primary • Dark Background</p>
            </div>
            
            {/* Icon - Transparent */}
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <div className="mb-4 flex items-center justify-center h-20">
                <Image 
                  src="/truegauge_icon.png" 
                  alt="TrueGauge Icon" 
                  width={64} 
                  height={64}
                  className="rounded-xl"
                />
              </div>
              <p className="text-xs text-zinc-500">Transparent • Web use</p>
            </div>
            
            {/* Icon - With Background */}
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <div className="mb-4 flex items-center justify-center h-20">
                <Image 
                  src="/truegauge_icon_BG.png" 
                  alt="TrueGauge App Icon" 
                  width={64} 
                  height={64}
                  className="rounded-xl"
                />
              </div>
              <p className="text-xs text-zinc-500">With BG • App stores</p>
            </div>
          </div>
          )}
        </section>

        {/* Color Palette */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('colors')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Color Palette</h2>
            </div>
            {openSections.colors ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.colors && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {brandColors.map((color) => (
              <button
                key={color.name}
                onClick={() => copyToClipboard(color.hex, color.name)}
                className="group p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-left"
              >
                <div 
                  className="h-12 w-full rounded-lg mb-3 border border-zinc-700/50"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{color.name}</span>
                  {copiedColor === color.name ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                  )}
                </div>
                <p className="text-xs text-cyan-400 font-mono">{color.hex}</p>
                <p className="text-xs text-zinc-500 mt-1">{color.usage}</p>
              </button>
            ))}
          </div>
          )}
        </section>

        {/* Typography */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('typography')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Typography</h2>
            </div>
            {openSections.typography ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.typography && (
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-6 mt-4">
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Font Stack</p>
              <p className="text-sm text-zinc-300 font-mono">
                Inter, system-ui, -apple-system, sans-serif
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Headings</p>
                <p className="text-4xl font-bold text-white mb-2">Aa Bb Cc</p>
                <p className="text-2xl font-semibold text-white mb-2">Dashboard Heading</p>
                <p className="text-lg font-medium text-white">Section Title</p>
              </div>
              
              <div>
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Body & UI</p>
                <p className="text-base text-zinc-300 mb-2">Body text at 16px base</p>
                <p className="text-sm text-zinc-400 mb-2">Secondary text at 14px</p>
                <p className="text-xs text-zinc-500">Caption text at 12px</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Numeric Display</p>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-bold text-cyan-400" style={{ textShadow: '0 0 30px #22d3ee40' }}>$24.5k</span>
                <span className="text-2xl font-light text-zinc-400">/ month</span>
              </div>
            </div>
          </div>
          )}
        </section>

        {/* Social Share Preview */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('social')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Social Share Preview</h2>
            </div>
            {openSections.social ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.social && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 mt-4 space-y-6">
            {/* Top - Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Preview <span className="text-zinc-600">(1200×630 @ 50%)</span></p>
                <button
                  onClick={exportPreview}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export
                </button>
              </div>
              <div id="og-preview" className="w-[600px] h-[315px] rounded-t-xl overflow-hidden border border-zinc-700">
                {ogImage ? (
                  <img src={ogImage} alt="OG Preview" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex flex-col items-center justify-center gap-4"
                    style={{ background: 'linear-gradient(135deg, #18181b 0%, #000000 50%, #18181b 100%)' }}
                  >
                    <img 
                      src="/truegauge_icon.png" 
                      alt="TrueGauge" 
                      width={120} 
                      height={120}
                      style={{ filter: 'drop-shadow(0 0 30px rgba(34,211,238,0.3))' }}
                    />
                    <span className="text-5xl font-bold tracking-tight">
                      <span className="text-cyan-400" style={{ textShadow: '0 0 40px #22d3ee50' }}>TRUE</span>
                      <span className="font-light text-zinc-300">GAUGE</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="w-[600px] bg-zinc-800 p-3 rounded-b-xl border border-t-0 border-zinc-700">
                <p className="text-sm text-white font-medium">{ogTitle}</p>
                <p className="text-xs text-zinc-400 mt-1">{ogDescription}</p>
                <p className="text-xs text-zinc-500 mt-1">truegauge.app</p>
              </div>
            </div>
            
            {/* Bottom - Upload Left | Edit Right */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left - Image Upload */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">OG Image</label>
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors h-[140px] flex items-center justify-center">
                  {ogImage ? (
                    <div className="flex gap-2 w-full">
                      <label className="flex-1 cursor-pointer">
                        <span className="block w-full py-2 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center text-zinc-300 hover:bg-zinc-700 transition-colors">
                          Replace Image
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <button 
                        onClick={() => setOgImage(null)}
                        className="py-2 px-3 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block text-center w-full">
                      <ImageIcon className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">Click to upload</p>
                      <p className="text-xs text-zinc-600 mt-1">1200×630 recommended</p>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Right - Text Fields */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider">OG Title</label>
                    <span className="text-xs text-zinc-600">{ogTitle.length}/70</span>
                  </div>
                  <input
                    type="text"
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    maxLength={70}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider">OG Description</label>
                    <span className="text-xs text-zinc-600">{ogDescription.length}/160</span>
                  </div>
                  <input
                    type="text"
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                    maxLength={160}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={saveSocialSettings}
                    disabled={socialSaving}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
                  >
                    {socialSaving ? 'Saving...' : socialSaved ? '✓ Saved' : 'Save Changes'}
                  </Button>
                  <button
                    onClick={saveCurrentAsVariation}
                    disabled={savedVariations.length >= 3}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save as variation"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Saved Variations */}
            {savedVariations.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Saved Variations ({savedVariations.length}/3)</p>
              <div className="grid grid-cols-3 gap-3">
                {savedVariations.map((variation) => (
                  <div 
                    key={variation.id}
                    className={`relative rounded-lg border overflow-hidden ${variation.isMain ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-700 bg-zinc-800/50'}`}
                  >
                    {variation.isMain && (
                      <div className="absolute top-1 right-1 bg-cyan-500 rounded-full p-1 z-10">
                        <Star className="h-2.5 w-2.5 text-black" />
                      </div>
                    )}
                    {/* Thumbnail */}
                    {variation.thumbnail ? (
                      <img src={variation.thumbnail} alt="" className="w-full aspect-[1.91/1] object-cover" />
                    ) : (
                      <div className="w-full aspect-[1.91/1] bg-zinc-900 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-zinc-700" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-[10px] text-white truncate">{variation.title}</p>
                      <div className="flex gap-1 mt-2">
                        {!variation.isMain && (
                          <button
                            onClick={() => setAsMain(variation.id)}
                            className="flex-1 py-1 px-2 bg-zinc-700 rounded text-[10px] text-zinc-300 hover:bg-zinc-600 transition-colors"
                          >
                            Set Main
                          </button>
                        )}
                        <button
                          onClick={() => deleteVariation(variation.id)}
                          className="py-1 px-2 bg-red-500/20 rounded text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
          )}
        </section>

        {/* Favicon & App Icons */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('icons')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Favicon & App Icons</h2>
            </div>
            {openSections.icons ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.icons && (
          <div className="mt-4 space-y-4">
            {/* Current Icons */}
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-4">Icons shown at actual size with visible boundaries</p>
              <div className="flex flex-wrap gap-8 items-end">
                <div className="text-center">
                  <div className="relative mb-2">
                    <div className="w-[32px] h-[32px] border-2 border-dashed border-cyan-500/50 rounded-lg">
                      <Image src="/favicon.png" alt="Favicon" width={32} height={32} className="rounded-lg" unoptimized />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">32×32</p>
                  <p className="text-xs text-zinc-600">Favicon</p>
                </div>
                
                <div className="text-center">
                  <div className="relative mb-2">
                    <div className="w-[180px] h-[180px] border-2 border-dashed border-cyan-500/50 rounded-2xl">
                      <Image src="/apple-touch-icon.png" alt="Apple Touch" width={180} height={180} className="rounded-2xl" unoptimized />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">180×180</p>
                  <p className="text-xs text-zinc-600">Apple Touch</p>
                </div>
                
                <div className="text-center">
                  <div className="relative mb-2">
                    <div className="w-[192px] h-[192px] border-2 border-dashed border-cyan-500/50 rounded-2xl">
                      <Image src="/icon-192.png" alt="App Icon 192" width={192} height={192} className="rounded-2xl" unoptimized />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">192×192</p>
                  <p className="text-xs text-zinc-600">Android/PWA</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-xs text-green-400 mb-2">✓ Icons updated</p>
                <p className="text-xs text-zinc-500">Gauge at 85% coverage with glossy glass effect. All sizes generated.</p>
              </div>
            </div>

            {/* Icon Builder - nested inside */}
            <div className="p-6 rounded-xl bg-zinc-800/50 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">Icon Builder</span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Full control over background and gauge sizing</p>
              
              <div className="flex flex-wrap gap-8 items-start">
                {/* Preview */}
                <div className="text-center">
                  <div className="w-[192px] h-[192px] border-2 border-dashed border-violet-500/50 rounded-2xl overflow-hidden mb-2">
                    <Image src="/app-icon-v5.png" alt="New App Icon" width={192} height={192} />
                  </div>
                  <p className="text-xs text-zinc-500">192×192 Preview</p>
                </div>
                
                {/* Specs */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Current Settings</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Background</span>
                      <span className="text-zinc-300 font-mono text-xs">#18181b → #000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Gauge Size</span>
                      <span className="text-zinc-300">85%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Corner Radius</span>
                      <span className="text-zinc-300">96px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </section>

        {/* Button Styles */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('buttons')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Button Styles</h2>
            </div>
            {openSections.buttons ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.buttons && (
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Primary</p>
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-medium">
                  Save Changes
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Secondary</p>
                <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800">
                  Cancel
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Ghost</p>
                <Button variant="ghost" className="w-full hover:bg-zinc-800">
                  Learn More
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Destructive</p>
                <Button className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
                  Delete
                </Button>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Card Actions</p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-all">
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all">
                  <Check className="h-4 w-4" />
                  Confirm
                </button>
              </div>
            </div>
          </div>
          )}
        </section>

        {/* SEO Settings */}
        <section className="mb-4">
          <button 
            onClick={() => toggleSection('seo')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">SEO Settings</h2>
            </div>
            {openSections.seo ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          </button>
          
          {openSections.seo && (
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 mt-4 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Page Title</label>
                <span className="text-xs text-zinc-600">{seoTitle.length}/60</span>
              </div>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Meta Description</label>
                <span className="text-xs text-zinc-600">{seoDescription.length}/160</span>
              </div>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                maxLength={160}
                rows={2}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Keywords</label>
                <span className="text-xs text-zinc-600">comma separated</span>
              </div>
              <input
                type="text"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="business dashboard, analytics, cash flow"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-colors">
                <input
                  type="checkbox"
                  checked={robotsIndex}
                  onChange={(e) => setRobotsIndex(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500"
                />
                <div>
                  <p className="text-sm text-white">Index</p>
                  <p className="text-xs text-zinc-500">Allow search engines to index</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-colors">
                <input
                  type="checkbox"
                  checked={robotsFollow}
                  onChange={(e) => setRobotsFollow(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500"
                />
                <div>
                  <p className="text-sm text-white">Follow</p>
                  <p className="text-xs text-zinc-500">Allow crawling links</p>
                </div>
              </label>
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={saveSeoSettings}
                disabled={seoSaving}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
              >
                {seoSaving ? 'Saving...' : seoSaved ? '✓ Saved' : 'Save SEO Settings'}
              </Button>
              <p className="text-xs text-zinc-600 mt-2 text-center">Updates site metadata (rebuild required for production)</p>
            </div>
          </div>
          )}
        </section>

      </main>
    </div>
  );
}
