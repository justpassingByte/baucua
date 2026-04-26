import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { api } from '../lib/api';
import { ChipIcon } from './ChipIcon';
import { playSfx } from '../lib/sfx';
import type { Symbol } from '../store/gameStore';

const BOARD_ORDER: Symbol[] = ['NAI', 'BAU', 'GA', 'CA', 'CUA', 'TOM'];

const SYMBOL_IMAGE: Record<Symbol, string> = {
  BAU: '/art/symbols/bau.png',
  CUA: '/art/symbols/cua.png',
  TOM: '/art/symbols/tom.png',
  CA: '/art/symbols/ca.png',
  GA: '/art/symbols/ga.png',
  NAI: '/art/symbols/nai.png',
};

const SYMBOL_LABEL: Record<Symbol, string> = {
  BAU: 'Bầu',
  CUA: 'Cua',
  TOM: 'Tôm',
  CA: 'Cá',
  GA: 'Gà',
  NAI: 'Nai',
};

interface Props {
  onNoticeChange?: (message: string | null) => void;
}

export default function BettingGrid({ onNoticeChange }: Props) {
  const { room, playerId, isHost, diceResult, setRoom } = useGameStore();
  const isBetting = room?.status === 'BETTING';
  const [betError, setBetError] = useState<string | null>(null);

  const handleBetSynced = async (symbol: Symbol, chip: number, requestId: string) => {
    const state = useGameStore.getState();
    const currentRoom = state.room;
    const currentPlayerId = state.playerId;

    if (!currentRoom || !currentPlayerId) return;

    const res = await api.placeBet(currentRoom.id, currentPlayerId, symbol, chip, requestId);

    if (!res.success) {
      // Refresh from server to get correct state
      const refreshed = await api.getRoom(currentRoom.id);
      if (refreshed.success && refreshed.data) {
        useGameStore.getState().setRoom((refreshed.data as any).room);
      }
      const message = res.error || 'Đặt cược thất bại';
      setBetError(message);
      onNoticeChange?.(message);
      setTimeout(() => setBetError(null), 3000);
      return;
    }

    // Update state directly from the API response (authoritative server data)
    if (res.data) {
      const { bets, players } = res.data as any;
      const store = useGameStore.getState();
      if (bets) store.updateBets(bets);
      if (players) store.updatePlayers(players);
    }

    useGameStore.getState().removePendingBetRequest(requestId);
  };

  const handleBetQueued = (symbol: Symbol) => {
    const state = useGameStore.getState();
    const currentRoom = state.room;
    const currentPlayerId = state.playerId;
    const chip = state.selectedChip;

    if (currentRoom?.status !== 'BETTING' || !currentPlayerId || state.isHost) return;
    const player = currentRoom.players[currentPlayerId];
    if (!player || player.chips <= 0 || chip > player.chips) return;

    const host = currentRoom.players[currentRoom.hostId];
    const usedLiability = (currentRoom.currentRound?.bets || []).reduce((sum, b) => sum + b.amount * 3, 0);
    const currentHostMaxBet = host ? Math.floor((host.chips - usedLiability) / 3) : null;

    if (currentHostMaxBet !== null && chip > currentHostMaxBet) {
      const message = currentHostMaxBet <= 0 ? 'Host đã hết khả năng đền' : `Cược tối đa là ${currentHostMaxBet} chips`;
      setBetError(message);
      onNoticeChange?.(message);
      setTimeout(() => setBetError(null), 3000);
      return;
    }

    setBetError(null);
    onNoticeChange?.(null);
    const requestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // -- OPTIMISTIC UPDATE --
    const optimisticBet = {
      playerId: currentPlayerId,
      playerName: player.name,
      symbol,
      amount: chip,
      requestId,
      createdAt: Date.now(),
      roundNumber: currentRoom.roundNumber,
      chipsBefore: player.chips,
      chipsAfter: player.chips - chip,
    };

    const newPlayers = { ...currentRoom.players };
    newPlayers[currentPlayerId] = {
      ...player,
      chips: player.chips - chip,
      totalBet: (player.totalBet || 0) + chip,
    };
    const newBets = [...(currentRoom.currentRound?.bets || []), optimisticBet];

    useGameStore.getState().updatePlayers(newPlayers);
    useGameStore.getState().updateBets(newBets as any);
    useGameStore.getState().addPendingBetRequest(requestId);
    playSfx('bet', 0.35);

    // -- SEND CONCURRENTLY (NO QUEUE) --
    handleBetSynced(symbol, chip, requestId).catch((error) => {
      console.error('Bet failed:', error);
    });
  };

  const totals: Record<Symbol, number> = { BAU: 0, CUA: 0, TOM: 0, CA: 0, GA: 0, NAI: 0 };
  const myTotals: Record<Symbol, number> = { BAU: 0, CUA: 0, TOM: 0, CA: 0, GA: 0, NAI: 0 };
  const perPlayerBets: Record<Symbol, { playerName: string; playerId: string; amount: number }[]> = {
    BAU: [],
    CUA: [],
    TOM: [],
    CA: [],
    GA: [],
    NAI: [],
  };

  if (room?.currentRound?.bets) {
    const aggregated: Record<string, Record<Symbol, { playerName: string; amount: number }>> = {};
    for (const b of room.currentRound.bets) {
      totals[b.symbol] += b.amount;
      if (b.playerId === playerId) myTotals[b.symbol] += b.amount;
      if (!aggregated[b.playerId]) aggregated[b.playerId] = {} as any;
      if (!aggregated[b.playerId][b.symbol]) {
        aggregated[b.playerId][b.symbol] = { playerName: b.playerName, amount: 0 };
      }
      aggregated[b.playerId][b.symbol].amount += b.amount;
    }

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

  // Chunk the board into rows based on screen size
  // Unified responsive grid layout
  return (
    <div className="relative w-full flex-1 flex items-center justify-center p-1 sm:p-2 overflow-y-auto">
      <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-[900px] h-full items-center justify-center">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-h-full items-center justify-items-center" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
          {BOARD_ORDER.map((sym, i) => {
            const isW = wins.has(sym);
            const my = myTotals[sym] || 0;
            const mc = diceResult ? diceResult.filter((d) => d === sym).length : 0;
            const total = totals[sym];
            const playerBets = perPlayerBets[sym];
            const label = SYMBOL_LABEL[sym];

            return (
              <motion.button
                key={sym}
                onClick={() => handleBetQueued(sym)}
                disabled={!isBetting || isHost}
                className={`betting-tile relative w-full h-auto max-h-full aspect-square flex-shrink-0 max-w-[160px] sm:max-w-[180px] ${isW ? 'winning' : ''} ${my > 0 ? 'active' : ''} ${!isBetting || isHost ? 'cursor-default' : ''}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                whileTap={isBetting && !isHost ? { scale: 0.95 } : {}}
                aria-label={label}
                style={isW ? { boxShadow: `0 0 30px rgba(246, 173, 85, 0.35)` } : {}}
              >
                <div className="absolute inset-0 rounded-2xl bg-[#f7f5ef]" />
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.86),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.05),transparent_46%)]" />
                <div className="absolute inset-0 rounded-2xl border-[3px] border-[#1b9fd8]" />
                <div className="absolute inset-[2px] rounded-[1.15rem] border border-[#1b9fd8] opacity-85" />

                {isW && mc > 0 && (
                  <motion.div
                    className="absolute -top-3 -right-3 z-10 flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-heading font-black text-[#2d1604] shadow-[0_10px_20px_rgba(0,0,0,0.36)]"
                    style={{
                      background: 'linear-gradient(180deg, #fde68a 0%, #f6ad55 100%)',
                      textShadow: '0 1px 0 rgba(255,255,255,0.45)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                  >
                    x{mc}
                  </motion.div>
                )}

                {total > 0 && (
                  <div className="absolute left-2 top-2 z-[2] flex items-center gap-1.5 rounded-full border border-[#f6ad55]/45 bg-white/92 px-2 py-1 shadow-[0_8px_16px_rgba(0,0,0,0.18)]">
                    <ChipIcon size={14} color="#F6AD55" />
                    <span className="text-[10px] font-heading font-black leading-none text-[#8a4b13]">{total}</span>
                  </div>
                )}

                <div className="relative z-[1] flex h-full w-full items-center justify-center p-1">
                  <img
                    src={SYMBOL_IMAGE[sym]}
                    alt={label}
                    className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.16)]"
                    draggable={false}
                    loading="eager"
                  />
                </div>

                {playerBets.length > 0 && (
                  <div className="absolute left-1.5 right-1.5 top-7 z-[2] flex flex-col gap-1 pointer-events-none">
                    {playerBets.map((pb) => (
                      <div
                        key={pb.playerId}
                        className="flex items-center justify-between rounded-md border border-white/10 px-1.5 py-1"
                        style={{ background: 'rgba(18,18,35,0.70)', backdropFilter: 'blur(6px)' }}
                      >
                        <span className="max-w-[54px] truncate text-[8px] font-body text-white/72">
                          {pb.playerId === playerId ? 'Bạn' : pb.playerName}
                        </span>
                        <span className="text-[9px] font-heading font-bold text-[#F6AD55]">{pb.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
