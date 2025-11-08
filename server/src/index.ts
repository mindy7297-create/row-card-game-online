import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { randomBytes } from 'crypto';
import { initRows, scoring, everyoneSelected } from '../../shared/logic.js';
import type { RoomState, PlayerState } from '../../shared/types.js';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const rooms = new Map<string, RoomState>();

function newPlayer(name: string): PlayerState {
  return {
    id: Math.random().toString(36).slice(2),
    name, chips: 200, rows: initRows(),
    sel: { row1: null, r2: null, r3: null, revealFrom: null},
    folded: false, allIn: false, contribution: 0
  };
}

function broadcast(roomId: string){ const s = rooms.get(roomId); if(s) io.to(roomId).emit('state', s); }

io.on('connection', (socket)=>{
  let roomId: string|null = null;
  let me = -1;

  socket.on('createRoom', (name: string)=>{
    const id = randomBytes(3).toString('hex');
    const host = newPlayer(name||'Player');
    const state: RoomState = { round:1, ante:2, phase:'setup', currentActor:0, currentBet:0, minRaise:2, log:[`Room ${id} created`], players:[host] };
    rooms.set(id, state);
    socket.join(id); roomId = id; me = 0;
    socket.emit('roomCreated', id);
    broadcast(id);
  });

  socket.on('joinRoom', (id: string, name: string)=>{
    const s = rooms.get(id); if(!s) return socket.emit('error', 'Room not found');
    if (s.players.length>=4) return socket.emit('error','Room full');
    const p = newPlayer(name||'Player');
    s.players.push(p);
    socket.join(id); roomId = id; me = s.players.length-1;
    s.log.unshift(`${p.name} joined`);
    socket.emit('roomJoined', id);
    broadcast(id);
  });

  socket.on('startRound', ()=>{
    if(!roomId) return; const S = rooms.get(roomId)!;
    if (S.phase!=='setup' || S.round>5) return;
    S.players.forEach(p=>{
      const paid = Math.min(S.ante, p.chips); p.chips -= paid; p.contribution = paid;
      if (p.chips===0) p.allIn = true; p.folded=false;
      p.sel = { row1:null, r2:null, r3:null, revealFrom:null };
    });
    S.currentBet=0; S.minRaise=Math.max(2,S.ante); S.phase='select';
    S.log.unshift(`Round ${S.round}: everyone antes ${S.ante}.`);
    broadcast(roomId);
  });

  socket.on('selectRow1', (val:number)=>{
    if(!roomId) return; const S=rooms.get(roomId)!; if(S.phase!=='select') return;
    const p = S.players[me]; if (!p.rows[0].includes(val)) return; p.sel.row1 = val;
  });

  socket.on('selectR2R3', (r2:number, r3:number, revealFrom:'r2'|'r3')=>{
    if(!roomId) return; const S=rooms.get(roomId)!; if(S.phase!=='select') return;
    const p = S.players[me]; p.sel.r2=r2; p.sel.r3=r3; p.sel.revealFrom=revealFrom;
  });

  socket.on('lockSelections', ()=>{
    if(!roomId) return; const S=rooms.get(roomId)!; if(S.phase!=='select') return;
    if(!everyoneSelected(S.players)) return;
    S.players.forEach(p=>{
      const {row1,r2,r3}=p.sel;
      if(row1!=null) p.rows[0]=p.rows[0].filter(x=>x!==row1);
      if(r2!=null) p.rows[1]=p.rows[1].filter(x=>x!==r2);
      if(r3!=null) p.rows[2]=p.rows[2].filter(x=>x!==r3);
    });
    S.phase='bet'; S.currentActor=0; S.currentBet=0; S.minRaise=Math.max(2,S.ante);
    S.log.unshift('Selections locked. Proceed to betting.');
    broadcast(roomId);
  });

  function nextActor(S:RoomState, start:number){
    for(let k=1;k<=S.players.length;k++){ const j=(start+k)%S.players.length; const P=S.players[j]; if(!P.folded && !P.allIn) return j; }
    return -1;
  }
  function everyoneSettled(S:RoomState){ return S.players.every(p=>p.folded||p.allIn||p.contribution===S.currentBet); }

  socket.on('act', (action:'check'|'call'|'bet'|'fold'|'allin', size?:number)=>{
    if(!roomId) return; const S=rooms.get(roomId)!; if(S.phase!=='bet') return;
    const i = S.currentActor; const p=S.players[i];
    if(action==='check'){ if(S.currentBet!==0) return; S.log.unshift(`${p.name} checks.`); const nxt=nextActor(S,i); if(nxt===-1) S.phase='showdown'; else S.currentActor=nxt; return broadcast(roomId); }
    if(action==='call'){ const toCall=Math.max(0,S.currentBet-p.contribution); const pay=Math.min(toCall,p.chips); p.chips-=pay; p.contribution+=pay; if(p.chips===0) p.allIn=true; S.log.unshift(`${p.name} calls ${S.currentBet}.`); const nxt=nextActor(S,i); if(nxt===-1||everyoneSettled(S)) S.phase='showdown'; else S.currentActor=nxt; return broadcast(roomId); }
    if(action==='bet'){ const raiseSize=Math.max(size??S.minRaise,S.minRaise); const toCall=Math.max(0,S.currentBet-p.contribution); const total=Math.min(p.chips,toCall+raiseSize); p.chips-=total; p.contribution+=total; if(p.chips===0) p.allIn=true; const newLevel=Math.max(S.currentBet,p.contribution); S.currentBet=newLevel; S.minRaise=raiseSize; S.log.unshift(`${p.name} ${toCall===0?'bets':'raises to'} ${newLevel}.`); const nxt=nextActor(S,i); if(nxt===-1) S.phase='showdown'; else S.currentActor=nxt; return broadcast(roomId); }
    if(action==='fold'){ p.folded=true; S.log.unshift(`${p.name} folds.`); const alive=S.players.filter(x=>!x.folded).length; if(alive<=1) S.phase='showdown'; else { const nxt=nextActor(S,i); if(nxt===-1) S.phase='showdown'; else S.currentActor=nxt; } return broadcast(roomId); }
    if(action==='allin'){ const pay=p.chips; p.chips=0; p.contribution+=pay; p.allIn=true; S.currentBet=Math.max(S.currentBet,p.contribution); S.log.unshift(`${p.name} goes ALL-IN.`); const nxt=nextActor(S,i); if(nxt===-1) S.phase='showdown'; else S.currentActor=nxt; return broadcast(roomId); }
  });

  socket.on('settleShowdown', ()=>{
    if(!roomId) return; const S=rooms.get(roomId)!; if(S.phase!=='showdown') return;
    const contrib = S.players.map(p=>p.contribution);
    const tiers = Array.from(new Set(contrib.filter(c=>c>0))).sort((a,b)=>a-b);
    let prev=0; const pots: {amount:number, eligible:Set<number>}[] = [];
    for(const t of tiers){
      const participants = S.players.map((p,idx)=>({idx, amount: Math.max(0, Math.min(p.contribution,t)-prev), folded: p.folded})).filter(x=>x.amount>0);
      const amount = participants.reduce((s,x)=>s+x.amount,0);
      const elig = new Set(participants.filter(x=>!S.players[x.idx].folded).map(x=>x.idx));
      if(amount>0) pots.push({amount, eligible: elig}); prev=t;
    }
    const cand = S.players.map((p,i)=>({i,sc:scoring(p),folded:p.folded,name:p.name})).filter(c=>!c.folded);
    for(const pot of pots){
      const elig = cand.filter(c=>pot.eligible.has(c.i)); if(elig.length===0) continue;
      const top = Math.max(...elig.map(e=>e.sc));
      const winners = elig.filter(e=>e.sc===top);
      const share = Math.floor(pot.amount / winners.length);
      winners.forEach(w=>{ S.players[w.i].chips += share; });
      const rem = pot.amount - share*winners.length; if(rem>0) S.players[winners[0].i].chips += rem;
      S.log.unshift(`Pot ${pot.amount}: ${winners.map(w=>`${w.name} (${w.sc})`).join(', ')} win${winners.length>1?' (split)':''}.`);
    }
    if(S.round>=5){ S.phase='over'; S.log.unshift('Game over.'); } else { S.round+=1; S.phase='setup'; }
    S.players.forEach(p=>{ p.sel={row1:null,r2:null,r3:null,revealFrom:null}; p.folded=false; p.allIn=false; p.contribution=0; });
    broadcast(roomId);
  });
});

httpServer.listen(PORT, ()=>{ console.log('Server on', PORT); });
