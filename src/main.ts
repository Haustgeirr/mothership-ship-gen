import { DungeonGenerator } from './dungeon';
import { generateDungeon } from './generator';

const svgElement = document.querySelector<SVGSVGElement>('#dungeon-svg');

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

const dungeonGenerator = new DungeonGenerator();

// Generate a dungeon
const config = {
  numRooms: 15, // Number of rooms
  dungeonWidth: 8, // Canvas width
  dungeonHeight: 6, // Canvas height
  minConnections: 1, // Minimum connections per room
  maxConnections: 3, // Maximum connections per room
};

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
