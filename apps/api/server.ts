import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '.env') });

import createRoom from './api/create-room';
import joinRoom from './api/join-room';
import getRoom from './api/get-room';
import startRound from './api/start-round';
import placeBet from './api/place-bet';
import rollDice from './api/roll-dice';
import addChips from './api/add-chips';
import disconnect from './api/disconnect';

const app = express();

app.use(cors());
app.use(express.json());

// Helper to adapt Express req/res to Vercel handler
const adapt = (handler: any) => async (req: express.Request, res: express.Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// CORS handled globally
app.post('/api/create-room', adapt(createRoom));
app.post('/api/join-room', adapt(joinRoom));
app.get('/api/get-room', adapt(getRoom));
app.post('/api/start-round', adapt(startRound));
app.post('/api/place-bet', adapt(placeBet));
app.post('/api/roll-dice', adapt(rollDice));
app.post('/api/add-chips', adapt(addChips));
app.post('/api/disconnect', adapt(disconnect));

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`🚀 API Server running locally on http://localhost:${port}`);
  console.log('Using local Express wrapper for Vercel Functions');
});

setInterval(() => console.log('Still alive'), 5000);
