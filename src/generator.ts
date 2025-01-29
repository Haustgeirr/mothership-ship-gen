// TODO: add room names, purpose and descriptions

import type { RoomNode, RoomLink } from './dungeon';
import { prng as defaultPrng } from './dice';

interface DungeonGenerationConfig {
  numRooms: number;
  dungeonWidth: number;
  dungeonHeight: number;
  branchingFactor?: number;
  directionalBias?: number;
  minSecondaryLinks?: number;
  maxSecondaryLinks?: number;
  prng?: () => number;
}

interface RoomGenerationConfig {
  numRooms: number; // Number of rooms to generate
  dungeonWidth: number; // Width of the dungeon canvas
  dungeonHeight: number; // Height of the dungeon canvas
  branchingFactor: number; // Now controls what % of rooms will be part of branches
  directionalBias?: number; // 0-1: How likely to continue in the same direction
  prng: () => number;
}

interface Position {
  x: number;
  y: number;
}

// Helper functions at the top level
function createRoom(id: number, x: number, y: number): RoomNode {
  return {
    id: `room-${id}`,
    name: `Room ${id}`,
    x,
    y,
  };
}

function createLink(source: RoomNode, target: RoomNode): RoomLink {
  return {
    source,
    target,
    type: 'door',
  };
}

function getPositionKey(x: number, y: number): string {
  return `${x},${y}`;
}

// Main generation function refactored
export function generateRooms(config: RoomGenerationConfig): {
  rooms: RoomNode[];
  links: RoomLink[];
} {
  const {
    numRooms,
    dungeonWidth,
    dungeonHeight,
    branchingFactor = 50,
    directionalBias = 70,
    prng,
  } = config;

  const rooms: RoomNode[] = [];
  const links: RoomLink[] = [];
  const occupiedPositions = new Map<string, RoomNode>();

  // Helper to check if a position is occupied
  const isPositionOccupied = (x: number, y: number): boolean =>
    occupiedPositions.has(getPositionKey(x, y));

  // Helper to add a room and track its position
  const addRoom = (x: number, y: number): RoomNode => {
    const room = createRoom(rooms.length, x, y);
    rooms.push(room);
    occupiedPositions.set(getPositionKey(x, y), room);
    return room;
  };

  // Helper to get valid adjacent positions
  const getValidAdjacentPositions = (
    pos: Position,
    lastDirection?: Position,
    isMainPath: boolean = false
  ): Position[] => {
    const directions: Position[] = [
      { x: 0, y: -1 }, // North (prioritized)
      { x: 0, y: 1 }, // South (prioritized)
      { x: 1, y: 0 }, // East
      { x: -1, y: 0 }, // West
    ];

    return directions
      .map((dir) => ({ x: pos.x + dir.x, y: pos.y + dir.y }))
      .filter((newPos) => {
        // Check bounds and occupation
        if (
          newPos.x < 0 ||
          newPos.x >= dungeonWidth ||
          newPos.y < 0 ||
          newPos.y >= dungeonHeight ||
          isPositionOccupied(newPos.x, newPos.y)
        ) {
          return false;
        }

        // For main path, apply directional bias
        if (isMainPath && lastDirection && prng() < directionalBias) {
          return (
            newPos.x - pos.x === lastDirection.x &&
            newPos.y - pos.y === lastDirection.y
          );
        }

        // Check for valid connections
        const adjacentCount = Array.from(occupiedPositions.values()).filter(
          (room) =>
            (Math.abs(room.x - newPos.x) === 1 && room.y === newPos.y) ||
            (Math.abs(room.y - newPos.y) === 1 && room.x === newPos.x)
        ).length;

        return isMainPath ? adjacentCount <= 1 : adjacentCount === 1;
      });
  };

  // Generate main path
  const mainPathRooms = Math.max(
    2,
    Math.floor(numRooms * (1 - branchingFactor))
  );
  let currentRoom = addRoom(
    Math.floor(dungeonWidth / 2),
    Math.floor(dungeonHeight * 0.25) // Start in the upper quarter of the dungeon
  );
  let lastDirection: Position | undefined;

  for (let i = 1; i < mainPathRooms; i++) {
    const validPositions = getValidAdjacentPositions(
      currentRoom,
      lastDirection,
      true
    );

    if (validPositions.length === 0) break;

    const newPos = validPositions[0];
    const newRoom = addRoom(newPos.x, newPos.y);
    links.push(createLink(currentRoom, newRoom));

    lastDirection = {
      x: newRoom.x - currentRoom.x,
      y: newRoom.y - currentRoom.y,
    };
    currentRoom = newRoom;
  }

  // Generate branch rooms
  while (rooms.length < numRooms) {
    const sourceRoom = rooms[Math.floor(prng() * rooms.length)];
    const validPositions = getValidAdjacentPositions(
      sourceRoom,
      undefined,
      false
    );

    if (validPositions.length === 0) continue;

    const newPos = validPositions[0];
    const newRoom = addRoom(newPos.x, newPos.y);
    links.push(createLink(sourceRoom, newRoom));
  }

  return { rooms, links };
}

// Full dungeon generation
export function generateDungeon(config: DungeonGenerationConfig): {
  rooms: RoomNode[];
  links: RoomLink[];
  complete: boolean;
} {
  const {
    numRooms,
    dungeonWidth,
    dungeonHeight,
    branchingFactor = 50,
    directionalBias = 70,
    minSecondaryLinks = 1,
    maxSecondaryLinks = Math.ceil(numRooms * 0.3),
    prng,
  } = config;

  // Convert d100 values to 0-1 range
  const normalizedBranchingFactor = Math.min(0.67, branchingFactor / 100);
  const normalizedDirectionalBias = directionalBias / 100;

  // Set a start time to enforce timeout
  const startTime = Date.now();
  const TIMEOUT_MS = 2000;

  try {
    const { rooms, links } = generateRooms({
      numRooms,
      dungeonWidth,
      dungeonHeight,
      branchingFactor: normalizedBranchingFactor,
      directionalBias: normalizedDirectionalBias,
      prng: ,
    });

    // Add secondary links
    const addSecondaryLinks = (
      rooms: RoomNode[],
      primaryLinks: RoomLink[]
    ): RoomLink[] => {
      const allLinks = [...primaryLinks];
      const numSecondaryLinks = Math.floor(
        minSecondaryLinks + prng() * (maxSecondaryLinks - minSecondaryLinks + 1)
      );

      // Helper to check if a link already exists between two rooms
      const hasLink = (room1: RoomNode, room2: RoomNode): boolean => {
        return allLinks.some(
          (link) =>
            (link.source.id === room1.id && link.target.id === room2.id) ||
            (link.source.id === room2.id && link.target.id === room1.id)
        );
      };

      // Helper to calculate Manhattan distance between rooms
      const getManhattanDistance = (
        room1: RoomNode,
        room2: RoomNode
      ): number => {
        return Math.abs(room1.x - room2.x) + Math.abs(room1.y - room2.y);
      };

      for (let i = 0; i < numSecondaryLinks; i++) {
        const room1 = rooms[Math.floor(prng() * rooms.length)];
        let attempts = 20; // Limit attempts to find a valid connection

        while (attempts > 0) {
          const room2 = rooms[Math.floor(prng() * rooms.length)];
          const distance = getManhattanDistance(room1, room2);

          // Check if this would be a valid secondary link
          if (
            room1.id !== room2.id && // Not the same room
            !hasLink(room1, room2) && // No existing link
            distance <= 3 // Rooms are relatively close
          ) {
            allLinks.push({
              source: room1,
              target: room2,
              type: 'secondary', // Mark as secondary link
            });
            break;
          }
          attempts--;
        }
      }

      return allLinks;
    };

    // Add secondary links to the dungeon
    const finalLinks = addSecondaryLinks(rooms, links);

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
    validateRoomConnections(rooms, finalLinks);

    // Log room and link counts
    console.log(
      `Generated ${rooms.length} rooms and ${finalLinks.length} links`
    );

    // Log the graph structure
    const getNodeConnections = (roomId: string): any => {
      const visited = new Set<string>();

      const traverse = (currentId: string): any => {
        if (visited.has(currentId)) return null;
        visited.add(currentId);

        const room = rooms.find((r) => r.id === currentId)!;
        const connections = finalLinks
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
      return { rooms, links: finalLinks, complete: false };
    }

    // Check timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn('Dungeon generation timed out. Returning partial dungeon.');
      return { rooms, links: finalLinks, complete: false };
    }

    return { rooms, links: finalLinks, complete: rooms.length === numRooms };
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
