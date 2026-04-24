import { create } from 'zustand';

// ─── Types (inline to avoid import issues with monorepo) ───
const SYMBOLS = ['BAU', 'CUA', 'TOM', 'CA', 'GA', 'NAI'] as const;
type Symbol = (typeof SYMBOLS)[number];
type RoomStatus = 'WAITING' | 'BETTING' | 'ROLLING' | 'REVEAL' | 'RESULT';

interface Player {
  id: string;
  name: string;
  chips: number;
  isHost: boolean;
  connected: boolean;
}

interface Bet {
  playerId: string;
  playerName: string;
  symbol: Symbol;
  amount: number;
}

interface RoundData {
  id: string;
  endsAt: number;
  bets: Bet[];
  diceResult: [Symbol, Symbol, Symbol] | null;
  payouts: Record<string, number> | null;
}

interface Room {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: Record<string, Player>;
  currentRound: RoundData | null;
  roundNumber: number;
  createdAt: number;
}

// ─── Store ──────────────────────────────────────────────────
interface GameState {
  // Identity
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;

  // Room
  room: Room | null;
  roomId: string | null;

  // UI State
  selectedChip: number;
  myBets: Record<Symbol, number>;
  isRolling: boolean;
  showResult: boolean;
  lastPayouts: Record<string, number> | null;
  diceResult: [Symbol, Symbol, Symbol] | null;
  devControlled: [Symbol, Symbol, Symbol] | null;

  // Actions
  setIdentity: (playerId: string, playerName: string, isHost: boolean) => void;
  setRoom: (room: Room) => void;
  setRoomId: (roomId: string) => void;
  setSelectedChip: (chip: number) => void;
  addMyBet: (symbol: Symbol, amount: number) => void;
  removeMyBet: (symbol: Symbol, amount: number) => void;
  clearMyBets: () => void;
  setIsRolling: (rolling: boolean) => void;
  setShowResult: (show: boolean) => void;
  setDiceResult: (result: [Symbol, Symbol, Symbol] | null) => void;
  setLastPayouts: (payouts: Record<string, number> | null) => void;
  updatePlayers: (players: Record<string, Player>) => void;
  updateBets: (bets: Bet[]) => void;
  updateStatus: (status: RoomStatus) => void;
  updateRound: (round: RoundData) => void;
  setDevControlled: (v: [Symbol, Symbol, Symbol] | null) => void;
  reset: () => void;
}

const initialMyBets: Record<Symbol, number> = {
  BAU: 0, CUA: 0, TOM: 0, CA: 0, GA: 0, NAI: 0,
};

export const useGameStore = create<GameState>((set) => ({
  playerId: null,
  playerName: null,
  isHost: false,
  room: null,
  roomId: null,
  selectedChip: 10,
  myBets: { ...initialMyBets },
  isRolling: false,
  showResult: false,
  lastPayouts: null,
  diceResult: null,
  devControlled: null,

  setIdentity: (playerId, playerName, isHost) =>
    set({ playerId, playerName, isHost }),

  setRoom: (room) =>
    set({ room, roomId: room.id }),

  setRoomId: (roomId) =>
    set({ roomId }),

  setSelectedChip: (chip) =>
    set({ selectedChip: chip }),

  addMyBet: (symbol, amount) =>
    set((state) => ({
      myBets: {
        ...state.myBets,
        [symbol]: (state.myBets[symbol] || 0) + amount,
      },
    })),

  removeMyBet: (symbol, amount) =>
    set((state) => ({
      myBets: {
        ...state.myBets,
        [symbol]: Math.max(0, (state.myBets[symbol] || 0) - amount),
      },
    })),

  clearMyBets: () =>
    set({ myBets: { ...initialMyBets } }),

  setIsRolling: (rolling) =>
    set({ isRolling: rolling }),

  setShowResult: (show) =>
    set({ showResult: show }),

  setDiceResult: (result) =>
    set({ diceResult: result }),

  setLastPayouts: (payouts) =>
    set({ lastPayouts: payouts }),

  updatePlayers: (players) =>
    set((state) => ({
      room: state.room ? { ...state.room, players } : null,
    })),

  updateBets: (bets) =>
    set((state) => ({
      room: state.room && state.room.currentRound
        ? {
            ...state.room,
            currentRound: { ...state.room.currentRound, bets },
          }
        : state.room,
    })),

  updateStatus: (status) =>
    set((state) => ({
      room: state.room ? { ...state.room, status } : null,
    })),

  updateRound: (round) =>
    set((state) => ({
      room: state.room
        ? { ...state.room, currentRound: round, status: 'BETTING' as RoomStatus }
        : null,
    })),

  setDevControlled: (v) => set({ devControlled: v }),

  reset: () =>
    set({
      playerId: null,
      playerName: null,
      isHost: false,
      room: null,
      roomId: null,
      selectedChip: 10,
      myBets: { ...initialMyBets },
      isRolling: false,
      showResult: false,
      lastPayouts: null,
      diceResult: null,
      devControlled: null,
    }),
}));

// Re-export types for components
export type { Symbol, RoomStatus, Player, Bet, RoundData, Room };
export { SYMBOLS };
