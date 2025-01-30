import type { SimulationNodeDatum } from 'd3';

export interface RoomNode extends SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
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
}
