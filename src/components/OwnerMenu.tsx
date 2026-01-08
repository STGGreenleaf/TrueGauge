'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Eye, Sparkles, LayoutDashboard, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OwnerMenuProps {
  onToggleUserView: (enabled: boolean) => void;
  userViewEnabled: boolean;
}

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

export function OwnerMenu({ onToggleUserView, userViewEnabled }: OwnerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Check if current user is owner
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

  if (!isOwner) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-violet-500/30 bg-[#0a0a0f] shadow-xl shadow-violet-500/10">
            <div className="p-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">Owner Mode</span>
              </div>
            </div>

            <div className="p-2">
              {/* User View Toggle */}
              <button
                onClick={() => {
                  onToggleUserView(!userViewEnabled);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-md transition-colors ${
                  userViewEnabled 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">User View</div>
                    <div className="text-xs text-zinc-500">See as template user</div>
                  </div>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors ${userViewEnabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${userViewEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Splash Page */}
              <button
                onClick={() => {
                  // Trigger splash animation
                  window.dispatchEvent(new CustomEvent('show-splash'));
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-800 text-zinc-300 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Splash Page</div>
                  <div className="text-xs text-zinc-500">Preview animation</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-zinc-600" />
              </button>

              {/* Owner Dashboard */}
              <button
                onClick={() => {
                  // TODO: Navigate to owner dashboard
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
                <LayoutDashboard className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Owner Dashboard</div>
                  <div className="text-xs text-zinc-500">Coming soon</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-zinc-600" />
              </button>

              {/* Invite Users */}
              <button
                onClick={() => {
                  // TODO: Navigate to invite system
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
                <Users className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Manage Users</div>
                  <div className="text-xs text-zinc-500">Coming soon</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-zinc-600" />
              </button>
            </div>

            <div className="p-3 border-t border-zinc-800">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
                HBBEVCO • Owner Access
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
