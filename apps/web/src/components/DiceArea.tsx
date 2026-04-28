import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import Timer from './Timer';
import type { Symbol } from '../store/gameStore';

const SYMBOL_IMAGE: Record<Symbol, string> = {
  BAU: '/art/symbols/bau.png',
  CUA: '/art/symbols/cua.png',
  TOM: '/art/symbols/tom.png',
  CA: '/art/symbols/ca.png',
  GA: '/art/symbols/ga.png',
  NAI: '/art/symbols/nai.png',
};

interface Props {
  onLiftBowl?: () => void;
  onBowlDragSync?: (drag: BowlDragSync) => void;
  isBowlLifting?: boolean;
  syncedBowlDrag?: BowlDragSync | null;
}

type BowlDragSync = {
  x: number;
  y: number;
  phase: 'dragging' | 'idle';
  updatedAt?: number;
};

export default function DiceArea({ onLiftBowl, onBowlDragSync, isBowlLifting, syncedBowlDrag }: Props) {
  const { isRolling, diceResult, room, isHost } = useGameStore();
  const status = room?.status;

  const bowlDragX = useMotionValue(0);
  const bowlDragY = useMotionValue(0);
  const [liftTriggered, setLiftTriggered] = useState(false);

  useEffect(() => {
    if (status === 'BETTING' || status === 'WAITING') {
      setLiftTriggered(false);
      bowlDragX.set(0);
      bowlDragY.set(0);
    }
  }, [status, bowlDragX, bowlDragY]);

  const showBowl = status === 'WAITING' || status === 'BETTING' || status === 'ROLLING' || status === 'REVEAL' || status === 'RESULT';
  const canDrag = isHost && status === 'REVEAL' && !liftTriggered && !isBowlLifting;
  const bowlOpen = liftTriggered || !!isBowlLifting || status === 'RESULT';

  useEffect(() => {
    if (isHost || !syncedBowlDrag || status !== 'REVEAL' || bowlOpen) return;

    if (syncedBowlDrag.phase === 'idle') {
      bowlDragX.set(0);
      bowlDragY.set(0);
      return;
    }

    bowlDragX.set(syncedBowlDrag.x);
    bowlDragY.set(syncedBowlDrag.y);
  }, [bowlDragX, bowlDragY, bowlOpen, isHost, status, syncedBowlDrag]);

  const handleDrag = (_: any, info: { offset: { x: number; y: number } }) => {
    if (!canDrag) return;
    onBowlDragSync?.({
      x: info.offset.x,
      y: info.offset.y,
      phase: 'dragging',
    });
  };

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number } }) => {
    const dist = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (dist > 78 && !liftTriggered && onLiftBowl) {
      onBowlDragSync?.({
        x: info.offset.x,
        y: info.offset.y,
        phase: 'dragging',
      });
      setLiftTriggered(true);
      onLiftBowl();
      return;
    }
    onBowlDragSync?.({ x: 0, y: 0, phase: 'idle' });
    bowlDragX.set(0);
    bowlDragY.set(0);
  };

  return (
    <div className="dice-arena select-none">
      <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-4">
        <div className="relative flex w-full flex-1 items-center justify-center overflow-visible min-h-[160px] h-full">
          <div className="absolute inset-x-0 top-1/2 h-36 -translate-y-1/2 rounded-full bg-black/20 blur-3xl" />

          <AnimatePresence>
            {!isRolling && diceResult && (
              <motion.div
                key="result"
                className="absolute inset-0 flex items-center justify-center z-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative flex h-full w-full max-h-[220px] max-w-[280px] sm:max-h-[300px] sm:max-w-[380px] lg:max-h-[360px] lg:max-w-[460px] flex-col items-center justify-center gap-2 sm:gap-4 lg:gap-5">
                  <motion.div
                    className="dice-flat-card dice-flat-card-top w-[90px] h-[90px] sm:w-[130px] sm:h-[130px] lg:w-[150px] lg:h-[150px] shrink-0"
                    initial={{ scale: 0, opacity: 0, y: 24 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ delay: 0.04, duration: 0.45, type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    <img src={SYMBOL_IMAGE[diceResult[0]]} alt={diceResult[0]} className="dice-flat-art" draggable={false} />
                  </motion.div>

                  <div className="flex w-full items-center justify-center gap-4 sm:gap-7 px-4">
                    {diceResult.slice(1).map((sym, i) => (
                    <motion.div
                      key={i}
                      className="dice-flat-card w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] lg:w-[130px] lg:h-[130px] shrink-0"
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.08, duration: 0.42, type: 'spring', stiffness: 250, damping: 18 }}
                    >
                      <img src={SYMBOL_IMAGE[sym]} alt={sym} className="dice-flat-art" draggable={false} />
                    </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showBowl && (
              <motion.div
                key="bowl-stage"
                className="absolute inset-0 flex items-center justify-center z-10"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
              >
                {!bowlOpen && (
                  <motion.div
                    className="relative"
                    style={{ x: bowlDragX, y: bowlDragY }}
                    drag={canDrag}
                    dragConstraints={{ top: -300, bottom: 300, left: -300, right: 300 }}
                    dragElastic={0.22}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    whileDrag={{ scale: 1.05 }}
                  >
                    <TopDownBowl lifting={canDrag} rolling={isRolling || status === 'ROLLING'} />

                    {canDrag && (
                      <motion.div
                        className="bowl-hint"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 1.35, repeat: Infinity }}
                      >
                        Kéo bát lên để mở
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {bowlOpen && (
                  <motion.div
                    className="relative pointer-events-none"
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: -250, opacity: 0, scale: 0.72, rotate: -8 }}
                    transition={{ duration: 0.7, ease: [0.36, 0, 0.66, -0.56] }}
                  >
                    <TopDownBowl lifting={false} rolling={false} />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {room?.currentRound && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
              <Timer endsAt={room.currentRound.endsAt} active={status === 'BETTING'} />
            </div>
          )}


        </div>
      </div>
    </div>
  );
}

function TopDownBowl({ lifting, rolling }: { lifting: boolean; rolling: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 520 520"
      className="h-[280px] w-[280px] sm:h-[400px] sm:w-[400px] lg:h-[500px] lg:w-[500px] drop-shadow-[0_26px_44px_rgba(0,0,0,0.34)]"
      animate={rolling ? { rotate: [-1.5, 1.5, -1, 1, 0], scale: [1, 1.01, 0.995, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.35, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.24 }}
    >
      <defs>
        <radialGradient id="bowlOuter" cx="36%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#f6ddbb" />
          <stop offset="45%" stopColor="#a56a2f" />
          <stop offset="100%" stopColor="#5c3516" />
        </radialGradient>
        <radialGradient id="bowlInner" cx="40%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#705031" />
          <stop offset="52%" stopColor="#3b2314" />
          <stop offset="100%" stopColor="#1e120b" />
        </radialGradient>
        <radialGradient id="bowlBottom" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#8a6240" />
          <stop offset="55%" stopColor="#51311d" />
          <stop offset="100%" stopColor="#2a180f" />
        </radialGradient>
        <radialGradient id="gloss" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <ellipse cx="260" cy="488" rx="190" ry="34" fill="rgba(0,0,0,0.36)" />

      <circle cx="260" cy="270" r="250" fill="url(#bowlOuter)" opacity="0.95" />
      <circle cx="260" cy="270" r="208" fill="url(#bowlInner)" />
      <circle cx="260" cy="270" r="150" fill="url(#bowlBottom)" />

      <circle cx="260" cy="270" r="170" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="12" />
      <circle cx="260" cy="270" r="252" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <ellipse cx="205" cy="200" rx="92" ry="42" fill="url(#gloss)" opacity="0.26" />
      <ellipse cx="248" cy="226" rx="64" ry="26" fill="rgba(255,255,255,0.08)" />

      <g opacity={rolling ? 1 : 0.9}>
        <motion.circle
          cx="260"
          cy="270"
          r="82"
          fill="rgba(255,255,255,0.06)"
          animate={rolling ? { r: [68, 72, 69] } : { r: 70 }}
          transition={rolling ? { duration: 0.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        />
        <circle cx="260" cy="258" r="42" fill="rgba(0,0,0,0.18)" />
      </g>

      {lifting && (
        <circle cx="260" cy="270" r="262" fill="none" stroke="#f6ad55" strokeWidth="4" strokeDasharray="14 10" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" from="0 260 270" to="360 260 270" dur="7s" repeatCount="indefinite" />
        </circle>
      )}
    </motion.svg>
  );
}
