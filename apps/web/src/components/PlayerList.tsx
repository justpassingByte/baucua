import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ChipBadge } from './ChipIcon';

export default function PlayerList() {
  const { room, playerId, lastPayouts } = useGameStore();
  if (!room) return null;

  const players = Object.values(room.players).sort((a, b) => b.chips - a.chips);

  return (
    <div className="glass-card p-4">
      <h3 className="font-heading font-bold text-sm text-white/60 mb-3 tracking-wider uppercase flex items-center gap-2">
        <span>👥</span> Người chơi
        <span className="ml-auto bg-white/10 text-white/50 text-[10px] px-2 py-0.5 rounded-full font-body normal-case tracking-normal">
          {players.filter(p => p.connected).length}/{players.length}
        </span>
      </h3>

      <div className="space-y-2">
        {players.map((p, i) => {
          const isMe = p.id === playerId;
          const payout = lastPayouts?.[p.id] || 0;
          const noChips = p.chips <= 0;
          const offline = !p.connected;

          return (
            <motion.div key={p.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors
                ${isMe       ? 'bg-accent-gold/12 border border-accent-gold/25' : ''}
                ${offline    ? 'opacity-40' : ''}
                ${noChips && !isMe && !offline ? 'bg-red-500/5 border border-red-500/10' : ''}
                ${!isMe && !noChips && !offline ? 'bg-white/[0.03] border border-white/[0.04]' : ''}
              `}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: offline ? 0.4 : 1, x: 0 }}
              transition={{ delay: i * 0.05 }}>

              {/* Avatar + name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">
                  {p.isHost ? '👑' : offline ? '👻' : '🎮'}
                </span>
                <div className="min-w-0">
                  <span className={`font-body text-sm truncate block ${isMe ? 'text-accent-gold font-semibold' : offline ? 'text-white/30' : 'text-white/80'}`}>
                    {p.name}{isMe ? ' (bạn)' : ''}
                  </span>
                  {offline && (
                    <span className="text-[9px] text-white/30 font-body">mất kết nối</span>
                  )}
                  {noChips && !offline && (
                    <span className="text-[9px] text-red-400 font-body">💸 hết chips</span>
                  )}
                </div>
              </div>

              {/* Payout + chips */}
              <div className="flex items-center gap-2 shrink-0">
                <AnimatePresence>
                  {payout !== 0 && (
                    <motion.span
                      className={`text-xs font-heading font-bold ${payout > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}>
                      {payout > 0 ? '+' : ''}{payout}
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className={`font-heading font-bold text-sm ${noChips ? 'text-red-400' : 'text-accent-gold'}`}>
                  <ChipBadge amount={p.chips} color={noChips ? '#f87171' : '#F6AD55'} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
