import { DungeonGenerator } from './dungeon';
import { generateDungeon } from './generator';
import { prng, roll } from './dice';

const svgElement = document.querySelector<SVGSVGElement>('#dungeon-svg');

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

// Initialize with specific seed
const dungeonGenerator = new DungeonGenerator();
prng.constructor(1234);

const numRooms = roll(6, 4).total;

// Generate a dungeon
const config = {
  numRooms: roll(6, 4).total, // 3d6+8 (11-26 rooms)
  dungeonWidth: numRooms, // 4d6+8 (12-32 width)
  dungeonHeight: numRooms, // 4d6+8 (12-32 height)
  minConnections: 1, // 1d2 (1-2 min connections)
  maxConnections: roll(5).total, // 1d2+2 (3-4 max connections)
  branchingFactor: roll(100).total, // d100: higher means more linear
  directionalBias: roll(100).total, // d100: higher means more likely to continue same direction
};

console.log(config);

const { rooms, links } = generateDungeon(config);

rooms.forEach((room) => dungeonGenerator.addRoom(room.name, room.x, room.y));
links.forEach((link) => {
  const sourceId =
    typeof link.source === 'string' ? link.source : link.source.id;
  const targetId =
    typeof link.target === 'string' ? link.target : link.target.id;
  dungeonGenerator.addLink(sourceId, targetId, link.type);
});

dungeonGenerator.render(svgElement);
