import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import { generateRoomId, generatePlayerId } from '../lib/game';
import type { Room, CreateRoomRequest } from '@baucua/shared';
import { DEFAULT_CHIPS } from '@baucua/shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
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
    const { hostName } = req.body as CreateRoomRequest;

    if (!hostName || hostName.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Host name is required' });
    }

    const roomId = generateRoomId();
    const hostId = generatePlayerId();

    const room: Room = {
      id: roomId,
      hostId,
      status: 'WAITING',
      players: {
        [hostId]: {
          id: hostId,
          name: hostName.trim(),
          chips: DEFAULT_CHIPS,
          isHost: true,
          connected: true,
        },
      },
      currentRound: null,
      roundNumber: 0,
      createdAt: Date.now(),
    };

    await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 86400 });

    return res.status(200).json({
      success: true,
      data: { room, playerId: hostId },
    });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create room' });
  }
}
