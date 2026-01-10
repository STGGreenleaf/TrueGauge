'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Gauge } from 'lucide-react';
import { PulseIndicator } from '@/components/PulseIndicator';
import { OwnerMenu } from '@/components/OwnerMenu';
import { AdminMenu } from '@/components/AdminMenu';
import { FeedbackButton } from '@/components/FeedbackButton';

interface NavProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  showRefresh?: boolean;
  showDashboard?: boolean;
  needsSetup?: boolean; // Pulse settings COG when store needs setup
  setupStatus?: 'urgent' | 'normal' | 'complete'; // Tiered setup indicator
}

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

export function Nav({ onRefresh, refreshing = false, showRefresh = true, showDashboard = true, needsSetup = false, setupStatus }: NavProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [businessName, setBusinessName] = useState('My Business');
  const [userViewEnabled, setUserViewEnabled] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Hydrate state from localStorage after mount
  useEffect(() => {
    setMounted(true);
    setUserViewEnabled(localStorage.getItem('userViewEnabled') === 'true');
    const stored = localStorage.getItem('demoModeEnabled');
    setDemoEnabled(stored === null ? true : stored === 'true');
  }, []);
  
  
  useEffect(() => {
    // Check if user is owner and fetch business name
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setIsOwner(data.email === OWNER_EMAIL);
        }
      } catch {
        setIsOwner(false);
      }
      
      // Fetch business name from settings
      // In dev mode with demo OFF, use newUser mode (empty/default settings)
      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
      const demoOff = localStorage.getItem('demoModeEnabled') === 'false';
      const isNewUserMode = isDevMode && demoOff;
      
      try {
        const settingsUrl = isNewUserMode ? '/api/settings?newUser=true' : '/api/settings';
        const settingsRes = await fetch(settingsUrl);
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          // Use businessName from settings, or default to empty for TrueGauge fallback
          setBusinessName(settings.businessName || '');
        }
      } catch {
        // Keep default business name
      }
    };
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('userViewEnabled', String(userViewEnabled));
  }, [userViewEnabled]);
  
  // Handle demo toggle for non-owners
  const handleDemoToggle = (enabled: boolean) => {
    setDemoEnabled(enabled);
    localStorage.setItem('demoModeEnabled', String(enabled));
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 backdrop-blur-md bg-black/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        {/* Left side: Logo */}
        <a href="/" className="cursor-pointer">
          <h1 className="text-lg uppercase tracking-[0.25em] text-zinc-400">
            <span className="font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee50' }}>TRUE</span>
            <span className="font-light">GAUGE</span>
          </h1>
        </a>
        {/* Right side: Menu + Messages + Dashboard + Refresh + Settings */}
        <div className="flex items-center gap-1">
          {isOwner && process.env.NEXT_PUBLIC_DEV_MODE !== 'true' ? (
            <OwnerMenu 
              onToggleUserView={setUserViewEnabled} 
              userViewEnabled={userViewEnabled}
              businessName={businessName}
            />
          ) : (
            <AdminMenu
              businessName={businessName}
              demoEnabled={demoEnabled}
              onToggleDemo={handleDemoToggle}
            />
          )}
          <FeedbackButton inline />
          {showDashboard && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = '/'}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
              title="Dashboard"
            >
              <Gauge className="size-5" />
            </Button>
          )}
          {showRefresh && onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={refreshing}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/settings'}
            className={`hover:bg-transparent relative ${
              (setupStatus && setupStatus !== 'complete') || needsSetup ? 'text-cyan-400 hover:text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings className="h-4 w-4" />
            {/* Tiered indicator: urgent (30x) → normal (3x) → none */}
            <PulseIndicator 
              show={setupStatus ? setupStatus !== 'complete' : needsSetup} 
              size="sm" 
              intensity={setupStatus === 'urgent' || (!setupStatus && needsSetup) ? 'urgent' : 'normal'} 
              className="absolute -top-0.5 -right-0.5" 
            />
          </Button>
        </div>
      </div>
    </header>
  );
}
