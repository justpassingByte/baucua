import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import type { Room, SyncBowlRequest } from '../lib/shared';

const DRAG_LIMIT = 300;

function clampDragOffset(value: unknown): number | null {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, numericValue));
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

  try {
    const { roomId, hostId, phase } = req.body as SyncBowlRequest;
    const normalizedPhase = phase === 'idle' ? 'idle' : 'dragging';
    const x = normalizedPhase === 'idle' ? 0 : clampDragOffset(req.body.x);
    const y = normalizedPhase === 'idle' ? 0 : clampDragOffset(req.body.y);

    if (!roomId || !hostId || x === null || y === null) {
      return res.status(400).json({ success: false, error: 'Invalid bowl sync payload' });
    }

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (room.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Only the host can sync the bowl' });
    }

    if (room.status !== 'REVEAL') {
      return res.status(400).json({ success: false, error: 'Cannot sync bowl in current state' });
    }

    await broadcast(room.id, 'bowl_sync', {
      x,
      y,
      phase: normalizedPhase,
      diceResult: room.currentRound?.diceResult || null,
      updatedAt: Date.now(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Sync bowl error:', error);
    return res.status(500).json({ success: false, error: 'Failed to sync bowl' });
  }
}
