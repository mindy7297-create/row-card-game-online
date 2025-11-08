# row-card-game

A 4-player betting strategy card game with hidden and revealed cards, **online multiplayer (Socket.IO)**, **single betting round**, **side pots**, **AI bot**, and stubs for **desktop (Electron)** and **mobile (Capacitor)**. Licensed under **MIT**.

## Tech
- Client: Vite + React + TypeScript + Tailwind
- Server: Node + Express + Socket.IO (TypeScript)
- Shared: common types and pure logic
- Electron wrapper, Capacitor stub

## Quick Start

```bash
# 1) Install deps (use PNPM recommended)
pnpm i
# or: npm i --workspaces

# 2) Run server (terminal A)
pnpm --filter server dev

# 3) Run client (terminal B)
pnpm --filter client dev
# open http://localhost:5173
```

## Gameplay (short)
- 5 rounds. Everyone antes each round.
- Each player picks 3 cards per round:
  - Row 1: chosen, visible to others (blind to self).
  - Row 2 + Row 3: choose one from each; reveal one, keep the other hidden.
- Single betting round: check/bet/call/raise/fold/all-in (with side pots).
- Showdown: sum(Row1 + revealed + hidden); highest wins pot.
- Used cards are discarded.

## Deploy
- Client: Vercel/Netlify
- Server: Render/Fly/railway

## License
MIT
