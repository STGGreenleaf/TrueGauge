'use client';

import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface MiniInstrumentProps {
  label: string;
  value: string;
  subValue?: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  trend?: 'up' | 'down' | 'flat';
  onClick?: () => void;
}

export function MiniInstrument({
  label,
  value,
  subValue,
  status,
  trend,
  onClick,
}: MiniInstrumentProps) {
  const statusColors = {
    good: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    danger: 'border-red-500/50 bg-red-500/5',
    neutral: 'border-zinc-600/50 bg-zinc-800/50',
  };

  const valueColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    neutral: 'text-zinc-300',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center rounded-xl border p-4 transition-all hover:scale-105 ${statusColors[status]} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Status indicator dot */}
      <div
        className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
          status === 'good'
            ? 'bg-green-400'
            : status === 'warning'
            ? 'bg-yellow-400'
            : status === 'danger'
            ? 'bg-red-400'
            : 'bg-zinc-500'
        }`}
      />

      {/* Label */}
      <span className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>

      {/* Value */}
      <span className={`font-mono text-2xl font-bold ${valueColors[status]}`}>
        {value}
      </span>

      {/* Sub value with trend */}
      {subValue && (
        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
          {trend && <TrendIcon className="h-3 w-3" />}
          <span>{subValue}</span>
        </div>
      )}
    </button>
  );
}

interface ConfidenceIndicatorProps {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  onClick?: () => void;
}

export function ConfidenceIndicator({ level, onClick }: ConfidenceIndicatorProps) {
  const config = {
    HIGH: {
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/30',
      label: 'High Confidence',
      description: 'Data is complete',
    },
    MEDIUM: {
      icon: AlertCircle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      label: 'Medium Confidence',
      description: 'Missing expense data',
    },
    LOW: {
      icon: HelpCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      label: 'Low Confidence',
      description: 'Limited data available',
    },
  };

  const { icon: Icon, color, bg, label, description } = config[level];

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:scale-102 ${bg}`}
    >
      <Icon className={`h-5 w-5 ${color}`} />
      <div className="text-left">
        <div className={`text-sm font-medium ${color}`}>{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
    </button>
  );
}

export default MiniInstrument;
