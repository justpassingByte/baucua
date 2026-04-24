import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ChipIcon, ChipBadge } from './ChipIcon';

const CHIPS = [
  { value: 10,  ring: 'ring-[#60a5fa]', dot: '#60a5fa' },
  { value: 50,  ring: 'ring-[#4ade80]', dot: '#4ade80' },
  { value: 100, ring: 'ring-[#fb923c]', dot: '#fb923c' },
  { value: 500, ring: 'ring-[#c084fc]', dot: '#c084fc' },
];

export default function ChipSelector() {
  const { selectedChip, setSelectedChip, room, playerId, myBets } = useGameStore();
  const player = room && playerId ? room.players[playerId] : null;

  // player.chips is updated from server via bet_updated; myBets tracks local unconfirmed bets
  const localUnconfirmed = Object.values(myBets).reduce((a, b) => a + b, 0);
  const remaining = player ? Math.max(0, player.chips - localUnconfirmed) : 0;
  const noChips = player ? player.chips <= 0 : false;

  if (noChips) {
    return (
      <div className="glass-card p-4 text-center space-y-1">
        <span className="text-2xl">💸</span>
        <p className="text-white/60 text-sm font-body">Bạn hết chips!</p>
        <p className="text-white/30 text-xs font-body">Chờ host thêm chips để tiếp tục</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/40 text-xs font-body">Chọn chip</span>
        <span className="text-accent-gold font-heading font-bold text-sm">
          <ChipBadge amount={remaining} /> còn lại
        </span>
      </div>
      <div className="flex items-center justify-center gap-3">
        {CHIPS.map((chip) => {
          const disabled = chip.value > remaining;
          const selected = selectedChip === chip.value;
          return (
            <motion.button
              key={chip.value}
              onClick={() => !disabled && setSelectedChip(chip.value)}
              whileTap={!disabled ? { scale: 0.88 } : {}}
              whileHover={!disabled ? { scale: 1.08 } : {}}
              className={`relative flex flex-col items-center gap-1 transition-all duration-150
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                ${selected ? `ring-2 ${chip.ring} ring-offset-1 ring-offset-transparent rounded-full` : ''}
              `}
              disabled={disabled}
            >
              <ChipIcon color={chip.dot} value={chip.value} size={40} className="drop-shadow-lg" />
              {selected && (
                <motion.div
                  layoutId="chip-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-gold"
                />
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="text-center text-white/20 text-[10px] font-body mt-2">
        Click chip để chọn mệnh giá → click ô để đặt
      </p>
    </div>
  );
}
