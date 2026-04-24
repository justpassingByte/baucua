import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import { ChipBadge } from './ChipIcon';

const EMOJI: Record<string, string> = {
  BAU: '🍐', CUA: '🦀', TOM: '🦐', CA: '🐟', GA: '🐓', NAI: '🦌',
};
const LABEL: Record<string, string> = {
  BAU: 'Bầu', CUA: 'Cua', TOM: 'Tôm', CA: 'Cá', GA: 'Gà', NAI: 'Nai',
};

// Triangle positions matching DiceArea
const TRI = [
  { x: 0,   y: -44 },
  { x: -44, y: 22  },
  { x: 44,  y: 22  },
];

export default function ResultOverlay() {
  const { playerId, isHost, lastPayouts, setShowResult, diceResult, myBets, room } = useGameStore();
  
  // Get the net profit for the current player from payouts
  const netProfit = (playerId && lastPayouts && playerId in lastPayouts) 
    ? lastPayouts[playerId] 
    : 0;

  const isWinner = netProfit > 0;
  const isLoss   = netProfit < 0;
  
  // Determine if the player actually participated this round
  // For host: check if there were any bets at all (host always "plays" as the house)
  // For player: check if they have any bets in the round OR if they appear in payouts
  const hasPlayed = isHost 
    ? (room?.currentRound?.bets?.length ?? 0) > 0
    : (Object.values(myBets).some(v => v > 0) || (playerId != null && lastPayouts != null && playerId in lastPayouts));

  // For the host, build a summary of all player results
  const playerResults: { name: string; profit: number }[] = [];
  if (isHost && lastPayouts && room) {
    for (const [pid, profit] of Object.entries(lastPayouts)) {
      if (pid === playerId) continue; // skip host's own entry
      const player = room.players[pid];
      if (player) {
        playerResults.push({ name: player.name, profit });
      }
    }
    // Sort: winners first, then losers
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-6 sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowResult(false)}>

      <motion.div
        className="glass-card p-8 text-center w-full max-w-sm relative overflow-hidden"
        style={{ background: 'rgba(18, 18, 44, 0.92)', maxHeight: '85vh', overflowY: 'auto' }}
        initial={{ scale: 0.6, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.6, opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        onClick={(e) => e.stopPropagation()}>

        {/* Glow bg */}
        <div className={`absolute inset-0 rounded-2xl pointer-events-none ${
          isWinner ? 'bg-accent-jade/5' : isLoss ? 'bg-red-500/5' : 'bg-white/[0.02]'
        }`} />

        {/* Result emoji */}
        <motion.div className="text-6xl mb-3 relative"
          animate={{ rotate: [0, 12, -12, 6, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}>
          {isWinner ? '🎉' : isLoss ? '😢' : '😐'}
        </motion.div>

        {/* Title */}
        <h2 className={`font-heading font-bold text-2xl mb-1 relative ${
          isWinner ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/60'
        }`}>
          {isWinner ? 'Thắng rồi!' : isLoss ? 'Thua rồi!' : (hasPlayed ? 'Hòa!' : 'Không đặt cược')}
        </h2>

        {/* Payout amount */}
        <AnimatePresence>
          {netProfit !== 0 && (
            <motion.p
              className={`font-heading font-bold text-4xl flex items-center justify-center gap-2 mb-5 relative ${netProfit > 0 ? 'text-accent-gold' : 'text-red-400'}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.25 }}>
              <ChipBadge amount={Math.abs(netProfit)} color={netProfit > 0 ? '#F6AD55' : '#f87171'} size={28} />
              <span className="text-xl">{netProfit > 0 ? ' (Thắng)' : ' (Thua)'}</span>
            </motion.p>
          )}
          {netProfit === 0 && hasPlayed && !isHost && (
            <motion.p
              className="font-heading font-bold text-2xl flex items-center justify-center mb-5 relative text-white/50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.25 }}>
              Huề vốn
            </motion.p>
          )}
        </AnimatePresence>

        {/* Host: show all player results */}
        {isHost && playerResults.length > 0 && (
          <motion.div
            className="mb-5 relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}>
            <p className="text-white/40 text-xs font-body mb-2 uppercase tracking-wider">Kết quả người chơi</p>
            <div className="space-y-1.5">
              {playerResults.map((pr, idx) => (
                <div key={idx}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                    pr.profit > 0 
                      ? 'bg-emerald-500/10 border border-emerald-500/20' 
                      : pr.profit < 0 
                      ? 'bg-red-500/10 border border-red-500/20' 
                      : 'bg-white/5 border border-white/10'
                  }`}>
                  <span className="font-body text-white/80 truncate">{pr.name}</span>
                  <span className={`font-heading font-bold ${
                    pr.profit > 0 ? 'text-emerald-400' : pr.profit < 0 ? 'text-red-400' : 'text-white/50'
                  }`}>
                    {pr.profit > 0 ? '+' : ''}{pr.profit}
                    <span className="text-[10px] ml-0.5 font-body">
                      {pr.profit > 0 ? '(Thắng)' : pr.profit < 0 ? '(Thua)' : '(Hòa)'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {/* Host's net */}
            <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-xl text-sm border ${
              netProfit > 0 
                ? 'bg-emerald-500/15 border-emerald-500/30' 
                : netProfit < 0 
                ? 'bg-red-500/15 border-red-500/30' 
                : 'bg-white/5 border-white/10'
            }`}>
              <span className="font-body text-accent-gold">👑 Nhà cái (bạn)</span>
              <span className={`font-heading font-bold ${
                netProfit > 0 ? 'text-emerald-400' : netProfit < 0 ? 'text-red-400' : 'text-white/50'
              }`}>
                {netProfit > 0 ? '+' : ''}{netProfit}
              </span>
            </div>
          </motion.div>
        )}

        {/* Dice result in triangle */}
        {diceResult && (
          <div className="relative flex items-center justify-center mb-6" style={{ height: 110 }}>
            {diceResult.map((sym, i) => (
              <motion.div key={i}
                className="absolute flex flex-col items-center"
                style={{ left: '50%', top: '50%' }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x: TRI[i].x, y: TRI[i].y, scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 260, damping: 18 }}>
                <div className="dice-face-result" style={{ width: 58, height: 64, transform: 'translate(-50%, -50%)' }}>
                  <span className="text-2xl">{EMOJI[sym]}</span>
                  <span className="dice-sym-label">{LABEL[sym]}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <button onClick={() => setShowResult(false)} className="btn-outline text-sm w-full">
          Đóng
        </button>

        <p className="text-white/20 text-[10px] font-body mt-3">Tap bên ngoài để đóng</p>
      </motion.div>
    </motion.div>
  );
}
