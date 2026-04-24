import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import { createRound } from '../lib/game';
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

    const raw = await redis.get<string>(`room:${roomId}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Verify host
    if (room.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Only the host can start a round' });
    }

    // Check status
    if (room.status !== 'WAITING' && room.status !== 'RESULT') {
      return res.status(400).json({ success: false, error: 'Cannot start round in current state' });
    }

    // Validate host has chips to run the round (min 100)
    const hostPlayer = room.players[room.hostId];
    const MIN_HOST_CHIPS = 100;
    if (!hostPlayer || hostPlayer.chips < MIN_HOST_CHIPS) {
      return res.status(400).json({
        success: false,
        error: `Host cần ít nhất ${MIN_HOST_CHIPS} chips để bắt đầu vòng mới (hiện có: ${hostPlayer?.chips ?? 0})`,
      });
    }

    // Create new round
    room.roundNumber += 1;
    room.currentRound = createRound(room.roundNumber);
    room.status = 'BETTING';

    await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });

    // Broadcast
    await broadcast(room.id, 'round_started', {
      round: room.currentRound,
      roundNumber: room.roundNumber,
      status: room.status,
    });

    return res.status(200).json({
      success: true,
      data: { room },
    });
  } catch (error) {
    console.error('Start round error:', error);
    return res.status(500).json({ success: false, error: 'Failed to start round' });
  }
}
