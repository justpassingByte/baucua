import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import type { Room } from '../lib/shared';

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

    if (!roomId) {
      return res.status(400).json({ success: false, error: 'Room ID is required' });
    }

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return res.status(200).json({
      success: true,
      data: { room },
    });
  } catch (error) {
    console.error('Get room error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get room' });
  }
}
