import { Redis } from '@upstash/redis';
import type { Room } from './shared';

const isDummy = !process.env.UPSTASH_REDIS_REST_URL;
const mockStorage = new Map<string, string>();
const mockExpiry = new Map<string, number>();

const mockRedis = {
  get: async <T>(key: string): Promise<T | null> => {
    // Check expiry
    const exp = mockExpiry.get(key);
    if (exp && Date.now() > exp) {
      mockStorage.delete(key);
      mockExpiry.delete(key);
      return null;
    }
    const data = mockStorage.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data as unknown as T;
    }
  },
  set: async (key: string, value: string, opts?: any) => {
    // Check expiry before NX check
    const exp = mockExpiry.get(key);
    if (exp && Date.now() > exp) {
      mockStorage.delete(key);
      mockExpiry.delete(key);
    }
    if (opts?.nx && mockStorage.has(key)) {
      return null;
    }
    mockStorage.set(key, value);
    // Support px (milliseconds) and ex (seconds) TTL
    if (opts?.px) {
      mockExpiry.set(key, Date.now() + opts.px);
    } else if (opts?.ex) {
      mockExpiry.set(key, Date.now() + opts.ex * 1000);
    }
    return 'OK';
  },
  del: async (key: string) => {
    mockExpiry.delete(key);
    return mockStorage.delete(key) ? 1 : 0;
  },
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
