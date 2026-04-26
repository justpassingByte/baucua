import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import type { BetHistoryEntry, Room } from '../lib/shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const roomId = req.query.roomId as string;
    const playerId = req.query.playerId as string;

    if (!roomId || !playerId) {
      return res.status(400).json({ success: false, error: 'Room ID and player ID are required' });
    }

    const roomRaw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!roomRaw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof roomRaw === 'string' ? JSON.parse(roomRaw) : roomRaw;
    const player = room.players[playerId];
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const historyRaw = await redis.get<BetHistoryEntry[] | string>(`bet-history:${roomId.toUpperCase()}:${playerId}`);
    const history: BetHistoryEntry[] = Array.isArray(historyRaw)
      ? historyRaw
      : typeof historyRaw === 'string'
        ? JSON.parse(historyRaw)
        : [];

    return res.status(200).json({
      success: true,
      data: {
        player,
        history,
        roomSnapshot: {
          status: room.status,
          roundNumber: room.roundNumber,
          currentRoundId: room.currentRound?.id ?? null,
          currentBets: room.currentRound?.bets.filter((bet) => bet.playerId === playerId) ?? [],
        },
      },
    });
  } catch (error) {
    console.error('Player bet history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get player bet history' });
  }
}
