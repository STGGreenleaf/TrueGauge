'use client';

import { Gauge } from './Gauge';

interface HealthCardProps {
  title: string;
  percent: number;
  mtdNetSales: number;
  remainingToGoal: number;
  dailySalesNeeded: number;
  result: number;
  variant: 'cash' | 'true';
}

export function HealthCard({
  title,
  percent,
  mtdNetSales,
  remainingToGoal,
  dailySalesNeeded,
  result,
  variant,
}: HealthCardProps) {
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
    return value < 0 ? `-${formatted}` : formatted;
  };

  const resultColor = result >= 0 ? 'text-green-400' : 'text-red-400';
  const borderColor = variant === 'cash' ? 'border-blue-500/30' : 'border-purple-500/30';
  const glowColor = variant === 'cash' ? 'shadow-blue-500/10' : 'shadow-purple-500/10';

  return (
    <div
      className={`relative rounded-2xl border ${borderColor} bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 shadow-xl ${glowColor}`}
    >
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-400">
          {title}
        </h3>
      </div>

      {/* Mini Gauge */}
      <div className="flex justify-center">
        <Gauge value={percent} size={180} showValue={true} />
      </div>

      {/* Stats */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            MTD Sales
          </span>
          <span className="font-mono text-lg font-semibold text-white">
            {formatCurrency(mtdNetSales)}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Remaining
          </span>
          <span
            className={`font-mono text-lg font-semibold ${
              remainingToGoal <= 0 ? 'text-green-400' : 'text-zinc-300'
            }`}
          >
            {remainingToGoal <= 0 ? '✓ Goal Met' : formatCurrency(remainingToGoal)}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Daily Needed
          </span>
          <span className="font-mono text-lg font-semibold text-zinc-300">
            {dailySalesNeeded > 0 ? formatCurrency(dailySalesNeeded) : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Result
          </span>
          <span className={`font-mono text-xl font-bold ${resultColor}`}>
            {formatCurrency(result)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default HealthCard;
