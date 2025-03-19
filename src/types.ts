import type { SimulationNodeDatum } from 'd3';

export interface RoomNode {
  id: number;
  x: number;
  y: number;
  name: string;
  type?: RoomType;
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
  shipTypeName?: string;
}

export interface NavigationGridData {
  grid: import('./AStarGrid').GridCell[][];
  cellSize: number;
}

export enum RoomType {
  BARRACKS = 'BARRACKS',
  CARGO_HOLD = 'CARGO HOLD',
  COMMAND = 'COMMAND',
  COMPUTER = 'COMPUTER',
  CRYOCHAMBER = 'CRYOCHAMBER',
  ENGINE = 'ENGINE',
  ENGINES = 'ENGINES',
  GALLEY = 'GALLEY',
  HABITAT_AREA = 'HABITAT AREA',
  JUMP_DRIVE = 'JUMP DRIVE',
  LIFE_SUPPORT = 'LIFE SUPPORT',
  LIVING_QUARTERS = 'LIVING QUARTERS',
  MEDBAY = 'MEDBAY',
  SCIENCE_LAB = 'SCIENCE LAB',
  THRUSTERS = 'THRUSTERS',
  WEAPON = 'WEAPON'
}
