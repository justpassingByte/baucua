import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Symbol } from '../store/gameStore';

const EMOJI: Record<Symbol, string> = {
  BAU: '🍐', CUA: '🦀', TOM: '🦐', CA: '🐟', GA: '🐓', NAI: '🦌',
};

const SYMBOL_LABEL: Record<Symbol, string> = {
  BAU: 'Bầu', CUA: 'Cua', TOM: 'Tôm', CA: 'Cá', GA: 'Gà', NAI: 'Nai',
};

// Triangle layout: top-center, bottom-left, bottom-right
const TRI = [
  { x: 0,   y: -52 },
  { x: -52, y: 26  },
  { x: 52,  y: 26  },
];

interface Props {
  onLiftBowl?: () => void;
  isBowlLifting?: boolean;
}

export default function DiceArea({ onLiftBowl, isBowlLifting }: Props) {
  const { isRolling, diceResult, room, isHost } = useGameStore();
  const status = room?.status;

  const bowlDragX = useMotionValue(0);
  const bowlDragY = useMotionValue(0);

  const [isDragging, setIsDragging] = useState(false);
  const [liftTriggered, setLiftTriggered] = useState(false);
  const liftThreshold = -70; // Lift threshold is now 70px

  // Reset when a new round starts
  useEffect(() => {
    if (status === 'BETTING' || status === 'WAITING') {
      setLiftTriggered(false);
      bowlDragY.set(0);
      bowlDragX.set(0);
    }
  }, [status]);

  const handleDragEnd = (_: any, info: { offset: { y: number } }) => {
    if (info.offset.y < liftThreshold && !liftTriggered && onLiftBowl) {
      setLiftTriggered(true);
      onLiftBowl();
    } else {
      // Snap back smoothly
      bowlDragY.set(0);
      bowlDragX.set(0);
    }
  };

  // Bowl visible in WAITING, BETTING, ROLLING — hidden when REVEAL/RESULT
  const showBowl = status === 'WAITING' || status === 'BETTING' || status === 'ROLLING' || (isRolling && !diceResult);
  // Host can drag during BETTING (locks bets + rolls dice)
  const canDrag = isHost && (status === 'BETTING') && !liftTriggered;
  // Bowl is flying off
  const bowlOpen = liftTriggered || (!!isBowlLifting && !isHost);

  return (
    <div className="dice-arena flex flex-col items-center gap-4 select-none">
      {/* Central stage */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 210 }}>

        {/* ── Bowl + dice scene (WAITING / BETTING / ROLLING) ── */}
        <AnimatePresence>
          {showBowl && (
            <motion.div key="bowl-scene"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}>

              {/* Dice silhouettes shaking under bowl — only visible in ROLLING */}
              {(isRolling || status === 'ROLLING') && !bowlOpen && TRI.map((pos, i) => (
                <motion.div key={i}
                  className="absolute dice-face-rolling"
                  style={{ left: '50%', top: '50%' }}
                  animate={{
                    x: [pos.x - 5, pos.x + 5, pos.x - 3, pos.x],
                    y: [pos.y - 5, pos.y + 5, pos.y],
                    rotate: [0, 15, -12, 0],
                  }}
                  transition={{ duration: 0.22, repeat: Infinity, delay: i * 0.07, ease: 'easeInOut' }}>
                  <span className="text-xl">🎲</span>
                </motion.div>
              ))}

              {/* Bowl lid */}
              {!bowlOpen && (
                <div className="absolute z-20" style={{ left: '50%', top: 'calc(50% - 55px)', transform: 'translate(-50%, 0)' }}>
                  <motion.div
                    key="bowl"
                    className={`bowl-lid ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                    style={{
                      x: bowlDragX,
                      y: bowlDragY,
                    }}
                    drag={canDrag ? true : false}
                    dragConstraints={{ top: -140, bottom: 20, left: -60, right: 60 }}
                    dragElastic={0.25}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={(e, info) => { setIsDragging(false); handleDragEnd(e, info); }}
                    whileDrag={{ scale: 1.04 }}
                    initial={{ y: 0 }}
                    exit={{ y: -200, opacity: 0, scale: 0.5, transition: { duration: 0.55, ease: 'backIn' } }}
                  >
                    <BowlSVG
                      shaking={isRolling || status === 'ROLLING'}
                      glowing={canDrag}
                    />

                    {/* Drag hint for host during BETTING */}
                    {canDrag && !isDragging && (
                      <motion.div
                        className="bowl-hint"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity }}>
                        ↑ Lắc bát rồi kéo lên
                      </motion.div>
                    )}

                    {/* Gentle idle bob when WAITING */}
                    {(status === 'WAITING' || (status === 'BETTING' && !canDrag)) && (
                      <motion.div className="absolute inset-0 pointer-events-none"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
                    )}
                  </motion.div>
                </div>
              )}

              {/* Bowl flying off after lift */}
              {bowlOpen && (
                <div className="absolute z-20 pointer-events-none" style={{ left: '50%', top: 'calc(50% - 55px)', transform: 'translate(-50%, 0)' }}>
                  <motion.div key="bowl-gone"
                    className="bowl-lid"
                    initial={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                    animate={{ y: -240, opacity: 0, scale: 0.4, rotate: -20 }}
                    transition={{ duration: 0.65, ease: [0.36, 0, 0.66, -0.56] }}>
                    <BowlSVG shaking={false} glowing={false} />
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Dice reveal (REVEAL / RESULT) ── */}
        <AnimatePresence>
          {!isRolling && diceResult && (
            <motion.div key="result"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {diceResult.map((sym, i) => (
                <motion.div key={i}
                  className="absolute dice-face-result"
                  style={{ left: '50%', top: '50%' }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: TRI[i].x, y: TRI[i].y,
                    scale: 1, rotate: [0, 14, -10, 0], opacity: 1,
                  }}
                  transition={{ delay: i * 0.15, duration: 0.5, type: 'spring', stiffness: 240, damping: 18 }}>
                  <span className="text-3xl">{EMOJI[sym]}</span>
                  <span className="dice-sym-label">{SYMBOL_LABEL[sym]}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Caption */}
      <motion.p className="status-caption"
        key={`${status}-${liftTriggered}`}
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        {liftTriggered || isBowlLifting
          ? '✨ Đang mở bát...'
          : isRolling
          ? '🎲 Đang lắc...'
          : diceResult
          ? '🏆 Kết quả!'
          : status === 'BETTING'
          ? (isHost ? '🎲 Bạn có thể lắc bát (kéo qua lại) rồi mở lên!' : '🎯 Đặt cược đi!')
          : status === 'WAITING'
          ? '⏳ Chờ host bắt đầu...'
          : '✅ Xong!'}
      </motion.p>
    </div>
  );
}

// ─── Bowl SVG ────────────────────────────────────────────────
function BowlSVG({ shaking, glowing }: { shaking: boolean; glowing: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 160 115" width={160} height={115}
      animate={shaking
        ? { rotate: [-4, 4, -3, 3, -2, 2, 0] }
        : { rotate: 0 }}
      transition={shaking
        ? { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
        : { duration: 0.3 }}>

      {/* Drop shadow ellipse */}
      <ellipse cx="80" cy="110" rx="62" ry="6" fill="rgba(0,0,0,0.4)" />

      {/* Bowl body */}
      <path d="M 16 62 Q 16 108 80 108 Q 144 108 144 62 Z"
        fill="url(#bG)" stroke="url(#bR)" strokeWidth="2.5" />

      {/* Rim ellipse */}
      <ellipse cx="80" cy="62" rx="64" ry="16"
        fill="url(#rG)" stroke="url(#bR)" strokeWidth="2" />

      {/* Inner shadow on rim */}
      <ellipse cx="80" cy="62" rx="52" ry="11" fill="rgba(0,0,0,0.18)" />

      {/* Highlight */}
      <ellipse cx="52" cy="58" rx="22" ry="6" fill="rgba(255,255,255,0.18)" />

      {/* Knob stem */}
      <rect x="74" y="42" width="12" height="14" rx="4"
        fill="url(#kG)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Knob cap */}
      <ellipse cx="80" cy="42" rx="13" ry="6"
        fill="url(#kG)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <ellipse cx="80" cy="40" rx="7" ry="3.5" fill="rgba(255,255,255,0.25)" />

      {/* Gold dashed ring when host can drag */}
      {glowing && (
        <ellipse cx="80" cy="62" rx="65" ry="17"
          fill="none" stroke="#F6AD55" strokeWidth="2"
          strokeDasharray="6 4" opacity="0.75">
          <animateTransform attributeName="transform" type="rotate"
            from="0 80 62" to="360 80 62" dur="6s" repeatCount="indefinite" />
        </ellipse>
      )}

      <defs>
        <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4a3820" />
          <stop offset="55%"  stopColor="#2e200e" />
          <stop offset="100%" stopColor="#1a1008" />
        </linearGradient>
        <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#7a5c30" />
          <stop offset="100%" stopColor="#3d2a10" />
        </linearGradient>
        <linearGradient id="bR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#a06820" />
          <stop offset="40%"  stopColor="#f0c060" />
          <stop offset="100%" stopColor="#a06820" />
        </linearGradient>
        <linearGradient id="kG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#d4982c" />
          <stop offset="100%" stopColor="#7a5010" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}
