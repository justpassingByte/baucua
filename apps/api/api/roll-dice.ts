import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/redis';
import { broadcast } from '../lib/pusher';
import { rollDice, calculatePayouts, applyPayouts } from '../lib/game';
import type { Room, RollDiceRequest, Symbol } from '../lib/shared';
import { SYMBOLS } from '../lib/shared';

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
    const { roomId, hostId, controlledResult } = req.body as RollDiceRequest;

    const raw = await redis.get<string>(`room:${roomId}`);
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Verify host
    if (room.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Only the host can roll dice' });
    }

    if (room.status !== 'BETTING') {
      return res.status(400).json({ success: false, error: 'Cannot roll in current state' });
    }

    if (!room.currentRound) {
      return res.status(400).json({ success: false, error: 'No active round' });
    }

    // Validate controlled result if provided
    let validatedControlled: [Symbol, Symbol, Symbol] | undefined;
    if (controlledResult) {
      const isValid = Array.isArray(controlledResult) &&
        controlledResult.length === 3 &&
        controlledResult.every((s: string) => SYMBOLS.includes(s as Symbol));
      if (isValid) {
        validatedControlled = controlledResult as [Symbol, Symbol, Symbol];
      }
    }

    // Lock bets
    room.status = 'ROLLING';
    await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });

    // Broadcast bet locked
    await broadcast(room.id, 'bet_locked', { status: 'ROLLING' });

    // Generate dice result
    const diceResult = rollDice(validatedControlled);
    room.currentRound.diceResult = diceResult;

    // Broadcast rolling animation
    await broadcast(room.id, 'dice_rolling', { status: 'ROLLING' });

    // Calculate payouts (pass hostChips to cap losses and prevent chip creation)
    const hostPlayer = room.players[room.hostId];
    const hostChips = hostPlayer ? hostPlayer.chips : 0;
    
    console.log('[roll-dice] Bets:', JSON.stringify(room.currentRound.bets));
    console.log('[roll-dice] Dice result:', diceResult);
    
    const { netProfits, balanceUpdates } = calculatePayouts(room.currentRound.bets, diceResult, room.hostId, hostChips);
    
    console.log('[roll-dice] Net profits:', JSON.stringify(netProfits));
    console.log('[roll-dice] Balance updates:', JSON.stringify(balanceUpdates));
    
    room.currentRound.payouts = netProfits;

    // Apply payouts to players using balanceUpdates
    const updatedRoom = applyPayouts(room, balanceUpdates);
    updatedRoom.status = 'REVEAL';

    await redis.set(`room:${updatedRoom.id}`, JSON.stringify(updatedRoom), { ex: 86400 });

    // Broadcast bowl_lifting first — triggers lift animation on all clients
    await broadcast(updatedRoom.id, 'bowl_lifting', { status: 'ROLLING' });

    // Broadcast dice result after a short server delay (gives animation time to play)
    await new Promise((r) => setTimeout(r, 800));
    await broadcast(updatedRoom.id, 'dice_result', {
      diceResult,
      status: 'REVEAL',
    });

    // After reveal, send final round results
    updatedRoom.status = 'RESULT';
    await redis.set(`room:${updatedRoom.id}`, JSON.stringify(updatedRoom), { ex: 86400 });

    await broadcast(updatedRoom.id, 'round_ended', {
      payouts: netProfits,
      players: updatedRoom.players,
      diceResult,
      status: 'RESULT',
    });

    return res.status(200).json({
      success: true,
      data: {
        diceResult,
        payouts: netProfits,
        players: updatedRoom.players,
      },
    });
  } catch (error) {
    console.error('Roll dice error:', error);
    return res.status(500).json({ success: false, error: 'Failed to roll dice' });
  }
}
