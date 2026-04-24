import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import { ChipBadge } from './ChipIcon';
import type { Symbol } from '../store/gameStore';

const SYMBOL_IMAGE: Record<Symbol, string> = {
  BAU: '/art/symbols/bau.png',
  CUA: '/art/symbols/cua.png',
  TOM: '/art/symbols/tom.png',
  CA: '/art/symbols/ca.png',
  GA: '/art/symbols/ga.png',
  NAI: '/art/symbols/nai.png',
};

const LABEL: Record<Symbol, string> = {
  BAU: 'Bầu',
  CUA: 'Cua',
  TOM: 'Tôm',
  CA: 'Cá',
  GA: 'Gà',
  NAI: 'Nai',
};

const TRI = [
  { x: 0, y: -44 },
  { x: -44, y: 22 },
  { x: 44, y: 22 },
];

export default function ResultOverlay() {
  const { playerId, isHost, lastPayouts, setShowResult, diceResult, room } = useGameStore();

  const netProfit = playerId && lastPayouts && playerId in lastPayouts ? lastPayouts[playerId] : 0;
  const isWinner = netProfit > 0;
  const isLoss = netProfit < 0;

  const hasPlayerBet = playerId != null
    ? (room?.currentRound?.bets?.some((bet) => bet.playerId === playerId) ?? false)
    : false;
  const hasPlayed = isHost
    ? (room?.currentRound?.bets?.length ?? 0) > 0
    : (hasPlayerBet || (playerId != null && lastPayouts != null && playerId in lastPayouts));

  const playerResults: { name: string; profit: number }[] = [];
  if (isHost && lastPayouts && room) {
    for (const [pid, profit] of Object.entries(lastPayouts)) {
      if (pid === playerId) continue;
      const player = room.players[pid];
      if (player) playerResults.push({ name: player.name, profit });
    }
    playerResults.sort((a, b) => b.profit - a.profit);
  }

  useEffect(() => {
    if (isWinner) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#F6AD55', '#FCD34D', '#4FD1C5', '#fc5c65'],
      });
    }
  }, [isWinner]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-md sm:items-center sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowResult(false)}
    >
      <motion.div
        className="glass-card relative w-full max-w-sm overflow-hidden p-8 text-center"
        style={{ background: 'rgba(18, 18, 44, 0.92)', maxHeight: '85vh', overflowY: 'auto' }}
        initial={{ scale: 0.6, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.6, opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none ${
            isWinner ? 'bg-accent-jade/5' : isLoss ? 'bg-red-500/5' : 'bg-white/[0.02]'
          }`}
        />

        <motion.div
          className="mb-3 relative text-6xl"
          animate={{ rotate: [0, 12, -12, 6, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {isWinner ? '🎉' : isLoss ? '😢' : '😐'}
        </motion.div>

        <h2
          className={`relative mb-1 text-2xl font-heading font-bold ${
            isWinner ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/60'
          }`}
        >
          {isWinner ? 'Thắng rồi!' : isLoss ? 'Thua rồi!' : hasPlayed ? 'Hòa!' : 'Không đặt cược'}
        </h2>

        <AnimatePresence>
          {netProfit !== 0 && (
            <motion.p
              className={`relative mb-5 flex items-center justify-center gap-2 text-4xl font-heading font-bold ${
                netProfit > 0 ? 'text-accent-gold' : 'text-red-400'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.25 }}
            >
              <ChipBadge amount={Math.abs(netProfit)} color={netProfit > 0 ? '#F6AD55' : '#f87171'} size={28} />
              <span className="text-xl">{netProfit > 0 ? ' (Thắng)' : ' (Thua)'}</span>
            </motion.p>
          )}
          {netProfit === 0 && hasPlayed && !isHost && (
            <motion.p
              className="relative mb-5 flex items-center justify-center text-2xl font-heading font-bold text-white/50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.25 }}
            >
              Huề vốn
            </motion.p>
          )}
        </AnimatePresence>

        {isHost && playerResults.length > 0 && (
          <motion.div
            className="relative mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="mb-2 text-xs uppercase tracking-wider text-white/40 font-body">Kết quả người chơi</p>
            <div className="space-y-1.5">
              {playerResults.map((pr, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    pr.profit > 0
                      ? 'border border-emerald-500/20 bg-emerald-500/10'
                      : pr.profit < 0
                        ? 'border border-red-500/20 bg-red-500/10'
                        : 'border border-white/10 bg-white/5'
                  }`}
                >
                  <span className="truncate font-body text-white/80">{pr.name}</span>
                  <span className={`font-heading font-bold ${
                    pr.profit > 0 ? 'text-emerald-400' : pr.profit < 0 ? 'text-red-400' : 'text-white/50'
                  }`}>
                    {pr.profit > 0 ? '+' : ''}{pr.profit}
                    <span className="ml-0.5 text-[10px] font-body">
                      {pr.profit > 0 ? '(Thắng)' : pr.profit < 0 ? '(Thua)' : '(Hòa)'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div
              className={`mt-2 flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                netProfit > 0
                  ? 'border-emerald-500/30 bg-emerald-500/15'
                  : netProfit < 0
                    ? 'border-red-500/30 bg-red-500/15'
                    : 'border-white/10 bg-white/5'
              }`}
            >
              <span className="font-body text-accent-gold">👑 Nhà cái (bạn)</span>
              <span className={`font-heading font-bold ${
                netProfit > 0 ? 'text-emerald-400' : netProfit < 0 ? 'text-red-400' : 'text-white/50'
              }`}>
                {netProfit > 0 ? '+' : ''}{netProfit}
              </span>
            </div>
          </motion.div>
        )}

        {diceResult && (
          <div className="relative mb-6 flex h-[110px] items-center justify-center">
            {diceResult.map((sym, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 flex flex-col items-center"
                style={{ left: '50%', top: '50%' }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x: TRI[i].x, y: TRI[i].y, scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="dice-face-result" style={{ width: 58, height: 64, transform: 'translate(-50%, -50%)' }}>
                  <img src={SYMBOL_IMAGE[sym as Symbol]} alt={LABEL[sym as Symbol]} className="h-[84%] w-[84%] object-contain" draggable={false} />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <button onClick={() => setShowResult(false)} className="btn-outline w-full text-sm">
          Đóng
        </button>

        <p className="mt-3 text-[10px] font-body text-white/20">Tap bên ngoài để đóng</p>
      </motion.div>
    </motion.div>
  );
}
