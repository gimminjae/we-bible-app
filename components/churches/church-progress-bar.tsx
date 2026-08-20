import { View } from 'react-native';

type ChurchProgressBarProps = {
  value: number | null | undefined;
  hidden?: boolean;
  size?: 'sm' | 'md';
  tone?: 'primary' | 'emerald';
  className?: string;
};

function clampPercent(value: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

export function ChurchProgressBar({
  value,
  hidden = false,
  size = 'sm',
  tone = 'primary',
  className = '',
}: ChurchProgressBarProps) {
  const clamped = clampPercent(value);
  const width = hidden ? 18 : clamped;
  const heightClassName = size === 'md' ? 'h-3.5' : 'h-2.5';
  const fillClassName = hidden
    ? 'bg-gray-300 dark:bg-gray-700'
    : tone === 'emerald'
      ? 'bg-emerald-500 dark:bg-emerald-400'
      : 'bg-primary-500 dark:bg-primary-400';

  return (
    <View
      className={`overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800 ${heightClassName} ${className}`.trim()}
    >
      <View
        className={`h-full rounded-full ${fillClassName}`}
        style={{ width: `${width}%`, opacity: hidden ? 0.75 : 1 }}
      />
    </View>
  );
}
