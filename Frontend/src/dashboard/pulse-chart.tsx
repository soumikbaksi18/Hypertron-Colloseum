import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { money } from '../lib/format';
import type { OverviewActivity } from '../lib/overview-stats';

export type PulseMode = 'volume' | 'payments';
export type PulseRange = '7d' | '30d' | '90d';

export type PulsePoint = {
  label: string;
  value: number;
  display: string;
};

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseKey(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dayKey(date);
}

export function buildPulse(
  activity: OverviewActivity[],
  range: PulseRange,
  mode: PulseMode,
): PulsePoint[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dayKey(date),
      label: date
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        .toUpperCase(),
      volumeMinor: 0,
      payments: 0,
    };
  });
  const index = new Map(points.map((point, position) => [point.key, position]));

  for (const event of activity) {
    const created = parseKey(event.createdAt);
    if (created != null && index.has(created)) {
      points[index.get(created)!].payments += 1;
    }
    const paid = parseKey(event.paidAt);
    if (paid != null && index.has(paid)) {
      points[index.get(paid)!].volumeMinor += event.amountMinor;
    }
  }

  return points.map((point) => {
    if (mode === 'payments') {
      return {
        label: point.label,
        value: point.payments,
        display: `${point.payments} payment${point.payments === 1 ? '' : 's'}`,
      };
    }
    return {
      label: point.label,
      value: point.volumeMinor / 1_000_000,
      display: money(point.volumeMinor, 'USDC'),
    };
  });
}

function PulseTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PulsePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-[#C3D0E8]/45 bg-[#03080b] px-3 py-2 shadow-[0_12px_32px_rgba(3,8,11,0.45)]">
      <p className="text-[10px] tracking-[0.14em] text-[#c9b56a] uppercase">{point.label}</p>
      <p className="mt-1 text-sm text-[#EEF4FF]">{point.display}</p>
    </div>
  );
}

export function PulseChart({
  points,
  tall,
}: {
  points: PulsePoint[];
  tall: boolean;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const peak = Math.max(...points.map((point) => point.value), 0);
  const tickEvery = points.length <= 7 ? 0 : points.length <= 30 ? 4 : 12;

  return (
    <div className={tall ? 'h-[280px] w-full' : 'h-[168px] w-full'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6E94F0" />
              <stop offset="62%" stopColor="#8FB0FF" />
              <stop offset="100%" stopColor="#ffe500" />
            </linearGradient>
            <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe500" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffe500" stopOpacity="0" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            interval={tickEvery}
            tick={{ fill: 'rgba(195,208,232,0.55)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={12}
          />
          <YAxis hide domain={[0, peak === 0 ? 1 : 'auto']} />
          <Tooltip
            content={<PulseTip />}
            cursor={{ stroke: '#ffe500', strokeOpacity: 0.7, strokeWidth: 1 }}
            isAnimationActive={!reduce}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={`url(#${gradientId}-stroke)`}
            strokeWidth={2.25}
            fill={`url(#${gradientId}-fill)`}
            dot={false}
            activeDot={{ r: 4.5, fill: '#ffe500', stroke: '#03080b', strokeWidth: 2 }}
            isAnimationActive={!reduce}
            animationDuration={420}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
