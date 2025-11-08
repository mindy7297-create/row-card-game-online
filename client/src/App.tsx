import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState } from '../../shared/types';
import { publicCard, hiddenCard } from '../../shared/logic';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

function Card({children, className=''}:{children:React.ReactNode, className?:string}){
  return <div className={`rounded-2xl shadow p-3 bg-white border ${className}`}>{children}</div>
}
function Button({children,onClick,disabled=false,variant='default'}:{children:React.ReactNode,onClick?:()=>void,disabled?:boolean,variant?:'default'|'secondary'|'danger'|'outline'}){
  const base='px-3 py-2 rounded-lg text-sm font-medium transition';
  const styles={default:'bg-black text-white hover:opacity-90',secondary:'bg-gray-200 hover:bg-gray-300',danger:'bg-rose-600 text-white hover:opacity-90',outline:'border hover:bg-gray-50'} as const;
  return <button className={`${base} ${styles[variant]} ${disabled?'opacity-50 cursor-not-allowed':''}`} onClick={disabled?undefined:onClick}>{children}</button>
}
function Input({value,onChange,placeholder}:{value:string,onChange:(s:string)=>void,placeholder?:string}){ return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="px-3 py-2 border rounded-lg w-full" /> }
function Pill({children}:{children:React.ReactNode}){ return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 border">{children}</span> }

function Tutorial({open,onClose}:{open:boolean,onClose:()=>void}){
  if(!open) return null;
  return (<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <Card className="max-w-lg w-[90%]">
      <h2 className="text-xl font-bold mb-2">How to Play</h2>
      <ol className="list-decimal pl-6 space-y-1 text-sm">
        <li>5 rounds, everyone antes.</li>
        <li>Pick Row1 (others see, you don’t). Pick one from Row2 and one from Row3; reveal one, keep the other hidden.</li>
        <li>Single betting round. All-in and side pots supported.</li>
        <li>Showdown: sum of 3 cards, highest wins.</li>
        <li>Cards used are discarded.</li>
      </ol>
      <div className="mt-4 flex gap-2 justify-end"><Button onClick={onClose}>Got it</Button></div>
    </Card>
  </div>);
}

export default function App(){
  const [name, setName] = useState('Player');
  const [roomInput, setRoomInput] = useState('');
  const [createdRoom, setCreatedRoom] = useState('');
  const [state, setState] = useState<RoomState|null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const socketRef = useRef<Socket|null>(null);

  useEffect(()=>{
    const s = io(SERVER_URL);
    socketRef.current = s;
    s.on('state', (st:RoomState)=> setState(st));
    s.on('roomCreated', (room:string)=> setCreatedRoom(room));
    s.on('roomJoined', ()=>{});
    s.on('error', (msg:string)=> alert(msg));
    return ()=>{ s.disconnect(); }
  }, []);

  const s = socketRef.current;
  const createRoom = ()=> s?.emit('createRoom', name);
  const joinRoom = ()=> roomInput && s?.emit('joinRoom', roomInput, name);
  const startRound = ()=> s?.emit('startRound');
  const lockSelections = ()=> s?.emit('lockSelections');
  const act = (a:'check'|'call'|'bet'|'fold'|'allin', size?:number)=> s?.emit('act', a, size);
  const settle = ()=> s?.emit('settleShowdown');

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
      <Tutorial open={tutorialOpen} onClose={()=>setTutorialOpen(false)} />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">row-card-game</h1>
          <Button variant="outline" onClick={()=>setTutorialOpen(true)}>Tutorial</Button>
        </div>

        <Card>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <div className="text-xs mb-1">Your name</div>
              <Input value={name} onChange={setName} />
            </div>
            <Button onClick={createRoom}>Create Room</Button>
            <div className="w-px h-8 bg-gray-200" />
            <div className="grow">
              <div className="text-xs mb-1">Room code</div>
              <Input value={roomInput} onChange={setRoomInput} placeholder="e.g. a1b2c3" />
            </div>
            <Button onClick={joinRoom}>Join Room</Button>
          </div>
          {createdRoom && <div className="mt-2 text-sm">Room created: <Pill>{createdRoom}</Pill> Share this code.</div>}
        </Card>

        {state && (
          <>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Pill>Round {state.round}/5</Pill>
                <Pill>Ante {state.ante}</Pill>
                <Pill>Phase {state.phase}</Pill>
                <Pill>Pot {state.players.reduce((s,p)=>s+p.contribution,0)}</Pill>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.phase==='setup' && <Button onClick={startRound}>Start Round</Button>}
                {state.phase==='select' && <Button onClick={lockSelections}>Lock Selections</Button>}
                {state.phase==='bet' && (
                  <>
                    <Button variant="outline" onClick={()=>act('check')}>Check</Button>
                    <Button variant="outline" onClick={()=>act('call')}>Call</Button>
                    <Button onClick={()=>act('bet', 2)}>Bet/Raise</Button>
                    <Button variant="danger" onClick={()=>act('fold')}>Fold</Button>
                    <Button variant="secondary" onClick={()=>act('allin')}>All-in</Button>
                  </>
                )}
                {state.phase==='showdown' && <Button onClick={settle}>Settle Showdown</Button>}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.players.map((p, idx)=>{
                const pub = publicCard(p);
                const hid = hiddenCard(p);
                return (
                  <Card key={idx}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-sm">Chips: <b>{p.chips}</b></div>
                    </div>
                    <div className="text-xs mt-1">Visible: Row1 {p.sel.row1 ?? '-'} + {pub ?? '-'}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div><div className="font-semibold">Row 1</div><div className="flex flex-wrap gap-1 mt-1">{p.rows[0].map(v=>(<Pill key={v}>{v}</Pill>))}</div></div>
                      <div><div className="font-semibold">Row 2</div><div className="flex flex-wrap gap-1 mt-1">{p.rows[1].map(v=>(<Pill key={v}>{v}</Pill>))}</div></div>
                      <div><div className="font-semibold">Row 3</div><div className="flex flex-wrap gap-1 mt-1">{p.rows[2].map(v=>(<Pill key={v}>{v}</Pill>))}</div></div>
                    </div>
                    <div className="mt-2 text-xs opacity-70">Hidden card: {hid ?? '-'}</div>
                  </Card>
                );
              })}
            </div>

            <Card>
              <div className="text-sm">Activity</div>
              <ul className="text-xs mt-2 space-y-1">{state.log.map((m,i)=>(<li key={i}>• {m}</li>))}</ul>
            </Card>
          </>
        )}

        {!state && <Card><div className="text-sm">Create or join a room to start playing.</div></Card>}
      </div>
    </div>
  );
}
