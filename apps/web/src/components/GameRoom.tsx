import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { subscribeToRoom, unsubscribeFromRoom } from '../lib/pusher';
import { api } from '../lib/api';
import BettingGrid from './BettingGrid';
import ChipSelector from './ChipSelector';
import DiceArea from './DiceArea';
import BackgroundMusic from './BackgroundMusic';
import PlayerList from './PlayerList';
import HostControls from './HostControls';
import ResultOverlay from './ResultOverlay';
import DiceHistory from './DiceHistory';
import { playSfx } from '../lib/sfx';
import type { Bet, Player, Symbol, RoundData } from '../store/gameStore';

type BowlDragSync = {
  x: number;
  y: number;
  phase: 'dragging' | 'idle';
  updatedAt?: number;
};

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const store = useGameStore();

  // Bowl lift state synced via Pusher for all clients
  const [isBowlLifting, setIsBowlLifting] = useState(false);
  const [syncedBowlDrag, setSyncedBowlDrag] = useState<BowlDragSync | null>(null);
  const [betNotice, setBetNotice] = useState<string | null>(null);
  const lastBowlSyncSentAt = useRef(0);

  // ─── Load room on mount ──────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    if (!store.room) {
      api.getRoom(roomId).then((res) => {
        if (res.success && res.data) {
          const { room } = res.data as any;
          store.setRoom(room);
          if (room.currentRound?.diceResult && (room.status === 'REVEAL' || room.status === 'RESULT')) {
            store.setDiceResult(room.currentRound.diceResult);
          }
          if (!store.playerId) {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      });
    }
  }, [roomId]);

  // ─── Disconnect on page unload / tab close ───────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId && store.playerId) {
        // Use sendBeacon for reliable delivery on page unload
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const payload = JSON.stringify({ roomId, playerId: store.playerId });
        navigator.sendBeacon(`${apiUrl}/api/disconnect`, new Blob([payload], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, store.playerId]);

  // ─── Subscribe to Pusher events ──────────────────────
  useEffect(() => {
    if (!roomId) return;

    const channel = subscribeToRoom(roomId);

    channel.bind('player_joined', (data: { player: Player; players: Record<string, Player> }) => {
      store.updatePlayers(data.players);
    });

    channel.bind('player_reconnected', (data: { player: Player; players: Record<string, Player> }) => {
      store.updatePlayers(data.players);
    });

    channel.bind('player_disconnected', (data: { playerId: string; players: Record<string, Player> }) => {
      store.updatePlayers(data.players);
    });

    channel.bind('chips_added', (data: { targetPlayerId: string; amount: number; players: Record<string, Player> }) => {
      store.updatePlayers(data.players);
    });

    channel.bind('round_started', (data: { round: RoundData; roundNumber: number; status: string }) => {
      store.updateRound(data.round, data.roundNumber);
      store.updateStatus('BETTING');
      store.setDiceResult(null);
      store.setShowResult(false);
      store.setIsRolling(false);
      store.setLastPayouts(null);
      setIsBowlLifting(false);
      setSyncedBowlDrag(null);
      setBetNotice(null);
    });

    channel.bind('bet_updated', (data: { bets: Bet[]; players?: Record<string, Player>; requestId?: string }) => {
      store.updateBets(data.bets);
      if (data.players) store.updatePlayers(data.players);
      if (data.requestId) {
        useGameStore.getState().removePendingBetRequest(data.requestId);
      }
    });

    channel.bind('bet_locked', () => {
      store.updateStatus('ROLLING');
    });

    channel.bind('dice_rolling', () => {
      store.setIsRolling(true);
      store.updateStatus('ROLLING');
      setIsBowlLifting(false);
      setSyncedBowlDrag(null);
      playSfx('rolling', 0.35);
    });

    channel.bind('bowl_sync', (data: BowlDragSync & { diceResult?: [Symbol, Symbol, Symbol] | null }) => {
      if (data.diceResult) {
        store.setDiceResult(data.diceResult);
      }
      setSyncedBowlDrag({
        x: data.phase === 'idle' ? 0 : data.x,
        y: data.phase === 'idle' ? 0 : data.y,
        phase: data.phase,
        updatedAt: data.updatedAt,
      });
    });

    // New event: bowl is being lifted by host — animate for all clients
    channel.bind('bowl_lifting', (data?: { diceResult?: [Symbol, Symbol, Symbol] }) => {
      if (data?.diceResult) {
        store.setDiceResult(data.diceResult);
      }
      store.setIsRolling(false);
      if (useGameStore.getState().room?.status !== 'RESULT') {
        store.updateStatus('REVEAL');
      }
      setSyncedBowlDrag(null);
      setIsBowlLifting(true);
    });

    channel.bind('dice_result', (data: { diceResult: [Symbol, Symbol, Symbol]; status: string }) => {
      setTimeout(() => {
        store.setDiceResult(data.diceResult);
        store.setIsRolling(false);
        store.updateStatus('REVEAL');
        playSfx('reveal', 0.38);
      }, 800); // shorter delay since bowl lift already shows anticipation
    });

    channel.bind('round_ended', (data: {
      payouts: Record<string, number>;
      players: Record<string, Player>;
      diceResult: [Symbol, Symbol, Symbol];
    }) => {
      console.log('[round_ended] Received payouts:', JSON.stringify(data.payouts));
      console.log('[round_ended] My playerId:', store.playerId);
      console.log('[round_ended] My payout entry:', store.playerId ? data.payouts[store.playerId] : 'N/A');

      store.setDiceResult(data.diceResult);
      store.setIsRolling(false);
      if (useGameStore.getState().room?.status !== 'RESULT') {
        store.updateStatus('REVEAL');
      }
      setSyncedBowlDrag(null);
      setIsBowlLifting(true);
      
      setTimeout(() => {
        store.setDiceResult(data.diceResult);
        store.setLastPayouts(data.payouts);
        store.updatePlayers(data.players);
        store.updateStatus('RESULT');
        store.setShowResult(true);
        const currentRoom = useGameStore.getState().room;
        if (currentRoom && data.diceResult) {
          store.addDiceHistory(currentRoom.roundNumber, data.diceResult);
        }
        // keep isBowlLifting as true so it stays open
        setBetNotice(null);

        const myPayout = store.playerId ? data.payouts[store.playerId] ?? 0 : 0;
        const myPlayer = store.playerId ? data.players[store.playerId] : null;
        const hadBets = !!myPlayer && (myPlayer.totalBet ?? 0) > 0;
        if (hadBets) {
          playSfx(myPayout > 0 ? 'win' : 'lose', 0.4);
        }
      }, 1200);
    });

    return () => {
      unsubscribeFromRoom(roomId);
    };
  }, [roomId]);

  const handleLeave = useCallback(() => {
    // Call disconnect API before leaving
    if (roomId && store.playerId) {
      api.disconnect(roomId, store.playerId);
    }
    if (roomId) unsubscribeFromRoom(roomId);
    store.reset();
    navigate('/');
  }, [roomId, navigate, store.playerId]);

  // Called when host lifts the bowl — triggers open bowl API
  const handleLiftBowl = useCallback(async () => {
    if (!store.room || !store.playerId || !store.isHost) return;
    await api.openBowl(store.room.id, store.playerId);
  }, [store.room, store.playerId, store.isHost]);

  const handleBowlDragSync = useCallback((drag: BowlDragSync) => {
    const state = useGameStore.getState();
    if (!state.room || !state.playerId || !state.isHost) return;

    const now = Date.now();
    if (drag.phase === 'dragging' && now - lastBowlSyncSentAt.current < 80) return;

    lastBowlSyncSentAt.current = now;
    api.syncBowl(state.room.id, state.playerId, drag.x, drag.y, drag.phase).catch((error) => {
      console.error('Bowl sync failed:', error);
    });
  }, []);

  if (!store.room) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="text-5xl"
        >
          🎲
        </motion.div>
      </div>
    );
  }

  const status = store.room.status;
  const isBetting = status === 'BETTING';

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-surface-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="text-white/50 hover:text-white transition-colors text-sm font-body"
          >
            ← Rời
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-heading font-bold text-accent-gold text-sm tracking-wider">
            {store.room.id}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/80 text-xs font-heading font-bold tracking-wide shadow-sm">
            VÒNG {store.room.roundNumber > 0 ? store.room.roundNumber : '—'}
          </span>
          <StatusBadge status={status} />
        </div>
      </header>

      {/* Main game area */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-3 lg:p-4 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start h-full">
          {/* Left: main board */}
          <section className="h-full glass-card relative min-w-0 overflow-y-auto lg:overflow-hidden p-3 sm:p-4 flex flex-col">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <div className="flex-[1.2] rounded-2xl border border-white/10 bg-[#f4efe4]/5 p-2 sm:p-3 relative z-10 flex flex-col items-center justify-center min-h-[180px]">
                <DiceArea
                  onLiftBowl={store.isHost ? handleLiftBowl : undefined}
                  onBowlDragSync={store.isHost ? handleBowlDragSync : undefined}
                  isBowlLifting={isBowlLifting}
                  syncedBowlDrag={syncedBowlDrag}
                />
              </div>

              {/* HostControls moved to sidebar */}
              <AnimatePresence>
                {betNotice && (
                  <motion.div
                    className="rounded-xl border border-white/10 bg-red-500/10 px-4 py-2 text-xs font-body text-red-200 shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {betNotice}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-none sm:flex-1 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-2 sm:p-3 min-h-[300px] sm:min-h-0 flex flex-col">
                <BettingGrid
                  onNoticeChange={setBetNotice}
                  showResultMultipliers={isBowlLifting || status === 'RESULT'}
                />
              </div>
            </div>
          </section>

          {/* Right: Player List & Host Controls */}
          <div className="h-full lg:sticky lg:top-[84px] min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col gap-3">
            {store.isHost && <HostControls />}
            
            <AnimatePresence>
              {isBetting && !store.isHost && (
                <motion.div
                  className="shrink-0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <ChipSelector />
                </motion.div>
              )}
            </AnimatePresence>

            <PlayerList />
            <DiceHistory />
          </div>
        </div>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {store.showResult && <ResultOverlay />}
      </AnimatePresence>

      <BackgroundMusic />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    WAITING: { label: 'Chờ',        color: 'bg-white/10 text-white/60' },
    BETTING: { label: 'Đặt cược',   color: 'bg-accent-gold/20 text-accent-gold' },
    ROLLING: { label: 'Lắc xúc xắc', color: 'bg-accent-red/20 text-accent-red' },
    REVEAL:  { label: 'Mở bát',     color: 'bg-accent-jade/20 text-accent-jade' },
    RESULT:  { label: 'Kết quả',    color: 'bg-accent-jade/20 text-accent-jade-bright' },
  };

  const c = config[status] || config.WAITING;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-heading font-semibold ${c.color}`}>
      {c.label}
    </span>
  );
}
