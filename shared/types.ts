export type PlayerId = string;
export type Phase = 'setup'|'select'|'bet'|'showdown'|'over';

export interface Selection {
  row1: number|null;
  r2: number|null;
  r3: number|null;
  revealFrom: 'r2'|'r3'|null;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  chips: number;
  rows: [number[],number[],number[]];
  sel: Selection;
  folded: boolean;
  allIn: boolean;
  contribution: number;
}

export interface RoomState {
  round: number;
  ante: number;
  phase: Phase;
  currentActor: number;
  currentBet: number;
  minRaise: number;
  log: string[];
  players: PlayerState[];
}
