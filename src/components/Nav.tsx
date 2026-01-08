'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Gauge } from 'lucide-react';
import { OwnerMenu } from '@/components/OwnerMenu';
import { FeedbackButton } from '@/components/FeedbackButton';

interface NavProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  showRefresh?: boolean;
  showDashboard?: boolean; // Hide when already on dashboard
}

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

export function Nav({ onRefresh, refreshing = false, showRefresh = true, showDashboard = true }: NavProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [userViewEnabled, setUserViewEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userViewEnabled') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Check if user is owner
    const checkOwner = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setIsOwner(data.email === OWNER_EMAIL);
        }
      } catch {
        setIsOwner(false);
      }
    };
    checkOwner();
  }, []);

  useEffect(() => {
    localStorage.setItem('userViewEnabled', String(userViewEnabled));
  }, [userViewEnabled]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 backdrop-blur-md bg-black/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Left side: Logo */}
        <a href="/" className="cursor-pointer">
          <h1 className="text-lg uppercase tracking-[0.25em] text-zinc-400">
            <span className="font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee50' }}>TRUE</span>
            <span className="font-light">GAUGE</span>
          </h1>
        </a>
        {/* Right side: Owner hamburger + Dashboard + Refresh + Settings */}
        <div className="flex items-center gap-1">
          {isOwner && (
            <OwnerMenu 
              onToggleUserView={setUserViewEnabled} 
              userViewEnabled={userViewEnabled} 
            />
          )}
          {showDashboard && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = '/'}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
              title="Dashboard"
            >
              <Gauge className="h-4 w-4" />
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
            className="text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Feedback button for all users */}
      <FeedbackButton />
    </header>
  );
}
