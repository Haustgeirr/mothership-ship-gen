import type { SimulationNodeDatum } from 'd3';

export interface RoomNode {
  id: number;
  x: number;
  y: number;
  name: string;
  size?: number;
}

export interface RoomLink {
  source: RoomNode;
  target: RoomNode;
  type: 'door' | 'secondary';
}

export interface DungeonGraph {
  rooms: RoomNode[];
  links: RoomLink[];
}

export interface GenerationConfig {
  numRooms: number;
  dungeonWidth: number;
  dungeonHeight: number;
  branchingFactor?: number;
  directionalBias?: number;
  minSecondaryLinks?: number;
  maxSecondaryLinks?: number;
  cellSize?: number;
  numDecks?: number;
  roomsPerDeck?: number;
  roomsPerDeckArray?: number[];
  randomizeRoomsPerDeck?: boolean;
}

export interface NavigationGridData {
  grid: import('./AStarGrid').GridCell[][];
  cellSize: number;
}
