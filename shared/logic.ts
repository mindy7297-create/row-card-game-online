import type { PlayerState } from './types';

export const clone = <T>(x:T):T => JSON.parse(JSON.stringify(x));
export const range = (n:number)=>Array.from({length:n},(_,i)=>i);
export function shuffle<T>(arr:T[]):T[]{ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
export function initRows(): [number[],number[],number[]]{
  const f=()=>shuffle(range(10).map(i=>i+1));
  return [f(),f(),f()];
}
export function publicCard(p:PlayerState){ if(!p.sel.revealFrom) return null; return p.sel.revealFrom==='r2'?p.sel.r2:p.sel.r3; }
export function hiddenCard(p:PlayerState){ if(!p.sel.revealFrom) return null; return p.sel.revealFrom==='r2'?p.sel.r3:p.sel.r2; }
export function scoring(p:PlayerState){ return (p.sel.row1??0) + (publicCard(p)??0) + (hiddenCard(p)??0); }
export function everyoneSelected(players:PlayerState[]){ return players.every(p=>p.sel.row1!==null && p.sel.r2!==null && p.sel.r3!==null && p.sel.revealFrom!==null); }
