import { Redis } from '@upstash/redis';
import type { Room } from '@baucua/shared';

const isDummy = !process.env.UPSTASH_REDIS_REST_URL;
const mockStorage = new Map<string, string>();
const mockRedis = {
  get: async <T>(key: string): Promise<T | null> => {
    const data = mockStorage.get(key);
    return data ? JSON.parse(data) : null;
  },
  set: async (key: string, value: string, opts?: any) => {
    mockStorage.set(key, value);
  }
} as unknown as Redis;

const redis = isDummy ? mockRedis : new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getRoom(roomId: string): Promise<Room | null> {
  const data = await redis.get<Room>(`room:${roomId}`);
  return data;
}

export async function setRoom(room: Room): Promise<void> {
  await redis.set(`room:${room.id}`, JSON.stringify(room), { ex: 86400 });
}

export async function updateRoom(
  id: string,
  updater: (room: Room) => Room
): Promise<Room> {
  const room = await getRoom(id);
  if (!room) throw new Error('Room not found');
  const updated = updater(room);
  await redis.set(`room:${id}`, JSON.stringify(updated), { ex: 86400 });
  return updated;
}

export { redis };
