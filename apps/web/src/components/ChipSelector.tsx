import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ChipIcon, ChipBadge } from './ChipIcon';

const CHIPS = [
  { value: 10, ring: 'ring-[#60a5fa]', dot: '#60a5fa' },
  { value: 50, ring: 'ring-[#4ade80]', dot: '#4ade80' },
  { value: 100, ring: 'ring-[#fb923c]', dot: '#fb923c' },
  { value: 500, ring: 'ring-[#c084fc]', dot: '#c084fc' },
];

export default function ChipSelector() {
  const { selectedChip, setSelectedChip, room, playerId } = useGameStore();
  const player = room && playerId ? room.players[playerId] : null;

  const remaining = player ? Math.max(0, player.chips) : 0;
  const noChips = player ? player.chips <= 0 : false;

  if (noChips) {
    return (
      <div className="glass-card space-y-2 p-4 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/8 text-2xl shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
          💸
        </span>
        <p className="text-sm font-heading font-semibold text-white/80">Bạn hết chips!</p>
        <p className="text-xs font-body text-white/35">Chờ host thêm chips để tiếp tục</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-heading font-bold tracking-wide text-white/75">Chọn chip</span>
        <span className="text-sm font-heading font-bold text-accent-gold">
          <ChipBadge amount={remaining} size={16} /> còn lại
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {CHIPS.map((chip) => {
          const disabled = chip.value > remaining;
          const selected = selectedChip === chip.value;

          return (
            <motion.button
              key={chip.value}
              onClick={() => !disabled && setSelectedChip(chip.value)}
              whileTap={!disabled ? { scale: 0.92 } : {}}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 transition-all duration-150 ${
                disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
              } ${selected ? `border-white/30 bg-white/[0.08] ring-2 ${chip.ring} ring-offset-2 ring-offset-transparent` : 'border-white/10 bg-white/[0.03]'}`}
              disabled={disabled}
            >
              <ChipIcon color={chip.dot} value={chip.value} size={30} className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.20)]" />
              <span className={`text-[15px] leading-none font-heading font-black tracking-wide ${selected ? 'text-white' : 'text-white/80'}`}>
                {chip.value}
              </span>
              {selected && (
                <motion.div
                  layoutId="chip-indicator"
                  className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(246,173,85,0.8)]"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[10px] font-body text-white/28">Chọn mệnh giá rồi click ô để đặt</p>
    </div>
  );
}
