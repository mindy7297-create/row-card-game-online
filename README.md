# RowCard – Multiplayer Card Game (Web)

A 4-player online card game where each player selects hidden & revealed cards and bets chips.  
Built with Node.js, Socket.IO and React (Vite). Fully real-time and works in browser without install.

---

## 🎮 Live Game

Play here:  
https://row-card-game-online-client.vercel.app/

Backend API / WebSocket server:  
https://row-card-game-online-server.onrender.com/

---

## 🧠 How the Game Works (Quick Rules)

- 4 players, each starts with the same number of chips
- Each player has 3 rows of cards (1–10)
- **Row 1:** choose 1 card → face down (only others can see it)
- **Row 2 & 3:** choose 2 cards each → reveal 1, keep 1 hidden
- After all cards are placed → betting round (bet / call / raise / fold)
- Showdown: highest total of 3 cards wins the pot
- Game repeats for 5 rounds (or until players are out of chips)

---

## 🛠️ Tech Stack

| Part | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + Socket.IO |
| Realtime | WebSockets |
| Hosting | Vercel
