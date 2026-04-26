import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { api } from '../lib/api';
import { ChipBadge } from './ChipIcon';
import type { BetHistoryEntry, Player } from '../store/gameStore';

const CHIP_AMOUNTS = [100, 500, 1000, 5000] as const;

function formatChips(value: number) {
  const abs = Math.abs(value);
  let formatted = `${abs}`;

  if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, '')}m`;
  } else if (abs >= 1000) {
    formatted = `${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1).replace(/\.0$/, '')}k`;
  }

  return value < 0 ? `-${formatted}` : formatted;
}

export default function PlayerList() {
  const { room, playerId, isHost, lastPayouts } = useGameStore();
  const [chipLoadingPlayerId, setChipLoadingPlayerId] = useState<string | null>(null);
  const [chipMsg, setChipMsg] = useState<string | null>(null);
  const [historyPlayer, setHistoryPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<BetHistoryEntry[]>([]);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  if (!room) return null;

  const players = Object.values(room.players).sort((a, b) => b.chips - a.chips);

  const handleAddChips = async (targetPlayerId: string, amount: number) => {
    if (!isHost || !playerId || chipLoadingPlayerId) return;

    setChipLoadingPlayerId(targetPlayerId);
    setChipMsg(null);

    const res = await api.addChips(room.id, playerId, targetPlayerId, amount);
    if (res.success) {
      const targetName = room.players[targetPlayerId]?.name || targetPlayerId;
      setChipMsg(`+${formatChips(amount)} chips cho ${targetPlayerId === playerId ? 'bạn' : targetName}`);
    } else {
      setChipMsg(`❌ ${res.error || 'Lỗi'}`);
    }

    setChipLoadingPlayerId(null);
    window.setTimeout(() => setChipMsg(null), 2000);
  };

  const handleOpenHistory = async (targetPlayerId: string) => {
    setHistoryLoadingId(targetPlayerId);
    setHistoryError(null);
    setHistory([]);
    setHistoryPlayer(room.players[targetPlayerId] ?? null);

    const res = await api.getPlayerBetHistory(room.id, targetPlayerId);
    if (res.success && res.data) {
      const data = res.data as { player: Player; history: BetHistoryEntry[] };
      setHistoryPlayer(data.player);
      setHistory(data.history);
    } else {
      setHistoryError(res.error || 'Khong tai duoc lich su cuoc');
    }

    setHistoryLoadingId(null);
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-heading font-bold tracking-wider text-white/75 uppercase">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-base">👥</span> Người chơi
        </h3>
        <span className="ml-auto bg-white/10 text-white/50 text-[10px] px-2 py-0.5 rounded-full font-body normal-case tracking-normal">
          {players.filter((p) => p.connected).length}/{players.length}
        </span>
      </div>

      <AnimatePresence>
        {chipMsg && (
          <motion.div
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-body text-white/80"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {chipMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {players.map((p, i) => {
          const isMe = p.id === playerId;
          const roundDelta = lastPayouts ? (lastPayouts[p.id] ?? 0) : null;
          const totalBet = p.totalBet ?? 0;
          const totalWon = p.totalWon ?? 0;
          const totalLost = p.totalLost ?? 0;
          const netTotal = totalWon - totalLost;
          const noChips = p.chips <= 0;
          const offline = !p.connected;
          const canAddChips = isHost && !chipLoadingPlayerId;
          const rowLoading = chipLoadingPlayerId === p.id;

          return (
            <motion.div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenHistory(p.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleOpenHistory(p.id);
                }
              }}
              className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors
                cursor-pointer hover:bg-white/[0.06]
                ${isMe ? 'bg-accent-gold/12 border border-accent-gold/25' : ''}
                ${offline ? 'opacity-40' : ''}
                ${noChips && !isMe && !offline ? 'bg-red-500/5 border border-red-500/10' : ''}
                ${!isMe && !noChips && !offline ? 'bg-white/[0.03] border border-white/[0.04]' : ''}
              `}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: offline ? 0.4 : 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-base shrink-0 leading-none pt-0.5">
                  {p.isHost ? '👑' : offline ? '👻' : '🎮'}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`font-body text-sm truncate block ${
                      isMe ? 'text-accent-gold font-semibold' : offline ? 'text-white/30' : 'text-white/80'
                    }`}
                  >
                    {p.name}
                    {isMe ? ' (bạn)' : ''}
                  </span>
                  {offline && <span className="text-[9px] text-white/30 font-body">mất kết nối</span>}
                  {noChips && !offline && <span className="text-[9px] text-red-400 font-body">💸 hết chips</span>}

                  <div className="mt-1 flex flex-wrap gap-1">
                    {roundDelta !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-heading font-semibold ${
                          roundDelta > 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : roundDelta < 0
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-white/5 text-white/35'
                        }`}
                      >
                        {roundDelta > 0
                          ? `Vòng này +${formatChips(roundDelta)}`
                          : roundDelta < 0
                            ? `Vòng này ${formatChips(roundDelta)}`
                            : 'Vòng này 0'}
                      </span>
                    )}
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-body text-white/60">
                      Cược {formatChips(totalBet)}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-body text-emerald-400">
                      Thắng {formatChips(totalWon)}
                    </span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-body text-red-400">
                      Thua {formatChips(totalLost)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-body ${
                        netTotal > 0 ? 'bg-emerald-500/10 text-emerald-400' : netTotal < 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/35'
                      }`}
                    >
                      Ròng {netTotal > 0 ? '+' : ''}
                      {formatChips(netTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className={`font-heading font-bold text-sm ${noChips ? 'text-red-400' : 'text-accent-gold'}`}>
                  <ChipBadge amount={p.chips} color={noChips ? '#f87171' : '#F6AD55'} size={20} />
                </div>

                {isHost && (
                  <div className="grid grid-cols-2 gap-1.5 max-w-[150px]">
                    {CHIP_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddChips(p.id, amt);
                        }}
                        disabled={!canAddChips || rowLoading}
                        className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 text-[10px] font-heading font-bold text-white/80 shadow-[0_6px_12px_rgba(0,0,0,0.14)] transition-colors hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +{formatChips(amt)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {historyPlayer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryPlayer(null)}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-900 p-4 shadow-2xl"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white/80">
                    Lịch sử cược <span className="text-accent-gold ml-2 normal-case">(Đang ở vòng {room.roundNumber > 0 ? room.roundNumber : '—'})</span>
                  </h4>
                  <p className="mt-1 text-xs font-body text-white/50">
                    {historyPlayer.name} - chips server: {formatChips(historyPlayer.chips)}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryPlayer(null)}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-heading font-bold text-white/70 hover:bg-white/[0.1]"
                >
                  Dong
                </button>
              </div>

              {historyLoadingId && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-body text-white/60">
                  Dang fetch lai tu server...
                </div>
              )}

              {!historyLoadingId && historyError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-xs font-body text-red-200">
                  {historyError}
                </div>
              )}

              {!historyLoadingId && !historyError && history.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-body text-white/50">
                  Chua co lich su cuoc tren server.
                </div>
              )}

              {!historyLoadingId && history.length > 0 && (
                <div className="max-h-[55dvh] space-y-2 overflow-y-auto pr-1">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-heading font-bold text-accent-gold">
                          Vong {entry.roundNumber ?? '?'} - {entry.symbol}
                        </span>
                        <span className="text-xs font-heading font-bold text-white/80">
                          {formatChips(entry.amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-body text-white/45">
                        <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'khong co thoi gian'}</span>
                        {entry.chipsBefore !== undefined && entry.chipsAfter !== undefined && (
                          <span>
                            {formatChips(entry.chipsBefore)} {'->'} {formatChips(entry.chipsAfter)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
