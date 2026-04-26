import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import type { Room, StartRoundRequest } from '../lib/shared';

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
    const { roomId, hostId } = req.body as StartRoundRequest;

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Verify host
    if (room.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Only the host can open the bowl' });
    }

    if (room.status !== 'REVEAL') {
      return res.status(400).json({ success: false, error: 'Cannot open bowl in current state' });
    }

    if (!room.currentRound) {
      return res.status(400).json({ success: false, error: 'No active round' });
    }

    room.status = 'RESULT';
    await redis.set(`room:${room.id.toUpperCase()}`, JSON.stringify(room), { ex: 86400 });

    // Broadcast bowl lifting to trigger open animation on all clients
    await broadcast(room.id, 'bowl_lifting', { status: 'RESULT' });

    // Send the final results so players see their payouts
    await broadcast(room.id, 'round_ended', {
      payouts: room.currentRound.payouts || {},
      players: room.players,
      diceResult: room.currentRound.diceResult || ['BAU', 'CUA', 'TOM'],
      status: 'RESULT',
    });

    return res.status(200).json({
      success: true,
      data: {
        players: room.players,
      },
    });
  } catch (error) {
    console.error('Open bowl error:', error);
    return res.status(500).json({ success: false, error: 'Failed to open bowl' });
  }
}
