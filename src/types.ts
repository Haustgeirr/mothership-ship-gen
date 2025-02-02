import type { SimulationNodeDatum } from 'd3';

export interface RoomNode extends SimulationNodeDatum {
  id: number;
  name: string;
  x: number;
  y: number;
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
}
