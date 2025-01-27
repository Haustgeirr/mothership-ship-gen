import type { RoomNode, RoomLink } from './dungeon';

interface DungeonGenerationConfig {
  numRooms: number; // Number of rooms to generate
  dungeonWidth: number; // Width of the dungeon canvas
  dungeonHeight: number; // Height of the dungeon canvas
  branchingFactor: number; // Now controls what % of rooms will be part of branches
  directionalBias?: number; // 0-1: How likely to continue in the same direction
}

// Generate random rooms with integer coordinates and no overlap
export function generateRooms(config: DungeonGenerationConfig): RoomNode[] {
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
  const occupiedPositions = new Set<string>();
  const roomDirections = new Map<string, [number, number]>();

  // Start with a room in the center
  const centerX = Math.floor(dungeonWidth / 2);
  const centerY = Math.floor(dungeonHeight / 2);

  const firstRoom: RoomNode = {
    id: `room-0`,
    name: `Room 0`,
    x: centerX,
    y: centerY,
  };
  rooms.push(firstRoom);
  occupiedPositions.add(`${centerX},${centerY}`);

  // Helper to get valid adjacent positions with directional bias
  const getValidAdjacentPositions = (
    x: number,
    y: number,
    lastDirection?: [number, number],
    isMainPath: boolean = false
  ): [number, number][] => {
    let adjacent: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    // For main path, try to maintain direction but be less strict
    if (isMainPath && lastDirection) {
      const [dx, dy] = lastDirection;
      if (Math.random() < directionalBias) {
        // Prioritize but don't limit to these directions
        adjacent.sort((a, b) => {
          const aIsPreferred =
            (a[0] === x + dx && a[1] === y + dy) ||
            (a[0] === x + dy && a[1] === y + dx) ||
            (a[0] === x - dy && a[1] === y - dx);
          const bIsPreferred =
            (b[0] === x + dx && b[1] === y + dy) ||
            (b[0] === x + dy && b[1] === y + dx) ||
            (b[0] === x - dy && b[1] === y - dx);
          return bIsPreferred ? 1 : aIsPreferred ? -1 : 0;
        });
      }
      console.log(
        `Main path directions from (${x}, ${y}):`,
        adjacent.map(([nx, ny]) => `(${nx}, ${ny})`)
      );
    }

    const validPositions = adjacent.filter(([newX, newY]) => {
      if (!isValidPosition(newX, newY)) return false;

      const neighborCount = countNeighbors(newX, newY);
      if (isMainPath) {
        // Allow up to one neighbor for main path
        return neighborCount <= 1;
      } else {
        // For branches, allow up to two neighbors if at least one is a branch
        const neighbors = getNeighborRooms(newX, newY);
        const branchNeighbors = neighbors.filter((n) =>
          n.id.startsWith('branch-')
        );
        return (
          neighborCount <= 2 &&
          (branchNeighbors.length > 0 || neighborCount === 1)
        );
      }
    });

    console.log(
      `Found ${validPositions.length} valid positions from (${x}, ${y})`,
      isMainPath ? '(main path)' : '(branch)'
    );

    return validPositions;
  };

  // Helper to check if a position is valid
  const isValidPosition = (x: number, y: number): boolean => {
    return (
      x >= 0 &&
      x < dungeonWidth &&
      y >= 0 &&
      y < dungeonHeight &&
      !occupiedPositions.has(`${x},${y}`)
    );
  };

  // Helper to count existing neighbors
  const countNeighbors = (x: number, y: number): number => {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ].filter(([nx, ny]) => occupiedPositions.has(`${nx},${ny}`)).length;
  };

  // Add helper to get neighbor rooms
  const getNeighborRooms = (x: number, y: number): RoomNode[] => {
    return rooms.filter(
      (room) =>
        (Math.abs(room.x - x) === 1 && room.y === y) ||
        (Math.abs(room.y - y) === 1 && room.x === x)
    );
  };

  // Move isTimedOut inside the function scope
  const isTimedOut = () => Date.now() - startTime > TIMEOUT_MS;

  // Phase 1: Generate main path
  console.log('Phase 1: Generating main path...');
  let mainPathRetries = 0;
  const MAX_MAIN_PATH_RETRIES = 50;
  let lastMainPathDirection: [number, number] | undefined;

  for (
    let i = 1;
    i < mainPathRooms && mainPathRetries < MAX_MAIN_PATH_RETRIES;
    i++
  ) {
    if (isTimedOut()) {
      console.warn('Room generation timed out during main path');
      return rooms;
    }
    const sourceRoom = rooms[rooms.length - 1];

    const validPositions = getValidAdjacentPositions(
      sourceRoom.x,
      sourceRoom.y,
      lastMainPathDirection,
      true
    );

    if (validPositions.length === 0) {
      mainPathRetries++;
      console.log(
        `Main path retry ${mainPathRetries}/${MAX_MAIN_PATH_RETRIES} - No valid positions from room ${sourceRoom.id}`
      );
      if (mainPathRetries >= MAX_MAIN_PATH_RETRIES) {
        console.log('Main path generation failed - too many retries');
        break;
      }
      continue;
    }

    mainPathRetries = 0;
    const [x, y] = validPositions[0];
    lastMainPathDirection = [x - sourceRoom.x, y - sourceRoom.y];

    console.log(
      `Added main path room ${i} at (${x}, ${y}), direction: (${lastMainPathDirection[0]}, ${lastMainPathDirection[1]})`
    );

    occupiedPositions.add(`${x},${y}`);
    const room: RoomNode = {
      id: `room-${i}`,
      name: `Room ${i}`,
      x,
      y,
    };
    rooms.push(room);
  }

  console.log(`Main path complete with ${rooms.length} rooms`);

  // Phase 2: Add branches
  console.log('Phase 2: Adding branches...');
  let branchRetries = 0;
  const MAX_BRANCH_RETRIES = 50;
  const targetRooms = numRooms;
  let branchCount = 0;

  while (rooms.length < targetRooms && branchRetries < MAX_BRANCH_RETRIES) {
    if (isTimedOut()) {
      console.warn('Room generation timed out during branching');
      return rooms;
    }
    // Prioritize rooms with fewer neighbors for branching
    const candidates = rooms
      .slice(0, Math.floor(rooms.length * 0.75))
      .map((room) => ({
        room,
        neighbors: countNeighbors(room.x, room.y),
      }))
      .filter(({ neighbors }) => neighbors < 4) // Only consider rooms with space to branch
      .sort((a, b) => a.neighbors - b.neighbors);

    if (candidates.length === 0) {
      branchRetries++;
      console.log(
        `Branch retry ${branchRetries}/${MAX_BRANCH_RETRIES} - No valid branch points found`
      );
      if (branchRetries >= MAX_BRANCH_RETRIES) {
        console.log('Branch generation failed - dungeon may be too dense');
        break;
      }
      continue;
    }

    // Pick from the best candidates (rooms with fewest neighbors)
    const bestCandidates = candidates.filter(
      (c) => c.neighbors === candidates[0].neighbors
    );
    const sourceRoom =
      bestCandidates[Math.floor(Math.random() * bestCandidates.length)].room;

    const validPositions = getValidAdjacentPositions(
      sourceRoom.x,
      sourceRoom.y,
      undefined,
      false
    );

    if (validPositions.length === 0) {
      branchRetries++;
      continue;
    }

    const [x, y] =
      validPositions[Math.floor(Math.random() * validPositions.length)];
    branchCount++;

    console.log(
      `Added branch room ${branchCount} at (${x}, ${y}) from room ${sourceRoom.id}`
    );

    occupiedPositions.add(`${x},${y}`);
    const room: RoomNode = {
      id: `branch-${branchCount}`, // Mark as branch room
      name: `Branch ${branchCount}`,
      x,
      y,
    };
    rooms.push(room);
    branchRetries = 0;
  }

  console.log(`Generation complete with ${rooms.length}/${numRooms} rooms`);

  if (rooms.length < numRooms) {
    console.warn(
      `Could not generate all requested rooms. Generated ${rooms.length}/${numRooms}`
    );
  }

  return rooms;
}

// Generate links between rooms
export function generateLinks(
  rooms: RoomNode[],
  config: {
    minConnections: number;
    maxConnections: number;
  }
): RoomLink[] {
  const { minConnections, maxConnections } = config;
  console.log('Generating links with config:', {
    minConnections,
    maxConnections,
  });

  const links: RoomLink[] = [];
  const connectedPairs = new Set<string>();

  const pairKey = (source: string, target: string) =>
    source < target ? `${source}-${target}` : `${target}-${source}`;

  // First, connect adjacent rooms to ensure basic connectivity
  console.log('Connecting adjacent rooms...');
  rooms.forEach((room) => {
    const neighbors = rooms.filter(
      (other) =>
        other.id !== room.id &&
        Math.abs(other.x - room.x) + Math.abs(other.y - room.y) === 1
    );

    neighbors.forEach((neighbor) => {
      const key = pairKey(room.id, neighbor.id);
      if (!connectedPairs.has(key)) {
        links.push({
          source: room.id,
          target: neighbor.id,
          type: 'door',
        });
        connectedPairs.add(key);
      }
    });
  });

  console.log(`Created ${links.length} adjacent room connections`);

  // Then add additional connections if needed
  rooms.forEach((room) => {
    const currentConnections = links.filter(
      (link) => link.source === room.id || link.target === room.id
    ).length;

    // Only add connections if we're below minimum
    if (currentConnections < minConnections) {
      const connectionsNeeded = minConnections - currentConnections;
      console.log(
        `Room ${room.id} needs ${connectionsNeeded} more connections to meet minimum`
      );

      // Find nearby unconnected rooms
      const potentialTargets = rooms
        .filter((other) => {
          if (other.id === room.id) return false;
          const distance =
            Math.abs(other.x - room.x) + Math.abs(other.y - room.y);
          return (
            distance <= 2 && !connectedPairs.has(pairKey(room.id, other.id))
          );
        })
        .sort((a, b) => {
          const distA = Math.abs(a.x - room.x) + Math.abs(a.y - room.y);
          const distB = Math.abs(b.x - room.x) + Math.abs(b.y - room.y);
          return distA - distB;
        });

      for (
        let i = 0;
        i < connectionsNeeded && i < potentialTargets.length;
        i++
      ) {
        const target = potentialTargets[i];
        const key = pairKey(room.id, target.id);
        if (!connectedPairs.has(key)) {
          links.push({
            source: room.id,
            target: target.id,
            type: Math.random() < 0.7 ? 'door' : 'secret tunnel',
          });
          connectedPairs.add(key);
        }
      }
    }
  });

  console.log(`Final link count: ${links.length}`);
  return links;
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
    const rooms = generateRooms({
      numRooms,
      dungeonWidth,
      dungeonHeight,
      branchingFactor: adjustedBranchingFactor,
      directionalBias,
    });

    // Check if we got enough rooms
    if (rooms.length < Math.ceil(numRooms * 0.5)) {
      console.warn(
        `Generated too few rooms (${rooms.length}/${numRooms}). Returning partial dungeon.`
      );
      const links = generateLinks(rooms, {
        minConnections: 1,
        maxConnections: 2,
      });
      return { rooms, links, complete: false };
    }

    // Check timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn('Dungeon generation timed out. Returning partial dungeon.');
      const links = generateLinks(rooms, {
        minConnections: 1,
        maxConnections: 2,
      });
      return { rooms, links, complete: false };
    }

    const links = generateLinks(rooms, { minConnections, maxConnections });
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
