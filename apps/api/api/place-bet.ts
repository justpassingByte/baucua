import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import type { BetHistoryEntry, Room, PlaceBetRequest } from '../lib/shared';
import { SYMBOLS } from '../lib/shared';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireRoomLock(roomId: string): Promise<{ key: string; token: string }> {
  const key = `lock:room:${roomId.toUpperCase()}:bet`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const locked = await redis.set(key, token, { nx: true, px: 3000 });
    if (locked) return { key, token };
    await sleep(20 + attempt * 8);
  }

  throw new Error('Bet queue is busy');
}

async function releaseRoomLock(lock: { key: string; token: string }) {
  try {
    const current = await redis.get<string>(lock.key);
    if (current === lock.token) {
      await redis.del(lock.key);
    }
  } catch (error) {
    console.warn('[place-bet] Failed to release room lock:', error);
  }
}

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
  let lock: { key: string; token: string } | null = null;
  const startedAt = Date.now();

  try {
    const { roomId, playerId, symbol, amount, requestId } = req.body as PlaceBetRequest;
    console.log('[place-bet] Called with:', { roomId, playerId, symbol, amount, requestId });

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

    lock = await acquireRoomLock(roomId);

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
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

    if (amount > player.chips) {
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

    const chipsBefore = player.chips;
    const createdAt = Date.now();

    // Deduct chips immediately
    player.chips -= amount;
    player.totalBet = (player.totalBet ?? 0) + amount;

    const bet = {
      playerId,
      playerName: player.name,
      symbol,
      amount,
      requestId,
      createdAt,
      roundNumber: room.roundNumber,
      chipsBefore,
      chipsAfter: player.chips,
    };

    // Add bet
    room.currentRound.bets.push(bet);

    const historyEntry: BetHistoryEntry = {
      id: `${room.currentRound.id}:${createdAt}:${playerId}:${room.currentRound.bets.length}`,
      roomId: room.id,
      roundId: room.currentRound.id,
      ...bet,
    };
    const historyKey = `bet-history:${room.id.toUpperCase()}:${playerId}`;
    const existingHistoryRaw = await redis.get<BetHistoryEntry[] | string>(historyKey);
    const existingHistory: BetHistoryEntry[] = Array.isArray(existingHistoryRaw)
      ? existingHistoryRaw
      : typeof existingHistoryRaw === 'string'
        ? JSON.parse(existingHistoryRaw)
        : [];
    const nextHistory = [historyEntry, ...existingHistory].slice(0, 100);

    console.log('[place-bet] Bets count after push:', room.currentRound.bets.length);

    await Promise.all([
      redis.set(`room:${room.id.toUpperCase()}`, JSON.stringify(room), { ex: 86400 }),
      redis.set(historyKey, JSON.stringify(nextHistory), { ex: 86400 * 7 }),
    ]);
    console.log('[place-bet] ✅ Saved to Redis');

    // Broadcast bet update and updated players
    await broadcast(room.id, 'bet_updated', {
      bets: room.currentRound.bets,
      players: room.players,
      requestId,
      playerId,
      symbol,
      amount,
    });

    return res.status(200).json({
      success: true,
      data: { bets: room.currentRound.bets, players: room.players, requestId },
    });
  } catch (error) {
    console.error('[place-bet] EXCEPTION:', error);
    const message = error instanceof Error && error.message === 'Bet queue is busy'
      ? 'Server dang xu ly qua nhieu lenh cuoc, vui long thu lai'
      : 'Failed to place bet';
    return res.status(500).json({ success: false, error: message });
  } finally {
    console.log('[place-bet] timing(ms):', { total: Date.now() - startedAt });
    if (lock) {
      await releaseRoomLock(lock);
    }
  }
}
