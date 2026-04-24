import Pusher from 'pusher-js';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });
  }
  return pusherInstance;
}

export function subscribeToRoom(roomId: string) {
  const pusher = getPusher();
  return pusher.subscribe(`room-${roomId}`);
}

export function unsubscribeFromRoom(roomId: string) {
  const pusher = getPusher();
  pusher.unsubscribe(`room-${roomId}`);
}
