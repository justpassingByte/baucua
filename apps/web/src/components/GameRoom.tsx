import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { subscribeToRoom, unsubscribeFromRoom } from '../lib/pusher';
import { api } from '../lib/api';
import BettingGrid from './BettingGrid';
import ChipSelector from './ChipSelector';
import DiceArea from './DiceArea';
import PlayerList from './PlayerList';
import Timer from './Timer';
import HostControls from './HostControls';
import ResultOverlay from './ResultOverlay';
import type { Bet, Player, Symbol, RoundData } from '../store/gameStore';

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const store = useGameStore();

  // Bowl lift state synced via Pusher for all clients
  const [isBowlLifting, setIsBowlLifting] = useState(false);

  // ─── Load room on mount ──────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    if (!store.room) {
      api.getRoom(roomId).then((res) => {
        if (res.success && res.data) {
          const { room } = res.data as any;
          store.setRoom(room);
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
      store.updateRound(data.round);
      store.updateStatus('BETTING');
      store.clearMyBets();
      store.setDiceResult(null);
      store.setShowResult(false);
      store.setIsRolling(false);
      store.setLastPayouts(null);
      setIsBowlLifting(false);
    });

    channel.bind('bet_updated', (data: { bets: Bet[]; players?: Record<string, Player> }) => {
      store.updateBets(data.bets);
      if (data.players) store.updatePlayers(data.players);
    });

    channel.bind('bet_locked', () => {
      store.updateStatus('ROLLING');
    });

    channel.bind('dice_rolling', () => {
      store.setIsRolling(true);
      store.updateStatus('ROLLING');
      setIsBowlLifting(false);
    });

    // New event: bowl is being lifted by host — animate for all players
    channel.bind('bowl_lifting', () => {
      setIsBowlLifting(true);
    });

    channel.bind('dice_result', (data: { diceResult: [Symbol, Symbol, Symbol]; status: string }) => {
      setTimeout(() => {
        store.setDiceResult(data.diceResult);
        store.setIsRolling(false);
        store.updateStatus('REVEAL');
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
      
      setTimeout(() => {
        store.setLastPayouts(data.payouts);
        store.updatePlayers(data.players);
        store.updateStatus('RESULT');
        store.setShowResult(true);
        setIsBowlLifting(false);
      }, 3500);
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

  // Called when host lifts the bowl — triggers roll
  const handleLiftBowl = useCallback(async () => {
    if (!store.room || !store.playerId || !store.isHost) return;
    const ctrl = store.devControlled ?? undefined;
    await api.rollDice(store.room.id, store.playerId, ctrl as string[] | undefined);
  }, [store.room, store.playerId, store.isHost, store.devControlled]);

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
    <div className="min-h-dvh flex flex-col">
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
          <span className="text-white/50 text-xs font-body">
            Vòng {store.room.roundNumber || '—'}
          </span>
          <StatusBadge status={status} />
        </div>
      </header>

      {/* Main game area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left: Game Board */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Timer + Dice Area */}
          <div className="flex flex-col items-center gap-4 glass-card py-6 px-4">
            {store.room.currentRound && (
              <Timer endsAt={store.room.currentRound.endsAt} active={isBetting} />
            )}
            <DiceArea
              onLiftBowl={store.isHost ? handleLiftBowl : undefined}
              isBowlLifting={isBowlLifting}
            />
          </div>

          {/* Betting Grid */}
          <BettingGrid />

          {/* Chip Selector (only during betting) */}
          <AnimatePresence>
            {isBetting && !store.isHost && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <ChipSelector />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Host Controls */}
          {store.isHost && <HostControls />}
        </div>

        {/* Right: Player List */}
        <div className="lg:w-72 shrink-0">
          <PlayerList />
        </div>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {store.showResult && <ResultOverlay />}
      </AnimatePresence>
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
