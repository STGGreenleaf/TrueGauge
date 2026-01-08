'use client';

import { useEffect, useState } from 'react';

interface StartupAnimationProps {
  onComplete?: () => void;
  loop?: boolean;
  duration?: number; // Total duration in ms (default 3000)
  isOwner?: boolean; // Only show controls to owner
}

const CYCLE_TIME = 10000; // Fixed 10 second cycle

export default function StartupAnimation({ 
  onComplete, 
  loop = false,
  duration = 3000, // How long the "on" portion is (fade in + hold)
  isOwner = false,
}: StartupAnimationProps) {
  const [brightness, setBrightness] = useState(0);
  const [showText, setShowText] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    
    // Timing breakdown within 10s cycle:
    // 0 → duration: fade in lights, show text, hold
    // duration → duration+1.5s: fade OUT lights+text (back to black)
    // duration+1.5s → duration+3s: fade black overlay to reveal dashboard
    // remaining: hold dashboard visible, then loop back to black

    const run = () => {
      // Reset to black
      setBrightness(0);
      setShowText(false);
      setOverlayOpacity(1);
      
      // Phase 1: Fade in lights (first 40% of duration)
      timeouts.push(setTimeout(() => setBrightness(0.3), duration * 0.2));
      timeouts.push(setTimeout(() => setBrightness(1), duration * 0.4));
      
      // Phase 1b: Text reveals after lights are full + 500ms
      timeouts.push(setTimeout(() => setShowText(true), duration * 0.4 + 500));
      
      // Phase 2: Fade OUT lights + text (1.5s after duration ends)
      timeouts.push(setTimeout(() => setBrightness(0.5), duration));
      timeouts.push(setTimeout(() => {
        setBrightness(0.2);
        setShowText(false);
      }, duration + 500));
      timeouts.push(setTimeout(() => setBrightness(0), duration + 1000));
      
      // Phase 3: THEN fade black overlay to reveal dashboard (after lights are off)
      timeouts.push(setTimeout(() => setOverlayOpacity(0.7), duration + 1500));
      timeouts.push(setTimeout(() => setOverlayOpacity(0.3), duration + 2000));
      timeouts.push(setTimeout(() => setOverlayOpacity(0), duration + 2500));
      
      // Phase 4: Loop - fade back to black, restart
      timeouts.push(setTimeout(() => setOverlayOpacity(1), CYCLE_TIME - 500));
      
      timeouts.push(setTimeout(() => {
        if (loop) {
          run();
        } else {
          onComplete?.();
        }
      }, CYCLE_TIME));
    };

    run();
    return () => timeouts.forEach(clearTimeout);
  }, [loop, onComplete, duration]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ 
        backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
        transition: 'background-color 0.8s ease-out',
      }}
    >
      {/* Left light - pure glow */}
      <div 
        style={{
          position: 'absolute',
          left: 'calc(50% - 120px)',
          top: '50%',
          transform: 'translateY(-50%) rotate(6deg)',
          width: '80px',
          height: '4px',
          background: `rgba(200, 255, 255, ${brightness})`,
          borderRadius: '2px',
          boxShadow: `0 0 ${10 * brightness}px ${3 * brightness}px rgba(255, 255, 255, ${brightness * 0.8}),
             0 0 ${25 * brightness}px ${8 * brightness}px rgba(103, 232, 249, ${brightness * 0.6}),
             0 0 ${50 * brightness}px ${20 * brightness}px rgba(34, 211, 238, ${brightness * 0.4}),
             0 0 ${80 * brightness}px ${35 * brightness}px rgba(34, 211, 238, ${brightness * 0.2})`,
          transition: 'all 0.8s ease-out',
          opacity: brightness,
        }}
      />

      {/* Right light - pure glow */}
      <div 
        style={{
          position: 'absolute',
          right: 'calc(50% - 120px)',
          top: '50%',
          transform: 'translateY(-50%) rotate(-6deg)',
          width: '80px',
          height: '4px',
          background: `rgba(200, 255, 255, ${brightness})`,
          borderRadius: '2px',
          boxShadow: `0 0 ${10 * brightness}px ${3 * brightness}px rgba(255, 255, 255, ${brightness * 0.8}),
             0 0 ${25 * brightness}px ${8 * brightness}px rgba(103, 232, 249, ${brightness * 0.6}),
             0 0 ${50 * brightness}px ${20 * brightness}px rgba(34, 211, 238, ${brightness * 0.4}),
             0 0 ${80 * brightness}px ${35 * brightness}px rgba(34, 211, 238, ${brightness * 0.2})`,
          transition: 'all 0.8s ease-out',
          opacity: brightness,
        }}
      />

      {/* Ambient glow */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
          opacity: brightness,
          transition: 'opacity 1s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Brand text - lit from behind */}
      <div 
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '60%',
          textAlign: 'center',
          opacity: showText ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
        }}
      >
        <div className="text-lg tracking-[0.4em] text-cyan-400/80">
          <span className="font-bold">TRUE</span><span className="font-light">GAUGE</span>
        </div>
        <div className="mt-1 text-[9px] tracking-[0.2em] text-zinc-500">
          SYSTEMS ONLINE
        </div>
      </div>

      
      {/* Nav Header - same as dashboard (owner only) */}
      {isOwner && (
        <header className="absolute top-0 left-0 right-0 z-10 border-b border-zinc-800/50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="cursor-pointer" onClick={() => onComplete?.()}>
              <h1 className="text-lg uppercase tracking-[0.25em] text-zinc-400">
                <span className="font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee50' }}>TRUE</span>
                <span className="font-light">GAUGE</span>
              </h1>
            </a>
            <div className="flex items-center gap-3">
              <a href="/settings" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            </div>
          </div>
        </header>
      )}

      {/* Duration control - bottom center (owner only) */}
      {isOwner && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-widest text-zinc-600">DURATION</span>
            <span className="text-xs text-zinc-400">{(duration / 1000).toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="1000"
            max="8000"
            step="500"
            value={duration}
            onChange={(e) => {
              const newDuration = parseInt(e.target.value);
              // Save to global database
              fetch('/api/settings/splash-duration', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: newDuration }),
              });
              window.dispatchEvent(new CustomEvent('splash-duration-change', { detail: newDuration }));
            }}
            className="w-40 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-500 [&::-webkit-slider-thumb]:hover:bg-zinc-400"
          />
          <div className="flex justify-between w-40 text-[9px] text-zinc-700">
            <span>1s</span>
            <span>8s</span>
          </div>
        </div>
      )}
    </div>
  );
}
