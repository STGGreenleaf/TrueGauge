'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

interface StartupAnimationProps {
  onComplete?: () => void;
  duration?: number; // Total duration in ms (default 3000)
}

const CYCLE_TIME = 10000; // Fixed 10 second cycle

export default function StartupAnimation({ 
  onComplete, 
  duration = 3000, // How long the "on" portion is (fade in + hold)
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
      
      // Complete after overlay fades
      timeouts.push(setTimeout(() => onComplete?.(), duration + 3000));
    };

    run();
    return () => timeouts.forEach(clearTimeout);
  }, [onComplete, duration]);

  return (
    <div 
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-hidden"
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

      
      {/* Nav Header - always visible for navigation */}
      <div className="absolute top-0 left-0 right-0 z-[101]">
        <Nav showRefresh={false} />
      </div>

    </div>
  );
}
