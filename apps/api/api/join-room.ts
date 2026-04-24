import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import { generatePlayerId } from '../lib/game';
import type { Room, JoinRoomRequest } from '../lib/shared';
import { DEFAULT_CHIPS } from '../lib/shared';

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
    const { roomId, playerName } = req.body as JoinRoomRequest;

    if (!roomId || !playerName?.trim()) {
      return res.status(400).json({ success: false, error: 'Room ID and player name are required' });
    }

    const raw = await redis.get<string>(`room:${roomId.toUpperCase()}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const normalizedName = playerName.trim().toLowerCase();

    // Check if a player with the same name already exists in the room
    const existingEntry = Object.entries(room.players).find(
      ([, p]) => p.name.trim().toLowerCase() === normalizedName
    );

    if (existingEntry) {
      const [existingId, existingPlayer] = existingEntry;

      if (existingPlayer.connected) {
        // Name is taken by an active (connected) player — reject
        return res.status(409).json({
          success: false,
          error: 'Tên này đã có người dùng trong phòng. Vui lòng chọn tên khác.',
        });
      }

      // Player with this name was disconnected — allow reconnect, restore session & chips
      room.players[existingId] = {
        ...existingPlayer,
        connected: true,
      };

      await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });

      await broadcast(room.id, 'player_reconnected', {
        player: room.players[existingId],
        players: room.players,
      });

      return res.status(200).json({
        success: true,
        reconnected: true,
        data: { room, playerId: existingId },
      });
    }

    // Brand new player — create fresh entry
    const playerId = generatePlayerId();

    room.players[playerId] = {
      id: playerId,
      name: playerName.trim(),
      chips: DEFAULT_CHIPS,
      isHost: false,
      connected: true,
    };

    await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });

    await broadcast(room.id, 'player_joined', {
      player: room.players[playerId],
      players: room.players,
    });

    return res.status(200).json({
      success: true,
      reconnected: false,
      data: { room, playerId },
    });
  } catch (error) {
    console.error('Join room error:', error);
    return res.status(500).json({ success: false, error: 'Failed to join room' });
  }
}
