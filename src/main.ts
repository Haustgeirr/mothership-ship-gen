import { DungeonGenerator } from './dungeon';

const svgElement = document.getElementById(
  'dungeon-svg'
) as SVGSVGElement | null;

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

const dungeon = new DungeonGenerator();

// Add rooms
const room1 = dungeon.addRoom('Entrance', 100, 100);
const room2 = dungeon.addRoom('Treasure', 300, 300);
const room3 = dungeon.addRoom('Corridor', 200, 200);

// Add links
dungeon.addLink(room1.id, room2.id, 'door');
dungeon.addLink(room2.id, room3.id, 'secret tunnel');

// Render
dungeon.render(svgElement);
