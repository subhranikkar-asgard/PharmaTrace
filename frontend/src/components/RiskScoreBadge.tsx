import type { RiskLevel } from '../types';

interface Props {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'lg';
}

const colors: Record<RiskLevel, string> = {
  LOW:      'bg-green-100 text-green-800 border-green-200',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

export function RiskScoreBadge({ score, level, size = 'sm' }: Props) {
  const base = colors[level] ?? colors.LOW;
  const sizeClass = size === 'lg'
    ? 'text-2xl font-bold px-4 py-2 rounded-xl'
    : 'text-sm font-semibold px-3 py-1 rounded-full';

  return (
    <span className={`inline-flex items-center gap-1.5 border ${base} ${sizeClass}`}>
      <span>{score}/100</span>
      <span className="opacity-70">·</span>
      <span>{level}</span>
    </span>
  );
}
