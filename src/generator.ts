import type { RoomNode, RoomLink } from './dungeon';

interface DungeonGenerationConfig {
  numRooms: number; // Number of rooms to generate
  dungeonWidth: number; // Width of the dungeon canvas
  dungeonHeight: number; // Height of the dungeon canvas
}

interface BranchingConfig {
  maxBranches: number; // Maximum additional branches per room
}

// Generate random rooms with integer coordinates and no overlap
export function generateRooms(config: DungeonGenerationConfig): RoomNode[] {
  const { numRooms, dungeonWidth, dungeonHeight } = config;
  const rooms: RoomNode[] = [];
  const occupiedPositions = new Set<string>();

  for (let i = 0; i < numRooms; i++) {
    let x: number, y: number;

    // Generate unique integer coordinates for the room
    do {
      x = Math.floor(Math.random() * dungeonWidth);
      y = Math.floor(Math.random() * dungeonHeight);
    } while (occupiedPositions.has(`${x},${y}`));

    // Mark the position as occupied
    occupiedPositions.add(`${x},${y}`);

    const room: RoomNode = {
      id: `room-${i}`,
      name: `Room ${i}`,
      x,
      y,
    };
    rooms.push(room);
  }

  return rooms;
}

// Generate links between rooms
export function generateLinks(
  rooms: RoomNode[],
  config: {
    minConnections: number; // Minimum connections per room
    maxConnections: number; // Maximum connections per room
  }
): RoomLink[] {
  const { minConnections, maxConnections } = config;
  const links: RoomLink[] = [];
  const connectedPairs = new Set<string>();

  const pairKey = (source: string, target: string) =>
    source < target ? `${source}-${target}` : `${target}-${source}`;

  // Helper to add a link if it doesn't exist
  const addLink = (source: RoomNode, target: RoomNode, type: string) => {
    const key = pairKey(source.id, target.id);
    if (!connectedPairs.has(key) && source.id !== target.id) {
      links.push({ source: source.id, target: target.id, type });
      connectedPairs.add(key);
    }
  };

  // Ensure all rooms have at least `minConnections`
  rooms.forEach((room) => {
    while (
      links.filter((link) => link.source === room.id || link.target === room.id)
        .length < minConnections
    ) {
      const targetRoom = rooms[Math.floor(Math.random() * rooms.length)];
      addLink(room, targetRoom, 'door');
    }
  });

  // Add additional random connections up to `maxConnections`
  rooms.forEach((room) => {
    const currentConnections = links.filter(
      (link) => link.source === room.id || link.target === room.id
    ).length;
    const additionalConnections = Math.floor(
      Math.random() * (maxConnections - currentConnections + 1)
    );

    for (let i = 0; i < additionalConnections; i++) {
      const targetRoom = rooms[Math.floor(Math.random() * rooms.length)];
      addLink(room, targetRoom, Math.random() < 0.5 ? 'secret tunnel' : 'door');
    }
  });

  return links;
}

// Full dungeon generation
export function generateDungeon(config: {
  numRooms: number;
  dungeonWidth: number;
  dungeonHeight: number;
  minConnections: number;
  maxConnections: number;
}): {
  rooms: RoomNode[];
  links: RoomLink[];
} {
  const {
    numRooms,
    dungeonWidth,
    dungeonHeight,
    minConnections,
    maxConnections,
  } = config;

  const rooms = generateRooms({ numRooms, dungeonWidth, dungeonHeight });
  const links = generateLinks(rooms, { minConnections, maxConnections });

  return { rooms, links };
}
