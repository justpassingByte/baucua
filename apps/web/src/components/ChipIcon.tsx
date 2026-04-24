// Shared chip icon SVG — use instead of 🪙 emoji which may not render
interface ChipIconProps {
  color?: string;
  size?: number;
  value?: number;
  className?: string;
}

const CHIP_COLORS: Record<number, string> = {
  10:  '#60a5fa', // blue
  50:  '#4ade80', // green
  100: '#fb923c', // orange
  500: '#c084fc', // purple
};

export function ChipIcon({ color, size = 22, value, className = '' }: ChipIconProps) {
  const c = color ?? (value ? (CHIP_COLORS[value] ?? '#F6AD55') : '#F6AD55');
  const fontSize = value && value >= 100 ? (size * 0.22) : (size * 0.26);
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`inline-block shrink-0 ${className}`}>
      <circle cx="20" cy="20" r="19" fill="#1a1a30" stroke={c} strokeWidth="3" />
      <circle cx="20" cy="20" r="13" fill={c} opacity="0.18" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <rect key={a} x="18.5" y="1.5" width="3" height="5" rx="1" fill={c}
          transform={`rotate(${a} 20 20)`} />
      ))}
      {value !== undefined && (
        <text x="20" y="24.5" textAnchor="middle" fontSize={fontSize}
          fontWeight="bold" fill={c} fontFamily="monospace">
          {value}
        </text>
      )}
    </svg>
  );
}

// Small inline chip badge for chip counts
export function ChipBadge({ amount, color = '#F6AD55', size = 14 }: { amount: number; color?: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 shadow-[0_6px_14px_rgba(0,0,0,0.16)]">
      <ChipIcon color={color} size={size} />
      <span className="font-heading font-black leading-none text-white/90">{amount}</span>
    </span>
  );
}
