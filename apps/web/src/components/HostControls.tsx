import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, SYMBOLS } from '../store/gameStore';
import { api } from '../lib/api';
import type { Symbol } from '../store/gameStore';

const CHIP_AMOUNTS = [100, 500, 1000, 5000];

export default function HostControls() {
  const { room, playerId, isHost, devControlled, setDevControlled } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChipManager, setShowChipManager] = useState(false);
  const [chipTarget, setChipTarget] = useState<string | null>(null);
  const [chipLoading, setChipLoading] = useState(false);
  const [chipMsg, setChipMsg] = useState<string | null>(null);
  const controlled: [Symbol, Symbol, Symbol] = devControlled ?? ['CUA', 'CUA', 'TOM'];

  if (!isHost || !room || !playerId) return null;

  const status = room.status;
  const canStart = status === 'WAITING' || status === 'RESULT';
  const canRoll  = status === 'BETTING'; // fallback roll button

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

  const handleAddChips = async (targetPlayerId: string, amount: number) => {
    setChipLoading(true);
    setChipMsg(null);
    const res = await api.addChips(room.id, playerId, targetPlayerId, amount);
    if (res.success) {
      const targetName = room.players[targetPlayerId]?.name || targetPlayerId;
      setChipMsg(`✅ +${amount} cho ${targetPlayerId === playerId ? 'bạn' : targetName}`);
    } else {
      setChipMsg(`❌ ${res.error || 'Lỗi'}`);
    }
    setChipLoading(false);
    setTimeout(() => setChipMsg(null), 2000);
  };

  const players = Object.values(room.players);

  return (
    <motion.div className="glass-card p-4 space-y-3"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">👑</span>
        <span className="font-heading font-bold text-sm text-accent-gold">Host Controls</span>
      </div>

      {/* Start Round */}
      {canStart && (
        <button onClick={handleStart} disabled={loading} className="btn-gold w-full text-sm">
          {loading ? '⏳ Đang bắt đầu...' : '🎲 Bắt Đầu Vòng Mới'}
        </button>
      )}

      {/* During BETTING: hint to drag bowl + fallback roll button */}
      {canRoll && (
        <div className="space-y-2">
          <motion.div
            className="rounded-xl bg-accent-gold/10 border border-accent-gold/30 px-3 py-2.5 text-center"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity }}>
            <p className="text-accent-gold text-sm font-heading font-semibold">🥣 Bạn có thể lắc bát rồi kéo lên</p>
            <p className="text-white/40 text-[11px] font-body mt-0.5">hoặc bấm nút bên dưới</p>
          </motion.div>
          <button onClick={handleRoll} disabled={loading} className="btn-red w-full text-sm">
            {loading ? '⏳' : '🎯 Lắc Ngay'}
          </button>
        </div>
      )}

      {/* Status hint during ROLLING */}
      {status === 'ROLLING' && (
        <motion.div
          className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 text-center"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity }}>
          <p className="text-orange-300 text-sm font-heading font-semibold">⏳ Đang lắc xúc xắc...</p>
        </motion.div>
      )}

      {/* Chip Manager */}
      <div className="border-t border-white/[0.06] pt-2">
        <button onClick={() => setShowChipManager(!showChipManager)}
          className="flex items-center gap-2 text-sm font-heading font-semibold text-accent-gold/80 hover:text-accent-gold transition-colors w-full">
          <span>💰</span>
          <span>{showChipManager ? 'Ẩn Quản Lý Chips' : 'Quản Lý Chips'}</span>
        </button>

        <AnimatePresence>
          {showChipManager && (
            <motion.div className="mt-3 space-y-2"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>

              {/* Chip feedback message */}
              {chipMsg && (
                <motion.div
                  className="text-center text-xs font-body py-1.5 px-3 rounded-lg bg-white/[0.05]"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {chipMsg}
                </motion.div>
              )}

              {/* Player list with add buttons */}
              {players.map((p) => {
                const isMe = p.id === playerId;
                return (
                  <div key={p.id}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
                      isMe ? 'bg-accent-gold/10 border-accent-gold/20' : 'bg-white/[0.03] border-white/[0.06]'
                    }`}>
                    <span className="text-sm shrink-0">{isMe ? '👑' : '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-body truncate ${isMe ? 'text-accent-gold' : 'text-white/70'}`}>
                        {p.name}{isMe ? ' (bạn)' : ''}
                      </p>
                      <p className="text-[10px] font-heading text-accent-gold/60">{p.chips} chips</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {CHIP_AMOUNTS.map((amt) => (
                        <button key={amt}
                          onClick={() => handleAddChips(p.id, amt)}
                          disabled={chipLoading}
                          className="text-[9px] font-heading font-bold px-1.5 py-1 rounded-lg bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/30 transition-colors disabled:opacity-40">
                          +{amt >= 1000 ? `${amt/1000}k` : amt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share link */}
      <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2 border border-white/[0.06]">
        <span className="text-white/40 text-xs font-body flex-1 truncate">
          {window.location.origin}/room/{room.id}
        </span>
        <button onClick={handleCopy}
          className="text-xs font-heading transition-colors shrink-0 text-accent-gold hover:text-yellow-300">
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      </div>

      {/* Dev Mode */}
      <div className="border-t border-white/[0.06] pt-2">
        <button onClick={() => setDevMode(!devMode)}
          className="text-white/20 text-[10px] font-body hover:text-white/40 transition-colors">
          {devMode ? '🔧 Dev Mode ON' : '🔧 Dev Mode'}
        </button>
        {devMode && (
          <motion.div className="mt-2 space-y-2"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <p className="text-white/30 text-[10px] font-body">Kết quả cố định:</p>
            <div className="flex gap-2">
              {[0, 1, 2].map((idx) => (
                <select key={idx} value={controlled[idx]}
                  onChange={(e) => {
                    const next = [...controlled] as [Symbol, Symbol, Symbol];
                    next[idx] = e.target.value as Symbol;
                    setDevControlled(next);
                  }}
                  className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 font-body flex-1">
                  {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
