import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import type { Room } from '../lib/shared';

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
    const { roomId, hostId, targetPlayerId, amount } = req.body as {
      roomId: string;
      hostId: string;
      targetPlayerId: string;
      amount: number;
    };

    if (!roomId || !hostId || !targetPlayerId || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
      return res.status(400).json({ success: false, error: 'Invalid chip amount (1–10000)' });
    }

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Only host can add chips
    if (room.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Only the host can add chips' });
    }

    const target = room.players[targetPlayerId];
    if (!target) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    // Add chips to target player
    room.players[targetPlayerId] = {
      ...target,
      chips: target.chips + amount,
    };

    await redis.set(`room:${room.id.toUpperCase()}`, JSON.stringify(room), { ex: 86400 });

    // Broadcast updated players
    await broadcast(room.id, 'chips_added', {
      targetPlayerId,
      amount,
      players: room.players,
    });

    return res.status(200).json({
      success: true,
      data: { players: room.players },
    });
  } catch (error) {
    console.error('Add chips error:', error);
    return res.status(500).json({ success: false, error: 'Failed to add chips' });
  }
}
