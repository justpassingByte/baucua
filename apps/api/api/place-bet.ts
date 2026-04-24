import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import type { Room, PlaceBetRequest } from '../lib/shared';
import { SYMBOLS } from '../lib/shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { roomId, playerId, symbol, amount } = req.body as PlaceBetRequest;
    console.log('[place-bet] Called with:', { roomId, playerId, symbol, amount });

    // Validate input
    if (!roomId || !playerId || !symbol || !amount) {
      console.log('[place-bet] REJECTED: Missing required fields');
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!SYMBOLS.includes(symbol)) {
      console.log('[place-bet] REJECTED: Invalid symbol', symbol);
      return res.status(400).json({ success: false, error: 'Invalid symbol' });
    }

    if (amount <= 0 || !Number.isInteger(amount)) {
      console.log('[place-bet] REJECTED: Invalid bet amount', amount);
      return res.status(400).json({ success: false, error: 'Invalid bet amount' });
    }

    const raw = await redis.get<string>(`room:${roomId}`);
    if (!raw) {
      console.log('[place-bet] REJECTED: Room not found', roomId);
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Validate betting is open
    if (room.status !== 'BETTING') {
      console.log('[place-bet] REJECTED: Betting is closed, status =', room.status);
      return res.status(400).json({ success: false, error: 'Betting is closed' });
    }

    if (!room.currentRound) {
      console.log('[place-bet] REJECTED: No active round');
      return res.status(400).json({ success: false, error: 'No active round' });
    }

    // Check timer server-side
    if (Date.now() > room.currentRound.endsAt) {
      console.log('[place-bet] REJECTED: Betting time expired. Now:', Date.now(), 'endsAt:', room.currentRound.endsAt, 'diff:', Date.now() - room.currentRound.endsAt, 'ms over');
      return res.status(400).json({ success: false, error: 'Betting time has expired' });
    }

    // Check player exists
    const player = room.players[playerId];
    if (!player) {
      console.log('[place-bet] REJECTED: Player not found', playerId, 'available:', Object.keys(room.players));
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    // Calculate total bets for this player in current round
    const playerBets = room.currentRound.bets.filter((b) => b.playerId === playerId);
    const totalBetted = playerBets.reduce((sum, b) => sum + b.amount, 0);

    if (totalBetted + amount > player.chips) {
      return res.status(400).json({ success: false, error: 'Không đủ chips' });
    }

    // Validate host has enough chips to cover worst-case payout (3x per bet)
    const host = room.players[room.hostId];
    if (!host) {
      return res.status(400).json({ success: false, error: 'Host not found' });
    }

    const existingLiability = room.currentRound.bets.reduce((sum, b) => sum + b.amount * 3, 0);
    const remainingHostCapacity = host.chips - existingLiability;
    // Max single bet = floor(remaining capacity / 3)
    const maxAllowedBet = Math.floor(remainingHostCapacity / 3);

    if (amount > maxAllowedBet) {
      console.log('[place-bet] REJECTED: Host capacity exceeded. maxAllowed:', maxAllowedBet, 'requested:', amount, 'hostChips:', host.chips);
      return res.status(400).json({
        success: false,
        error: maxAllowedBet <= 0
          ? 'Host đã hết khả năng đền – yêu cầu host thêm chips trước'
          : `Cược tối đa ${maxAllowedBet} chips (host chỉ đủ đền đến mức này)`,
        maxAllowedBet,
      });
    }

    // ── ALL VALIDATIONS PASSED ──
    console.log('[place-bet] ✅ All validations passed, saving bet');

    // Deduct chips immediately
    player.chips -= amount;

    // Add bet
    room.currentRound.bets.push({
      playerId,
      playerName: player.name,
      symbol,
      amount,
    });

    console.log('[place-bet] Bets count after push:', room.currentRound.bets.length);

    await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });
    console.log('[place-bet] ✅ Saved to Redis');

    // Broadcast bet update and updated players
    await broadcast(room.id, 'bet_updated', {
      bets: room.currentRound.bets,
      players: room.players,
      playerId,
      symbol,
      amount,
    });

    return res.status(200).json({
      success: true,
      data: { bets: room.currentRound.bets },
    });
  } catch (error) {
    console.error('[place-bet] EXCEPTION:', error);
    return res.status(500).json({ success: false, error: 'Failed to place bet' });
  }
}
