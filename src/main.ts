import { DungeonGenerator } from './generator';
import { DungeonRenderer } from './renderer';
import type { GenerationConfig } from './types';
import { PRNG } from './prng';
import { Dice } from './dice';
import { DUNGEON_CONSTANTS } from './constants';

const svgElement = document.querySelector<SVGSVGElement>('#dungeon-svg');

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

// Initialize PRNG, generator and renderer
// const seed = 1738277232585;
const seed = 1738405946252;
// const seed = Date.now();
new PRNG(seed);

// Update seed display
const seedDisplay = document.querySelector<HTMLSpanElement>('#seed-display');
if (seedDisplay) {
  seedDisplay.textContent = seed.toString();
}

const generator = new DungeonGenerator();
const renderer = new DungeonRenderer(svgElement);

// Generate dungeon configuration using dice rolls
const numRooms = Dice.roll(6, 4).total; // 4d6 rooms

const config: GenerationConfig = {
  numRooms,
  dungeonWidth: numRooms * DUNGEON_CONSTANTS.CELL_SIZE,
  dungeonHeight: numRooms * DUNGEON_CONSTANTS.CELL_SIZE,
  branchingFactor: Dice.roll(100).total, // d100: higher means more linear
  directionalBias: Dice.roll(100).total, // d100: higher means more likely to continue same direction
  minSecondaryLinks: Dice.roll(2).total, // 1d2 minimum secondary connections
  maxSecondaryLinks: Dice.roll(2).total + 2, // 1d2+2 maximum secondary connections
  cellSize: DUNGEON_CONSTANTS.CELL_SIZE,
};

console.log('Generating dungeon with config:', config);

// Generate and render the dungeon
const dungeon = generator.generate(config);

if (generator.validateDungeon(dungeon)) {
  console.log('Generated valid dungeon with:', {
    rooms: dungeon.rooms.length,
    links: dungeon.links.length,
  });
  const navigationData = generator.createNavigationGrid();
  renderer.render(dungeon, navigationData);
} else {
  console.error('Generated dungeon is not fully connected');
  const navigationData = generator.createNavigationGrid();
  renderer.renderDebug(dungeon, navigationData); // Pass navigation data to debug render
}
