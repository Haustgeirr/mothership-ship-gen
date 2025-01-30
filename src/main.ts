import { DungeonGenerator } from './generator';
import { DungeonRenderer } from './renderer';
import { roll } from './dice';
import type { GenerationConfig } from './types';

const svgElement = document.querySelector<SVGSVGElement>('#dungeon-svg');

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

// Initialize generator and renderer
const generator = new DungeonGenerator();
const renderer = new DungeonRenderer(svgElement);

// Generate dungeon configuration using dice rolls
const numRooms = roll(6, 4).total; // 4d6 rooms

const config: GenerationConfig = {
  numRooms,
  dungeonWidth: numRooms * 40, // Scale width based on number of rooms
  dungeonHeight: numRooms * 40, // Scale height based on number of rooms
  branchingFactor: roll(100).total, // d100: higher means more linear
  directionalBias: roll(100).total, // d100: higher means more likely to continue same direction
  minSecondaryLinks: roll(2).total, // 1d2 minimum secondary connections
  maxSecondaryLinks: roll(2).total + 2, // 1d2+2 maximum secondary connections
  cellSize: 40,
};

console.log('Generating dungeon with config:', config);

// Generate and render the dungeon
const dungeon = generator.generate(config);

if (generator.validateDungeon(dungeon)) {
  console.log('Generated valid dungeon with:', {
    rooms: dungeon.rooms.length,
    links: dungeon.links.length,
  });
  renderer.render(dungeon);
} else {
  console.error('Generated dungeon is not fully connected');
  renderer.renderDebug(dungeon); // Use debug render to see the issue
}
