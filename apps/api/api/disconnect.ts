import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import type { Room } from '@baucua/shared';

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
    const { roomId, playerId } = req.body as { roomId: string; playerId: string };

    if (!roomId || !playerId) {
      return res.status(400).json({ success: false, error: 'roomId and playerId are required' });
    }

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!room.players[playerId]) {
      return res.status(404).json({ success: false, error: 'Player not found in room' });
    }

    // Mark player as disconnected (keep them in the room so they can reconnect)
    room.players[playerId] = {
      ...room.players[playerId],
      connected: false,
    };

    await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });

    await broadcast(room.id, 'player_disconnected', {
      playerId,
      players: room.players,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return res.status(500).json({ success: false, error: 'Failed to disconnect player' });
  }
}
