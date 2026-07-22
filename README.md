# Board Game House — Monopoly MVP

Full-stack multiplayer Monopoly with MongoDB persistence, real-time Socket.io sync, and optimistic UI.

## Architecture

```
/apps/web          → Next.js 16 client (React 19, Tailwind, Zustand)
/server            → Socket.io server (MongoDB, Express)
/packages
  /monopoly-engine → Pure game rules engine + tests
  /shared-types    → Zod socket event schemas
```

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure MongoDB

Edit `server/.env` with your MongoDB connection string:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/f4fun
```

**Note:** If MongoDB is unavailable, the server will start WITHOUT persistence (in-memory only). Game state will be lost on restart.

### 3. Start Development Servers

```bash
# Start both server (port 3001) and client (port 3000) concurrently
pnpm dev
```

**Open http://localhost:3000** to play!

### Alternative: Start Servers Separately

```bash
# Terminal 1: Server
pnpm --filter @f4fun/server dev

# Terminal 2: Client
pnpm --filter @f4fun/web dev
```

## Build for Production

```bash
pnpm build
```

## Run Tests

```bash
# Engine tests (Vitest)
pnpm --filter @f4fun/monopoly-engine test

# All tests
pnpm test
```

## Lint & Format

```bash
# Check all files
pnpm lint

# Fix issues
pnpm biome check --write .
```

## How to Play

1. **Create Room**: Enter your name, choose a token, click "Create Room"
2. **Share Code**: Copy the 6-character room code
3. **Join**: Others join by entering the code
4. **Start Game**: Host clicks "Start Game" (min 2 players)
5. **Play**: Roll dice → buy/decline properties → end turn

## Features Delivered

✅ Full Monopoly rules (MVP slice):
- Dice rolling with doubles detection
- Property purchasing and rent collection
- Turn-based multiplayer (2-8 players)
- Bankruptcy detection and win condition
- Real-time synchronization across all clients

✅ MongoDB persistence:
- Room state + player sessions
- Full game state snapshots
- Complete action history with before/after state

✅ UI/UX:
- GSAP dice animation with reduced-motion fallback
- Counter ticker animations for cash updates
- Sonner toasts for game events
- Responsive board layout
- Disconnect grace period (5 min reconnect window)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript strict |
| Styling | Tailwind CSS 4, CVA variants |
| State | Zustand (game + room stores) |
| Realtime | Socket.io client with auto-reconnect |
| Animation | GSAP (dice), Framer Motion (UI) |
| Server | Node.js, Socket.io, Express |
| Database | MongoDB with Mongoose |
| Validation | Zod schemas for all socket events |
| Testing | Vitest (engine: 32 tests passing) |
| Linting | Biome (zero config, fast) |
| Package Manager | pnpm with workspaces |

## MongoDB Connection Issues?

If you see `ECONNREFUSED` or DNS errors:

1. **Check your connection string** — ensure password is URL-encoded
2. **Test connectivity**:
   ```bash
   mongosh "your-connection-string-here"
   ```
3. **Network restrictions**: Some networks block MongoDB SRV records. Try:
   - Using a VPN
   - Switching to standard connection string (not `mongodb+srv://`)
   - Using MongoDB Atlas IP whitelist (add `0.0.0.0/0` for testing)

4. **Run without MongoDB**: The server will start in memory-only mode if DB is unavailable.

## Project Structure

```
apps/web/src/
├── app/                    # Next.js routes
│   ├── page.tsx           # Home (create/join)
│   ├── room/[code]/       # Lobby
│   └── game/[code]/       # Game board
├── components/
│   ├── ui/                # Generic components
│   └── animation/         # GSAP/Framer primitives
├── features/
│   ├── room/              # Lobby logic + store
│   └── monopoly/          # Game logic + store
└── lib/                   # Socket client, utils

server/src/
├── db/                    # Mongoose schemas
├── socket/                # Socket.io bootstrap + middleware
├── rooms/                 # Room manager + disconnect grace
└── games/monopoly/        # Game handlers + event logger

packages/monopoly-engine/src/
├── config/board.ts        # 40 tiles + card decks
├── dice.ts, movement.ts   # Core game modules
├── property.ts, rent.ts
├── turn.ts, bankruptcy.ts, win.ts
└── __tests__/             # 32 Vitest tests
```

## Environment Variables

### Server (`server/.env`)
```env
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/f4fun
DISCONNECT_GRACE_SECS=300
CORS_ORIGIN=http://localhost:3000
```

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Contributing

1. Run `pnpm lint` before committing
2. Add tests for engine changes
3. Follow Biome rules (enforced in CI)
4. Keep functions <40 lines
5. No `any` types allowed

## License

Private project.
