'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface StartupAnimationProps {
  onComplete?: () => void;
  loop?: boolean;
  duration?: number; // Total duration in ms (default 3000)
}

export default function StartupAnimation({ 
  onComplete, 
  loop = false,
  duration = 3000,
}: StartupAnimationProps) {
  const [brightness, setBrightness] = useState(0);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    
    // Scale timing proportionally to duration
    const scale = duration / 3000;

    const run = () => {
      setBrightness(0);
      setShowText(false);
      
      // Fade in lights (scaled)
      timeouts.push(setTimeout(() => setBrightness(0.3), 600 * scale));
      timeouts.push(setTimeout(() => setBrightness(1), 1200 * scale));
      
      // Text reveals with lights at full - lit from behind effect
      timeouts.push(setTimeout(() => setShowText(true), 1200 * scale));
      
      // Complete or loop at duration
      timeouts.push(setTimeout(() => {
        if (loop) {
          setTimeout(run, 1000);
        } else {
          onComplete?.();
        }
      }, duration));
    };

    run();
    return () => timeouts.forEach(clearTimeout);
  }, [loop, onComplete, duration]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000' }}
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

      {/* Exit button */}
      <button
        onClick={() => onComplete?.()}
        className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700/60 bg-zinc-900/90 text-zinc-400 backdrop-blur-sm transition-all hover:border-zinc-500/50 hover:text-zinc-300"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute top-7 right-[70px] text-[10px] tracking-widest text-zinc-600">
        EXIT →
      </div>

      {/* Duration control - bottom center */}
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
            // Save to database
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
    </div>
  );
}
