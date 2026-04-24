const API_URL = import.meta.env.VITE_API_URL || '';
const baseUrl = API_URL.replace(/\/$/, ''); // Remove trailing slash if present

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    return { success: false, error: 'Network error' };
  }
}

export const api = {
  createRoom: (hostName: string) =>
    request('create-room', {
      method: 'POST',
      body: JSON.stringify({ hostName }),
    }),

  joinRoom: (roomId: string, playerName: string) =>
    request('join-room', {
      method: 'POST',
      body: JSON.stringify({ roomId, playerName }),
    }),

  getRoom: (roomId: string) =>
    request(`get-room?roomId=${roomId}`),

  startRound: (roomId: string, hostId: string) =>
    request('start-round', {
      method: 'POST',
      body: JSON.stringify({ roomId, hostId }),
    }),

  placeBet: (roomId: string, playerId: string, symbol: string, amount: number) =>
    request('place-bet', {
      method: 'POST',
      body: JSON.stringify({ roomId, playerId, symbol, amount }),
    }),

  rollDice: (roomId: string, hostId: string, controlledResult?: string[]) =>
    request('roll-dice', {
      method: 'POST',
      body: JSON.stringify({ roomId, hostId, controlledResult }),
    }),

  addChips: (roomId: string, hostId: string, targetPlayerId: string, amount: number) =>
    request('add-chips', {
      method: 'POST',
      body: JSON.stringify({ roomId, hostId, targetPlayerId, amount }),
    }),

  disconnect: (roomId: string, playerId: string) =>
    request('disconnect', {
      method: 'POST',
      body: JSON.stringify({ roomId, playerId }),
    }),
};
