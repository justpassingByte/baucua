import type { Symbol, Bet, Room, RoundData } from './shared';
import { SYMBOLS, DEFAULT_CHIPS, BETTING_DURATION } from './shared';

/**
 * Generate random dice result (3 dice)
 */
export function rollDice(controlled?: [Symbol, Symbol, Symbol]): [Symbol, Symbol, Symbol] {
  if (controlled) return controlled;
  return [
    SYMBOLS[Math.floor(Math.random() * 6)],
    SYMBOLS[Math.floor(Math.random() * 6)],
    SYMBOLS[Math.floor(Math.random() * 6)],
  ];
}

/**
 * Calculate payouts based on dice result and bets.
 * NOTE: chips are already deducted from player on place-bet.
 * For each bet:
 *   - 0 matches → player loses (chips already gone, host gains bet)
 *   - 1 match   → host pays 1x winnings back to player
 *   - 2 matches → host pays 2x winnings back to player
 *   - 3 matches → host pays 3x winnings back to player
 */
export function calculatePayouts(
  bets: Bet[],
  diceResult: [Symbol, Symbol, Symbol],
  hostId: string,
  hostChips: number
): { netProfits: Record<string, number>; balanceUpdates: Record<string, number> } {
  const netProfits: Record<string, number> = { [hostId]: 0 };
  const balanceUpdates: Record<string, number> = { [hostId]: 0 };
  // Track how much each player originally bet (total across all symbols) for scaling
  const playerBetTotals: Record<string, number> = {};

  // First pass: calculate raw payouts
  for (const bet of bets) {
    const matches = diceResult.filter((d) => d === bet.symbol).length;
    if (netProfits[bet.playerId] === undefined) {
      netProfits[bet.playerId] = 0;
      balanceUpdates[bet.playerId] = 0;
    }
    // Track total bet placed per player (across all symbols)
    playerBetTotals[bet.playerId] = (playerBetTotals[bet.playerId] ?? 0) + bet.amount;

    if (matches === 0) {
      // Player lost: net profit is negative, nothing to add back to balance
      netProfits[bet.playerId] -= bet.amount;
      netProfits[hostId] += bet.amount;
      balanceUpdates[hostId] += bet.amount;
    } else {
      // Player won: net profit is winnings.
      const winnings = matches * bet.amount;
      netProfits[bet.playerId] += winnings;
      netProfits[hostId] -= winnings;
      
      // Balance update: they get back their original bet PLUS winnings
      balanceUpdates[bet.playerId] += bet.amount + winnings;
      balanceUpdates[hostId] -= winnings;
    }
  }

  // Second pass: cap host losses to available chips (prevents chips creation)
  if (netProfits[hostId] < 0 && Math.abs(netProfits[hostId]) > hostChips) {
    // Host can't cover all winnings; scale down proportionally
    const totalHostLoss = Math.abs(netProfits[hostId]);
    const scale = hostChips / totalHostLoss;
    netProfits[hostId] = -hostChips;
    balanceUpdates[hostId] = -hostChips;
    
    for (const pid of Object.keys(netProfits)) {
      if (pid !== hostId && netProfits[pid] > 0) {
        const scaledWinnings = Math.floor(netProfits[pid] * scale);
        netProfits[pid] = scaledWinnings;
        // For winners: they get back bets that won + scaled winnings
        // We need to recalculate balanceUpdates from scratch for this player
        // Their balance update = sum of (bet.amount for winning bets) + scaledWinnings
        let wonBetsTotal = 0;
        for (const bet of bets) {
          if (bet.playerId === pid) {
            const m = diceResult.filter((d) => d === bet.symbol).length;
            if (m > 0) wonBetsTotal += bet.amount;
          }
        }
        balanceUpdates[pid] = wonBetsTotal + scaledWinnings;
      }
    }
  }

  return { netProfits, balanceUpdates };
}

/**
 * Create a new round
 */
export function createRound(roundNumber: number): RoundData {
  return {
    id: `round-${roundNumber}`,
    endsAt: Date.now() + BETTING_DURATION * 1000,
    bets: [],
    diceResult: null,
    payouts: null,
  };
}

/**
 * Generate a short room ID
 */
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a player ID
 */
export function generatePlayerId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'p_';
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Apply payouts to player chips
 */
export function applyPayouts(
  room: Room,
  balanceUpdates: Record<string, number>
): Room {
  const updatedPlayers = { ...room.players };
  for (const [playerId, amount] of Object.entries(balanceUpdates)) {
    if (updatedPlayers[playerId]) {
      updatedPlayers[playerId] = {
        ...updatedPlayers[playerId],
        chips: Math.max(0, updatedPlayers[playerId].chips + amount),
      };
    }
  }
  return { ...room, players: updatedPlayers };
}
