# 🎲 Bầu Cua — Vietnamese Dice Game

Real-time multiplayer dice betting game built with serverless architecture.

## 🏗️ Architecture

- **Frontend**: React + Vite + Tailwind + Framer Motion
- **API**: Vercel Serverless Functions
- **Realtime**: Pusher
- **Database**: Upstash Redis

## 📁 Project Structure

```
baucua/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── api/          # Vercel serverless functions
├── packages/
│   └── shared/       # Shared types & constants
├── package.json
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- pnpm (`npm i -g pnpm`)

### 2. Setup External Services

**Pusher** (https://pusher.com)
- Create a free account → Create a Channels app
- Note your App ID, Key, Secret, Cluster

**Upstash Redis** (https://upstash.com)
- Create a free account → Create a Redis database
- Note your REST URL and REST Token

### 3. Configure Environment

```bash
# In project root
cp .env.example .env

# In apps/api/
cp ../../.env .env

# In apps/web/
cp ../../.env .env
```

Edit `.env` with your actual credentials.

### 4. Install & Run

```bash
pnpm install
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

### 5. Play!

1. Open http://localhost:3000
2. Create a room (you become the Host)
3. Share the room code with friends
4. Friends join via the room code
5. Host starts a round → Players bet → Host rolls → Results!

## 🎮 Game Rules

- 6 symbols: Bầu 🍐, Cua 🦀, Tôm 🦐, Cá 🐟, Gà 🐓, Nai 🦌
- 3 dice are rolled each round
- Bet on any symbol(s) during the 15s betting phase
- Payout: 1 match = 1x, 2 matches = 2x, 3 matches = 3x
- 0 matches = lose your bet

## 🚢 Deployment

### Deploy API to Vercel
```bash
cd apps/api
vercel --prod
```

### Deploy Frontend to Vercel
```bash
cd apps/web
vercel --prod
```

Set environment variables in Vercel dashboard for both projects.
Update `VITE_API_URL` in the web project to point to your deployed API URL.

## ⚙️ Dev Mode

Hosts can override dice results for testing:
1. In Host Controls, click "🔧 Dev Mode"
2. Select desired dice values
3. Roll — the selected result will be used
