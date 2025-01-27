import type { RoomNode, RoomLink } from './dungeon';

interface DungeonGenerationConfig {
  numRooms: number; // Number of rooms to generate
  dungeonWidth: number; // Width of the dungeon canvas
  dungeonHeight: number; // Height of the dungeon canvas
  branchingFactor: number; // Now controls what % of rooms will be part of branches
  directionalBias?: number; // 0-1: How likely to continue in the same direction
}

// Generate random rooms with integer coordinates and no overlap
export function generateRooms(config: DungeonGenerationConfig): {
  rooms: RoomNode[];
  links: RoomLink[];
} {
  const {
    numRooms,
    dungeonWidth,
    dungeonHeight,
    branchingFactor,
    directionalBias = 0.7,
  } = config;

  // Add timeout constants at the start of the function
  const startTime = Date.now();
  const TIMEOUT_MS = 1500; // 1.5 second timeout for room generation

  console.log('Starting dungeon generation with config:', {
    numRooms,
    dungeonWidth,
    dungeonHeight,
    branchingFactor,
    directionalBias,
  });

  // Ensure we have at least 2 main path rooms or 1/3 of total rooms
  const mainPathRooms = Math.max(
    2,
    Math.floor(numRooms * Math.min(0.33, 1 - branchingFactor))
  );
  const branchRooms = numRooms - mainPathRooms;

  console.log(
    `Planning ${mainPathRooms} rooms for main path, ${branchRooms} for branches`
  );

  const rooms: RoomNode[] = [];
  const links: RoomLink[] = [];
  const occupiedPositions = new Map<string, RoomNode>();
  const getPositionKey = (x: number, y: number) => `${x},${y}`;

  // Helper to check if a position is occupied
  const isPositionOccupied = (x: number, y: number): boolean => {
    return occupiedPositions.has(getPositionKey(x, y));
  };

  // Helper to add a room and track its position
  const addRoomToGraph = (room: RoomNode): void => {
    rooms.push(room);
    occupiedPositions.set(getPositionKey(room.x, room.y), room);
  };

  // Start with center room
  const centerX = Math.floor(dungeonWidth / 2);
  const centerY = Math.floor(dungeonHeight / 2);
  const firstRoom: RoomNode = {
    id: 'room-0',
    name: 'Room 0',
    x: centerX,
    y: centerY,
  };
  addRoomToGraph(firstRoom);

  // Helper to get valid adjacent positions
  const getValidAdjacentPositions = (
    x: number,
    y: number,
    lastDirection?: [number, number],
    isMainPath: boolean = false
  ): [number, number][] => {
    const adjacent: [number, number][] = [
      [x + 1, y], // East
      [x - 1, y], // West
      [x, y + 1], // South
      [x, y - 1], // North
    ];

    // Filter valid positions
    return adjacent.filter(([newX, newY]) => {
      // Check bounds
      if (
        newX < 0 ||
        newX >= dungeonWidth ||
        newY < 0 ||
        newY >= dungeonHeight
      ) {
        return false;
      }

      // Check if position is occupied
      if (isPositionOccupied(newX, newY)) {
        return false;
      }

      // For main path, check directional bias
      if (isMainPath && lastDirection && Math.random() < directionalBias) {
        const [dx, dy] = lastDirection;
        return (
          (newX - x === dx && newY - y === dy) ||
          (Math.abs(newX - x) === Math.abs(dx) &&
            Math.abs(newY - y) === Math.abs(dy))
        );
      }

      // Check for valid connections
      const adjacentRooms = Array.from(occupiedPositions.values()).filter(
        (room) =>
          (Math.abs(room.x - newX) === 1 && room.y === newY) ||
          (Math.abs(room.y - newY) === 1 && room.x === newX)
      );

      return isMainPath
        ? adjacentRooms.length <= 1
        : adjacentRooms.length === 1;
    });
  };

  // Generate main path first
  let lastDirection: [number, number] | undefined;
  let currentRoom = firstRoom;

  for (let i = 1; i < mainPathRooms; i++) {
    const validPositions = getValidAdjacentPositions(
      currentRoom.x,
      currentRoom.y,
      lastDirection,
      true
    );

    if (validPositions.length === 0) {
      break;
    }

    const [newX, newY] = validPositions[0];
    const room: RoomNode = {
      id: `room-${i}`,
      name: `Room ${i}`,
      x: newX,
      y: newY,
    };

    addRoomToGraph(room);
    links.push({
      source: currentRoom,
      target: room,
      type: 'door',
    });

    lastDirection = [newX - currentRoom.x, newY - currentRoom.y];
    currentRoom = room;
  }

  // Add branch rooms
  let branchId = rooms.length;
  while (rooms.length < numRooms) {
    const sourceRoom = rooms[Math.floor(Math.random() * rooms.length)];
    const validPositions = getValidAdjacentPositions(
      sourceRoom.x,
      sourceRoom.y,
      undefined,
      false
    );

    if (validPositions.length === 0) continue;

    const [newX, newY] = validPositions[0];
    const room: RoomNode = {
      id: `room-${branchId++}`,
      name: `Room ${branchId}`,
      x: newX,
      y: newY,
    };

    addRoomToGraph(room);
    links.push({
      source: sourceRoom,
      target: room,
      type: 'door',
    });
  }

  return { rooms, links };
}

// Full dungeon generation
export function generateDungeon(config: {
  numRooms: number;
  dungeonWidth: number;
  dungeonHeight: number;
  minConnections?: number;
  maxConnections?: number;
  branchingFactor?: number;
  directionalBias?: number;
}): {
  rooms: RoomNode[];
  links: RoomLink[];
  complete: boolean; // Add flag to indicate if generation completed fully
} {
  const {
    numRooms,
    dungeonWidth,
    dungeonHeight,
    minConnections = Math.min(2, Math.max(1, Math.floor(numRooms * 0.2))),
    maxConnections = Math.min(4, Math.floor(numRooms * 0.5)),
    branchingFactor = 0.5,
    directionalBias = 0.7,
  } = config;

  // Adjust branchingFactor to ensure reasonable main path length
  const adjustedBranchingFactor = Math.min(0.67, branchingFactor);

  // Set a start time to enforce timeout
  const startTime = Date.now();
  const TIMEOUT_MS = 2000; // 2 second timeout

  try {
    const { rooms, links } = generateRooms({
      numRooms,
      dungeonWidth,
      dungeonHeight,
      branchingFactor: adjustedBranchingFactor,
      directionalBias,
    });

    // Add validation before logging
    const validateRoomConnections = (
      rooms: RoomNode[],
      links: RoomLink[]
    ): void => {
      // Verify each link connects to valid rooms
      links.forEach((link, index) => {
        const sourceExists = rooms.some((r) => r.id === link.source.id);
        const targetExists = rooms.some((r) => r.id === link.target.id);

        if (!sourceExists || !targetExists) {
          console.error(`Invalid link ${index}:`, {
            source: link.source.id,
            target: link.target.id,
            sourceExists,
            targetExists,
          });
        }
      });

      // Verify room positions are unique
      const positions = new Map<string, string>();
      rooms.forEach((room) => {
        const pos = `${room.x},${room.y}`;
        if (positions.has(pos)) {
          console.error(`Duplicate room position at ${pos}:`, {
            room1: positions.get(pos),
            room2: room.id,
          });
        }
        positions.set(pos, room.id);
      });
    };

    // Add validation before logging
    validateRoomConnections(rooms, links);

    // Log room and link counts
    console.log(`Generated ${rooms.length} rooms and ${links.length} links`);

    // Log the graph structure
    const getNodeConnections = (roomId: string): any => {
      const visited = new Set<string>();

      const traverse = (currentId: string): any => {
        if (visited.has(currentId)) return null;
        visited.add(currentId);

        const room = rooms.find((r) => r.id === currentId)!;
        const connections = links
          .filter(
            (link) =>
              link.source.id === currentId || link.target.id === currentId
          )
          .map((link) => {
            const connectedId =
              link.source.id === currentId ? link.target.id : link.source.id;
            if (visited.has(connectedId)) return null;

            return {
              roomId: connectedId,
              type: link.type,
              connections: traverse(connectedId),
            };
          })
          .filter((conn): conn is NonNullable<typeof conn> => conn !== null);

        return {
          id: room.id,
          name: room.name,
          position: `(${room.x}, ${room.y})`,
          connections,
        };
      };

      return traverse(roomId);
    };

    const graphStructure = getNodeConnections(rooms[0].id);
    console.log('Dungeon Graph Structure:', graphStructure, null, 2);

    // Check if we got enough rooms
    if (rooms.length < Math.ceil(numRooms * 0.5)) {
      console.warn(
        `Generated too few rooms (${rooms.length}/${numRooms}). Returning partial dungeon.`
      );
      return { rooms, links, complete: false };
    }

    // Check timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn('Dungeon generation timed out. Returning partial dungeon.');
      return { rooms, links, complete: false };
    }

    return { rooms, links, complete: rooms.length === numRooms };
  } catch (error) {
    console.error('Error during dungeon generation:', error);
    // Return at least something valid if we have a center room
    const centerRoom: RoomNode = {
      id: 'room-0',
      name: 'Room 0',
      x: Math.floor(dungeonWidth / 2),
      y: Math.floor(dungeonHeight / 2),
    };
    return {
      rooms: [centerRoom],
      links: [],
      complete: false,
    };
  }
}
