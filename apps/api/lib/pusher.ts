import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher {
  if (!pusherInstance) {
    const isDummy = !process.env.PUSHER_APP_ID || process.env.PUSHER_APP_ID === 'your_app_id';
    if (isDummy) {
      console.log('Using mock Pusher instance');
      pusherInstance = {
        trigger: async (channel: string, event: string, data: any) => {
          console.log(`[Mock Pusher] Triggered ${event} on ${channel}`);
          return {} as any;
        }
      } as Pusher;
    } else {
      pusherInstance = new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.PUSHER_CLUSTER!,
        useTLS: true,
      });
    }
  }
  return pusherInstance;
}

export async function broadcast(roomId: string, event: string, data: unknown): Promise<void> {
  const pusher = getPusher();
  await pusher.trigger(`room-${roomId}`, event, data);
}
