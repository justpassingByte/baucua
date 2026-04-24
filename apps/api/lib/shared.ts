// ─── Symbols ───────────────────────────────────────────
export const SYMBOLS = ['BAU', 'CUA', 'TOM', 'CA', 'GA', 'NAI'] as const;
export type Symbol = (typeof SYMBOLS)[number];

export const SYMBOL_INFO: Record<Symbol, { name: string; emoji: string; vi: string }> = {
  BAU: { name: 'Gourd', emoji: '🍐', vi: 'Bầu' },
  CUA: { name: 'Crab', emoji: '🦀', vi: 'Cua' },
  TOM: { name: 'Shrimp', emoji: '🦐', vi: 'Tôm' },
  CA:  { name: 'Fish', emoji: '🐟', vi: 'Cá' },
  GA:  { name: 'Rooster', emoji: '🐓', vi: 'Gà' },
  NAI: { name: 'Deer', emoji: '🦌', vi: 'Nai' },
};

// ─── Chip Values ───────────────────────────────────────
export const CHIP_VALUES = [10, 50, 100, 500] as const;
export type ChipValue = (typeof CHIP_VALUES)[number];

// ─── Room Status ───────────────────────────────────────
export type RoomStatus = 'WAITING' | 'BETTING' | 'ROLLING' | 'REVEAL' | 'RESULT';

// ─── Data Models ───────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  chips: number;
  isHost: boolean;
  connected: boolean;
  totalBet?: number;
  totalWon?: number;
  totalLost?: number;
}

export interface Bet {
  playerId: string;
  playerName: string;
  symbol: Symbol;
  amount: number;
}

export interface RoundData {
  id: string;
  endsAt: number;
  bets: Bet[];
  diceResult: [Symbol, Symbol, Symbol] | null;
  payouts: Record<string, number> | null;
}

export interface Room {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: Record<string, Player>;
  currentRound: RoundData | null;
  roundNumber: number;
  createdAt: number;
}

// ─── Pusher Events ─────────────────────────────────────
export type PusherEvent =
  | 'player_joined'
  | 'player_left'
  | 'round_started'
  | 'bet_updated'
  | 'bet_locked'
  | 'dice_rolling'
  | 'dice_result'
  | 'round_ended'
  | 'room_updated';

// ─── API Types ─────────────────────────────────────────
export interface CreateRoomRequest {
  hostName: string;
}

export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
  playerId?: string;
}

export interface PlaceBetRequest {
  roomId: string;
  playerId: string;
  symbol: Symbol;
  amount: number;
}

export interface StartRoundRequest {
  roomId: string;
  hostId: string;
}

export interface RollDiceRequest {
  roomId: string;
  hostId: string;
  controlledResult?: [Symbol, Symbol, Symbol];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Constants ─────────────────────────────────────────
export const DEFAULT_CHIPS = 1000;
export const BETTING_DURATION = 15; // seconds
export const ROLL_ANIMATION_DURATION = 2000; // ms
export const REVEAL_DELAY = 500; // ms
