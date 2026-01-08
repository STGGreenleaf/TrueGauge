'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Eye, Sparkles, LayoutDashboard, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OwnerMenuProps {
  onToggleUserView: (enabled: boolean) => void;
  userViewEnabled: boolean;
}

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

export function OwnerMenu({ onToggleUserView, userViewEnabled }: OwnerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(true); // TEMP: bypass for local dev
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

      {isOpen && mounted && createPortal(
          <>
            {/* Invisible backdrop for click-away */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu Panel - frosted glass */}
            <div 
              className="fixed right-4 top-16 z-[9999] w-64 overflow-hidden backdrop-blur-xl"
              style={{ 
                backgroundColor: 'rgba(24, 24, 27, 0.50)',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.15)'
              }}
            >
              <div className="p-3 border-b border-zinc-700/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">OWNER MODE</span>
              </div>
            </div>

            <div className="p-2">
              {/* User View Toggle */}
              <button
                onClick={() => {
                  onToggleUserView(!userViewEnabled);
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

            <div className="p-3 border-t border-zinc-700/50">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
                HBBEVCO • Owner Access
              </div>
            </div>
          </div>
          </>,
          document.body
        )}
    </div>
  );
}
