'use client';

interface PulseIndicatorProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  intensity?: 'normal' | 'urgent';
  className?: string;
}

const sizes = {
  sm: { container: 'h-2 w-2', core: 'h-1.5 w-1.5' },
  md: { container: 'h-3 w-3', core: 'h-2 w-2' },
  lg: { container: 'h-4 w-4', core: 'h-3 w-3' },
};

export function PulseIndicator({ show, size = 'md', intensity = 'normal', className = '' }: PulseIndicatorProps) {
  if (!show) return null;

  const s = sizes[size];
  const isUrgent = intensity === 'urgent';

  return (
    <span className={`flex ${s.container} items-center justify-center pointer-events-none ${className}`}>
      {/* Primary pulse ring */}
      <span 
        className={`absolute inline-flex ${s.container} rounded-full ${isUrgent ? 'bg-cyan-300' : 'bg-cyan-400'}`}
        style={{ 
          animation: isUrgent ? 'pulse-ring-urgent 1.5s ease-out infinite' : 'pulse-ring 1.2s ease-out infinite',
          filter: isUrgent ? 'blur(4px)' : 'blur(2px)',
        }}
      />
      {/* Secondary pulse ring for urgent - offset timing, even larger */}
      {isUrgent && (
        <span 
          className={`absolute inline-flex ${s.container} rounded-full bg-cyan-400/60`}
          style={{ 
            animation: 'pulse-ring-urgent-echo 1.5s ease-out infinite 0.5s',
            filter: 'blur(6px)',
          }}
        />
      )}
      {/* Core dot */}
      <span 
        className={`relative inline-flex rounded-full ${s.core}`}
        style={{
          background: isUrgent 
            ? 'radial-gradient(circle, #ffffff 0%, #67e8f9 40%, #22d3ee 100%)'
            : 'radial-gradient(circle, #e0f7fa 0%, #22d3ee 50%, #06b6d4 100%)',
          boxShadow: isUrgent 
            ? '0 0 10px #ffffff, 0 0 20px #67e8f9, 0 0 30px #22d3ee'
            : '0 0 6px #67e8f9, 0 0 12px #22d3ee',
        }}
      />
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes pulse-ring-urgent {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(30); opacity: 0; }
        }
        @keyframes pulse-ring-urgent-echo {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(45); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
