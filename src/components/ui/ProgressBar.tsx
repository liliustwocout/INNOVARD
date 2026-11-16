'use client';

/**
 * Signature: progress is the logo's rising arrow.
 * Fills with transform: translateX (never width), pose A → pose B on value change;
 * the leading edge is cut as an arrowhead (see .ui-progress-fill).
 */
interface ProgressBarProps {
  value: number;
  /** Visual size of the track */
  size?: 'sm' | 'md';
  tone?: 'accent' | 'success' | 'onDark';
  label?: string;
  className?: string;
}

const TRACK_CLASSES = {
  accent: 'bg-slate-100',
  success: 'bg-slate-100',
  onDark: 'bg-white/15',
};

const FILL_CLASSES = {
  accent: 'bg-indigo-600',
  success: 'bg-emerald-500',
  onDark: 'bg-white',
};

export function ProgressBar({
  value,
  size = 'md',
  tone = 'accent',
  label,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={`relative w-full ${height} ${className}`}
    >
      <div className={`absolute inset-0 overflow-hidden rounded-full ${TRACK_CLASSES[tone]}`}>
        <div
          className={`ui-progress-fill h-full w-full rounded-full ${FILL_CLASSES[tone]}`}
          style={{ transform: `translateX(${clamped - 100}%)` }}
        />
      </div>
    </div>
  );
}
