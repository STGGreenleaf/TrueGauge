'use client';

import { useEffect, useState } from 'react';

interface GaugeProps {
  value: number; // 0-200
  label?: string;
  size?: number;
  showValue?: boolean;
}

export function Gauge({ value, label, size = 280, showValue = true }: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // Clamp value to 0-200
  const clampedValue = Math.max(0, Math.min(200, value));
  
  // Animate needle on mount and value change
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = animatedValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (clampedValue - startValue) * eased;
      
      setAnimatedValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [clampedValue]);
  
  // SVG dimensions
  const cx = size / 2;
  const cy = size / 2 + 20;
  const radius = size * 0.38;
  const innerRadius = radius * 0.75;
  
  // Arc spans 270 degrees (from 225deg to -45deg, or 135 to 405 in standard)
  // Start at bottom-left (225deg), end at bottom-right (315deg going clockwise through top)
  const startAngle = 225;
  const endAngle = -45;
  const totalAngle = 270;
  
  // Convert value (0-200) to angle
  const valueToAngle = (v: number) => {
    const ratio = v / 200;
    return startAngle - (ratio * totalAngle);
  };
  
  // Convert angle to radians
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  
  // Get point on circle
  const getPoint = (angle: number, r: number) => ({
    x: cx + r * Math.cos(toRadians(angle)),
    y: cy - r * Math.sin(toRadians(angle)),
  });
  
  // Create arc path
  const createArc = (startA: number, endA: number, r: number) => {
    const start = getPoint(startA, r);
    const end = getPoint(endA, r);
    const largeArc = Math.abs(startA - endA) > 180 ? 1 : 0;
    const sweep = startA > endA ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };
  
  // Segment colors and ranges
  const segments = [
    { start: 0, end: 50, color: '#dc2626' },     // Red (0-50%)
    { start: 50, end: 100, color: '#eab308' },   // Yellow (50-100%)
    { start: 100, end: 150, color: '#22c55e' },  // Green (100-150%)
    { start: 150, end: 200, color: '#d4af37' },  // Gold (150-200%)
  ];
  
  // Needle angle
  const needleAngle = valueToAngle(animatedValue);
  const needleLength = radius * 0.85;
  const needleTip = getPoint(needleAngle, needleLength);
  const needleBase1 = getPoint(needleAngle + 90, 8);
  const needleBase2 = getPoint(needleAngle - 90, 8);
  
  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 200; i += 10) {
    const angle = valueToAngle(i);
    const isMajor = i % 50 === 0;
    const tickLength = isMajor ? 15 : 8;
    const outer = getPoint(angle, radius + 5);
    const inner = getPoint(angle, radius + 5 - tickLength);
    ticks.push({ i, angle, outer, inner, isMajor });
  }
  
  // Status color based on value
  const getStatusColor = () => {
    if (animatedValue < 50) return '#dc2626';
    if (animatedValue < 100) return '#eab308';
    if (animatedValue < 150) return '#22c55e';
    return '#d4af37';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Definitions */}
        <defs>
          {/* Chrome bezel gradient */}
          <linearGradient id="bezelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8e8e8" />
            <stop offset="25%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#c0c0c0" />
            <stop offset="75%" stopColor="#a0a0a0" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>
          
          {/* Inner shadow */}
          <radialGradient id="innerShadow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          
          {/* Glass highlight */}
          <linearGradient id="glassHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          
          {/* Needle gradient */}
          <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4444" />
            <stop offset="100%" stopColor="#cc0000" />
          </linearGradient>
          
          {/* Drop shadow filter */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.5" />
          </filter>
        </defs>
        
        {/* Outer chrome bezel */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + 25}
          fill="url(#bezelGradient)"
          filter="url(#dropShadow)"
        />
        
        {/* Inner bezel ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + 18}
          fill="none"
          stroke="#404040"
          strokeWidth="2"
        />
        
        {/* Main dial background */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + 15}
          fill="url(#innerShadow)"
        />
        
        {/* Colored segments */}
        {segments.map((seg, idx) => {
          const segStartAngle = valueToAngle(seg.start);
          const segEndAngle = valueToAngle(seg.end);
          return (
            <path
              key={idx}
              d={createArc(segStartAngle, segEndAngle, radius - 5)}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeLinecap="butt"
              opacity="0.8"
            />
          );
        })}
        
        {/* Tick marks */}
        {ticks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={tick.outer.x}
              y1={tick.outer.y}
              x2={tick.inner.x}
              y2={tick.inner.y}
              stroke={tick.isMajor ? '#ffffff' : '#888888'}
              strokeWidth={tick.isMajor ? 2 : 1}
            />
            {tick.isMajor && (
              <text
                x={getPoint(tick.angle, radius - 28).x}
                y={getPoint(tick.angle, radius - 28).y}
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {tick.i}
              </text>
            )}
          </g>
        ))}
        
        {/* 100% survival marker (prominent) */}
        <line
          x1={getPoint(valueToAngle(100), radius + 5).x}
          y1={getPoint(valueToAngle(100), radius + 5).y}
          x2={getPoint(valueToAngle(100), radius - 20).x}
          y2={getPoint(valueToAngle(100), radius - 20).y}
          stroke="#ffffff"
          strokeWidth="3"
        />
        
        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill="url(#needleGradient)"
          filter="url(#dropShadow)"
        />
        
        {/* Needle center cap */}
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="#2a2a2a"
          stroke="#404040"
          strokeWidth="2"
        />
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#cc0000"
        />
        
        {/* Glass highlight overlay */}
        <ellipse
          cx={cx}
          cy={cy - radius * 0.3}
          rx={radius * 0.7}
          ry={radius * 0.4}
          fill="url(#glassHighlight)"
        />
        
        {/* Value display */}
        {showValue && (
          <text
            x={cx}
            y={cy + radius * 0.5}
            fill={getStatusColor()}
            fontSize="28"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="monospace"
          >
            {Math.round(animatedValue)}%
          </text>
        )}
        
        {/* Label */}
        {label && (
          <text
            x={cx}
            y={cy + radius * 0.75}
            fill="#888888"
            fontSize="11"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

export default Gauge;
