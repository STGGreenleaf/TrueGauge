'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PulseIndicator } from '@/components/PulseIndicator';

interface AdminMenuProps {
  businessName: string;
  demoEnabled: boolean;
  onToggleDemo: (enabled: boolean) => void;
}

export function AdminMenu({ 
  businessName, 
  demoEnabled, 
  onToggleDemo
}: AdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className={`hover:bg-transparent relative ${
          demoEnabled && !isOpen 
            ? 'text-cyan-400 hover:text-cyan-300' 
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        {/* Pulsing indicator when demo mode is ON */}
        <PulseIndicator show={demoEnabled && !isOpen} className="absolute -top-0.5 -right-0.5" />
      </Button>

      {isOpen && mounted && createPortal(
        <>
          {/* Invisible backdrop for click-away - starts below nav header */}
          <div 
            className="fixed inset-0 top-14 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel - frosted glass */}
          <div 
            className="fixed right-4 top-16 z-[9999] w-64 overflow-hidden backdrop-blur-xl"
            style={{ 
              backgroundColor: 'rgba(24, 24, 27, 0.50)',
              borderRadius: '12px',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              boxShadow: '0 0 40px rgba(34, 211, 238, 0.15)'
            }}
          >
            {/* Header */}
            <div className="p-3 border-b border-zinc-700/50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">ADMIN</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {/* Demo Mode Toggle */}
              <button
                onClick={() => {
                  const newValue = !demoEnabled;
                  onToggleDemo(newValue);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-md transition-colors ${
                  demoEnabled 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Demo Mode</div>
                    <div className="text-xs text-zinc-500">Brightline Supply Co.</div>
                  </div>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors ${demoEnabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${demoEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Manual Link */}
              <a
                href="/manual"
                className="w-full flex items-center gap-3 p-3 rounded-md transition-colors hover:bg-zinc-800 text-zinc-300"
              >
                <FileText className="h-4 w-4" />
                <div className="text-sm font-medium">Operator&apos;s Manual</div>
              </a>

            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-700/50">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
                {businessName || 'TrueGauge'} • Admin Mode
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
