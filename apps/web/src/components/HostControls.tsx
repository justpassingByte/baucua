import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, SYMBOLS } from '../store/gameStore';
import { api } from '../lib/api';
import type { Symbol } from '../store/gameStore';

export default function HostControls() {
  const { room, playerId, isHost, devControlled, setDevControlled } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const controlled: [Symbol, Symbol, Symbol] = devControlled ?? ['CUA', 'CUA', 'TOM'];

  if (!isHost || !room || !playerId) return null;

  const status = room.status;
  const canStart = status === 'WAITING' || status === 'RESULT';
  const canRoll = status === 'BETTING';

  const handleStart = async () => {
    setLoading(true);
    await api.startRound(room.id, playerId);
    setLoading(false);
  };

  const handleRoll = async () => {
    setLoading(true);
    const ctrl = devControlled ?? undefined;
    await api.rollDice(room.id, playerId, ctrl as string[] | undefined);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div className="glass-card p-4 space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">👑</span>
        <span className="font-heading font-bold text-sm text-accent-gold">Host Controls</span>
      </div>

      {canStart && (
        <button onClick={handleStart} disabled={loading} className="btn-gold w-full text-sm">
          {loading ? '⏳ Đang bắt đầu...' : '🎲 Bắt Đầu Vòng Mới'}
        </button>
      )}

      {canRoll && (
        <div className="space-y-2">
          <motion.div
            className="rounded-xl bg-accent-gold/10 border border-accent-gold/30 px-3 py-2.5 text-center"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <p className="text-accent-gold text-sm font-heading font-semibold">🎲 Hãy bấm nút để lắc xúc xắc</p>
            <p className="text-white/40 text-[11px] font-body mt-0.5">Sau đó kéo bát lên để mở</p>
          </motion.div>
          <button onClick={handleRoll} disabled={loading} className="btn-red w-full text-sm">
            {loading ? '⏳' : '🎯 Lắc Ngay'}
          </button>
        </div>
      )}

      {status === 'ROLLING' && (
        <motion.div
          className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 text-center"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <p className="text-orange-300 text-sm font-heading font-semibold">⏳ Đang lắc xúc xắc...</p>
        </motion.div>
      )}

      {status === 'REVEAL' && (
        <motion.div
          className="rounded-xl bg-accent-jade/10 border border-accent-jade/30 p-3 text-center"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <p className="text-accent-jade-bright text-sm font-heading font-semibold">👆 Hãy kéo bát lên để mở kết quả!</p>
        </motion.div>
      )}

      <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2 border border-white/[0.06]">
        <span className="text-white/40 text-xs font-body flex-1 truncate">
          {window.location.origin}/room/{room.id}
        </span>
        <button onClick={handleCopy} className="text-xs font-heading transition-colors shrink-0 text-accent-gold hover:text-yellow-300">
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      </div>

      <div className="border-t border-white/[0.06] pt-2">
        <button
          onClick={() => setDevMode(!devMode)}
          className="text-white/20 text-[10px] font-body hover:text-white/40 transition-colors"
        >
          {devMode ? '🔧 Dev Mode ON' : '🔧 Dev Mode'}
        </button>
        {devMode && (
          <motion.div className="mt-2 space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <p className="text-white/30 text-[10px] font-body">Kết quả cố định:</p>
            <div className="flex gap-2">
              {[0, 1, 2].map((idx) => (
                <select
                  key={idx}
                  value={controlled[idx]}
                  onChange={(e) => {
                    const next = [...controlled] as [Symbol, Symbol, Symbol];
                    next[idx] = e.target.value as Symbol;
                    setDevControlled(next);
                  }}
                  className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 font-body flex-1"
                >
                  {SYMBOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
