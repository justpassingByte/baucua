import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, SYMBOLS } from '../store/gameStore';
import { api } from '../lib/api';
import { ChipIcon } from './ChipIcon';
import type { Symbol, Bet } from '../store/gameStore';

const SC: Record<Symbol, { emoji: string; vi: string; gradient: string; glow: string; accent: string }> = {
  BAU: { emoji: '🍐', vi: 'Bầu', gradient: 'from-emerald-500/20 to-green-600/10', glow: 'rgba(16,185,129,0.3)',  accent: '#4ade80' },
  CUA: { emoji: '🦀', vi: 'Cua', gradient: 'from-red-500/20 to-rose-600/10',     glow: 'rgba(239,68,68,0.3)',   accent: '#f87171' },
  TOM: { emoji: '🦐', vi: 'Tôm', gradient: 'from-orange-500/20 to-amber-600/10', glow: 'rgba(249,115,22,0.3)',  accent: '#fb923c' },
  CA:  { emoji: '🐟', vi: 'Cá',  gradient: 'from-blue-500/20 to-cyan-600/10',    glow: 'rgba(59,130,246,0.3)', accent: '#60a5fa' },
  GA:  { emoji: '🐓', vi: 'Gà',  gradient: 'from-yellow-500/20 to-amber-500/10', glow: 'rgba(234,179,8,0.3)',  accent: '#facc15' },
  NAI: { emoji: '🦌', vi: 'Nai', gradient: 'from-purple-500/20 to-violet-600/10',glow: 'rgba(168,85,247,0.3)', accent: '#c084fc' },
};

export default function BettingGrid() {
  const { room, playerId, selectedChip, myBets, isHost, addMyBet, removeMyBet, diceResult } = useGameStore();
  const isBetting = room?.status === 'BETTING';
  const [betError, setBetError] = useState<string | null>(null);

  // Compute how much of host's capacity remains for new bets (client-side hint)
  const hostMaxBet = (() => {
    if (!room?.currentRound || !room.players[room.hostId]) return null;
    const hostChips = room.players[room.hostId].chips;
    const usedLiability = (room.currentRound.bets || []).reduce((sum, b) => sum + b.amount * 3, 0);
    return Math.floor((hostChips - usedLiability) / 3);
  })();

  const handleBet = async (symbol: Symbol) => {
    if (!isBetting || !room || !playerId || isHost) return;
    const player = room.players[playerId];
    if (!player) return;

    if (player.chips <= 0) return;
    if (selectedChip > player.chips) return;

    // Client-side capacity pre-check
    if (hostMaxBet !== null && selectedChip > hostMaxBet) {
      setBetError(
        hostMaxBet <= 0
          ? 'Host đã hết khả năng đền – yêu cầu host thêm chips'
          : `Cược tối đa ${hostMaxBet} chips (host chỉ đủ đền đến mức này)`
      );
      setTimeout(() => setBetError(null), 3000);
      return;
    }

    // Optimistic update
    addMyBet(symbol, selectedChip);
    setBetError(null);

    const res = await api.placeBet(room.id, playerId, symbol, selectedChip);
    if (!res.success) {
      // Revert optimistic update
      removeMyBet(symbol, selectedChip);
      // Use maxAllowedBet from server response if available
      const maxFromServer = (res as any).maxAllowedBet;
      const msg = res.error || 'Đặt cược thất bại';
      
      // Nếu server trả về maxAllowedBet rõ ràng, ta hiển thị luôn. (Trừ khi msg đã chứa nó rồi).
      setBetError(maxFromServer != null ? msg : msg);
      setTimeout(() => setBetError(null), 3000);
    }
  };

  // Calculate totals per symbol
  const totals: Record<Symbol, number> = { BAU: 0, CUA: 0, TOM: 0, CA: 0, GA: 0, NAI: 0 };
  // Build per-player bet breakdown per symbol
  const perPlayerBets: Record<Symbol, { playerName: string; playerId: string; amount: number }[]> = {
    BAU: [], CUA: [], TOM: [], CA: [], GA: [], NAI: [],
  };

  if (room?.currentRound?.bets) {
    // Aggregate bets per player per symbol
    const aggregated: Record<string, Record<Symbol, { playerName: string; amount: number }>> = {};
    for (const b of room.currentRound.bets) {
      totals[b.symbol] += b.amount;
      if (!aggregated[b.playerId]) aggregated[b.playerId] = {} as any;
      if (!aggregated[b.playerId][b.symbol]) {
        aggregated[b.playerId][b.symbol] = { playerName: b.playerName, amount: 0 };
      }
      aggregated[b.playerId][b.symbol].amount += b.amount;
    }
    // Flatten into perPlayerBets
    for (const [pid, symbols] of Object.entries(aggregated)) {
      for (const [sym, info] of Object.entries(symbols)) {
        perPlayerBets[sym as Symbol].push({
          playerName: info.playerName,
          playerId: pid,
          amount: info.amount,
        });
      }
    }
  }

  const wins = new Set<Symbol>(diceResult || []);

  return (
    <div className="relative">
      {/* Error toast */}
      <AnimatePresence>
        {betError && (
          <motion.div
            className="absolute -top-12 left-0 right-0 z-20 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}>
            <div className="bg-red-500/90 text-white text-xs font-body px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm">
              ⚠️ {betError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
      {SYMBOLS.map((sym, i) => {
        const c = SC[sym];
        const isW = wins.has(sym);
        const my = myBets[sym] || 0;
        const mc = diceResult ? diceResult.filter(d => d === sym).length : 0;
        const total = totals[sym];
        const playerBets = perPlayerBets[sym];

        return (
          <motion.button key={sym} onClick={() => handleBet(sym)}
            disabled={!isBetting || isHost}
            className={`betting-tile ${isW ? 'winning' : ''} ${my > 0 ? 'active' : ''} ${!isBetting || isHost ? 'cursor-default' : ''}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
            whileTap={isBetting && !isHost ? { scale: 0.94 } : {}}
            style={isW ? { boxShadow: `0 0 32px ${c.glow}` } : {}}>

            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} rounded-2xl`} />

            {/* Match count badge (top-right) */}
            {isW && mc > 0 && (
              <motion.div
                className="absolute -top-1.5 -right-1.5 text-surface-900 rounded-full w-7 h-7 flex items-center justify-center font-heading font-black text-xs z-10"
                style={{ background: c.accent }}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}>
                x{mc}
              </motion.div>
            )}

            {/* Total room bets (top-left) — chip icon + amount */}
            {total > 0 && (
              <div className="absolute top-1.5 left-1.5 z-[2] flex items-center gap-0.5">
                <ChipIcon size={12} color={c.accent} />
                <span className="text-[9px] font-heading font-bold" style={{ color: c.accent, opacity: 0.8 }}>
                  {total}
                </span>
              </div>
            )}

            {/* Emoji */}
            <span className="relative text-4xl md:text-5xl z-[1] drop-shadow-lg">{c.emoji}</span>
            <span className="relative font-heading font-bold text-xs text-white/75 z-[1]">{c.vi}</span>

            {/* Per-player bet breakdown (visible to host and all players) */}
            {playerBets.length > 0 && (
              <div className="absolute top-7 left-1.5 right-1.5 z-[2] flex flex-col gap-0.5 pointer-events-none">
                {playerBets.map((pb) => (
                  <div key={pb.playerId}
                    className="flex items-center justify-between rounded-md px-1 py-0.5"
                    style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
                    <span className="text-[7px] font-body text-white/60 truncate max-w-[50px]">
                      {pb.playerId === playerId ? 'Bạn' : pb.playerName}
                    </span>
                    <span className="text-[8px] font-heading font-bold" style={{ color: c.accent }}>
                      {pb.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* My bet badge (bottom) — chip icon + amount */}
            {my > 0 && (
              <motion.div
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[2] flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap shadow-lg shadow-black/20"
                style={{ background: 'rgba(246,173,85,0.92)' }}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}>
                <span className="text-[8px] font-body font-bold text-surface-900/80 pr-0.5">BẠN CƯỢC</span>
                <ChipIcon size={12} color="#1a1a30" />
                <span className="text-[11px] font-heading font-black text-surface-900">{my}</span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
    </div>
  );
}
