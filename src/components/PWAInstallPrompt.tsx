'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Download, Smartphone, Share, Plus } from 'lucide-react';

interface PWAInstallPromptProps {
  preview?: boolean; // For brand page preview
}

export function PWAInstallPrompt({ preview = false }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(preview);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (preview) return;

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check last prompt time
    const lastPrompt = localStorage.getItem('pwaPromptLastShown');
    const dismissed = localStorage.getItem('pwaPromptDismissed');
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (dismissed === 'true') return;
    
    const shouldShow = !lastPrompt || (Date.now() - parseInt(lastPrompt)) > oneWeek;
    
    if (shouldShow) {
      // Delay showing prompt to not interrupt initial experience
      const timer = setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwaPromptLastShown', Date.now().toString());
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt (Chrome/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [preview]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Android install
      (deferredPrompt as any).prompt();
      const result = await (deferredPrompt as any).userChoice;
      if (result.outcome === 'accepted') {
        localStorage.setItem('pwaPromptDismissed', 'true');
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (!preview) {
      localStorage.setItem('pwaPromptLastShown', Date.now().toString());
    }
  };

  const handleNeverShow = () => {
    setShowPrompt(false);
    if (!preview) {
      localStorage.setItem('pwaPromptDismissed', 'true');
    }
  };

  if (!showPrompt && !preview) return null;
  if (isStandalone && !preview) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center ${preview ? 'relative' : ''}`}>
      {/* Backdrop */}
      {!preview && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
        />
      )}
      
      {/* Modal */}
      <div 
        className="relative w-[320px] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.95) 0%, rgba(9, 9, 11, 0.98) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(34, 211, 238, 0.2)',
          boxShadow: '0 0 60px rgba(34, 211, 238, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Ambient glow */}
        <div 
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
          }}
        />
        
        {/* Close button */}
        {!preview && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div 
              className="w-20 h-20 rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
              }}
            >
              <Image 
                src="/icon-192.png" 
                alt="TrueGauge" 
                width={80} 
                height={80}
                className="w-full h-full"
              />
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold text-white mb-2">
            Get the <span className="text-cyan-400">TrueGauge</span> App
          </h3>
          
          {/* Subtitle */}
          <p className="text-sm text-zinc-400 mb-6">
            Install for faster access and a native app experience
          </p>
          
          {/* Benefits */}
          <div className="space-y-2 mb-6 text-left">
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <Smartphone className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <span>Launch instantly from your home screen</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <Download className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <span>No app store required — it&apos;s already here</span>
            </div>
          </div>
          
          {/* Install instructions for iOS */}
          {isIOS && !preview && (
            <div className="mb-6 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2">To install on iOS:</p>
              <div className="flex items-center justify-center gap-2 text-xs text-cyan-400">
                <span>Tap</span>
                <Share className="h-4 w-4" />
                <span>then</span>
                <Plus className="h-4 w-4" />
                <span>Add to Home Screen</span>
              </div>
            </div>
          )}
          
          {/* Install button */}
          <button
            onClick={handleInstall}
            className="w-full py-3 px-6 rounded-xl font-semibold text-black transition-all"
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
            }}
          >
            {isIOS ? 'Got It' : 'Install App'}
          </button>
          
          {/* Dismiss option */}
          <button
            onClick={handleNeverShow}
            className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Don&apos;t show again
          </button>
        </div>
        
        {/* Bottom accent line */}
        <div 
          className="h-1 w-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.5), transparent)',
          }}
        />
      </div>
    </div>
  );
}
