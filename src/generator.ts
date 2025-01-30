// TODO: add room names, purpose and descriptions

import type {
  DungeonGraph,
  RoomNode,
  RoomLink,
  GenerationConfig,
} from './types';

export class DungeonGenerator {
  private cellSize: number;
  private readonly directions = [
    { x: 0, y: -1 }, // North
    { x: 0, y: 1 }, // South
    { x: 1, y: 0 }, // East
    { x: -1, y: 0 }, // West
  ] as const;

  constructor(cellSize: number = 40) {
    this.cellSize = cellSize;
  }

  private isPositionOccupied(
    graph: DungeonGraph,
    x: number,
    y: number
  ): boolean {
    return graph.rooms.some(
      (room) =>
        Math.abs(room.x - x * this.cellSize) < 0.1 &&
        Math.abs(room.y - y * this.cellSize) < 0.1
    );
  }

  private isValidBranchPosition(
    graph: DungeonGraph,
    x: number,
    y: number,
    sourceRoom: RoomNode
  ): boolean {
    const sourceGridX = sourceRoom.x / this.cellSize;
    const sourceGridY = sourceRoom.y / this.cellSize;

    // Check if directly adjacent in cardinal direction
    const isCardinalAdjacent =
      (x === sourceGridX && Math.abs(y - sourceGridY) === 1) ||
      (y === sourceGridY && Math.abs(x - sourceGridX) === 1);

    if (!isCardinalAdjacent) return false;

    // Check for invalid connections with other rooms
    return !graph.rooms.some((room) => {
      if (room.id === sourceRoom.id) return false;
      const roomGridX = room.x / this.cellSize;
      const roomGridY = room.y / this.cellSize;
      return (
        (Math.abs(x - roomGridX) === 1 && y === roomGridY) ||
        (Math.abs(y - roomGridY) === 1 && x === roomGridX)
      );
    });
  }

  private createRoom(id: number, x: number, y: number): RoomNode {
    return {
      id: `room-${id}`,
      name: `Room ${id}`,
      x: x * this.cellSize,
      y: y * this.cellSize,
    };
  }

  private createLink(
    source: RoomNode,
    target: RoomNode,
    type: 'door' | 'secondary'
  ): RoomLink {
    return { source, target, type };
  }

  generate(config: GenerationConfig): DungeonGraph {
    const {
      numRooms,
      dungeonWidth,
      dungeonHeight,
      branchingFactor = 50,
      directionalBias = 70,
      minSecondaryLinks = 1,
      maxSecondaryLinks = Math.ceil(numRooms * 0.3),
    } = config;

    const graph: DungeonGraph = {
      rooms: [],
      links: [],
    };

    // Start with center room
    const centerX = Math.floor(dungeonWidth / (2 * this.cellSize));
    const centerY = Math.floor(dungeonHeight / (2 * this.cellSize));
    graph.rooms.push(this.createRoom(0, centerX, centerY));

    // Generate main path first
    const mainPathRooms = Math.max(
      2,
      Math.floor(numRooms * (1 - branchingFactor / 100))
    );
    let currentRoom = graph.rooms[0];
    let lastDirection: { x: number; y: number } | undefined;

    for (let i = 1; i < mainPathRooms; i++) {
      // Filter valid positions
      const validPositions = this.directions
        .map((dir) => ({
          x: currentRoom.x / this.cellSize + dir.x,
          y: currentRoom.y / this.cellSize + dir.y,
          dir,
        }))
        .filter(
          (pos) =>
            pos.x >= 0 &&
            pos.x < dungeonWidth / this.cellSize &&
            pos.y >= 0 &&
            pos.y < dungeonHeight / this.cellSize &&
            !this.isPositionOccupied(graph, pos.x, pos.y)
        );

      if (validPositions.length === 0) break;

      // Prefer continuing in the same direction if possible
      let nextPos = validPositions[0];
      if (lastDirection && Math.random() < directionalBias / 100) {
        const sameDirection = validPositions.find(
          (pos) =>
            pos.dir.x === lastDirection!.x && pos.dir.y === lastDirection!.y
        );
        if (sameDirection) {
          nextPos = sameDirection;
        }
      }

      const newRoom = this.createRoom(i, nextPos.x, nextPos.y);
      graph.rooms.push(newRoom);
      graph.links.push(this.createLink(currentRoom, newRoom, 'door'));

      lastDirection = nextPos.dir;
      currentRoom = newRoom;
    }

    // Add branch rooms
    while (graph.rooms.length < numRooms) {
      const sourceRoom =
        graph.rooms[Math.floor(Math.random() * graph.rooms.length)];
      const validPositions = this.directions
        .map((dir) => ({
          x: sourceRoom.x / this.cellSize + dir.x,
          y: sourceRoom.y / this.cellSize + dir.y,
        }))
        .filter(
          (pos) =>
            pos.x >= 0 &&
            pos.x < dungeonWidth / this.cellSize &&
            pos.y >= 0 &&
            pos.y < dungeonHeight / this.cellSize &&
            !this.isPositionOccupied(graph, pos.x, pos.y) &&
            this.isValidBranchPosition(graph, pos.x, pos.y, sourceRoom)
        );

      if (validPositions.length === 0) continue;

      const pos =
        validPositions[Math.floor(Math.random() * validPositions.length)];
      const newRoom = this.createRoom(graph.rooms.length, pos.x, pos.y);
      graph.rooms.push(newRoom);
      graph.links.push(this.createLink(sourceRoom, newRoom, 'door'));
    }

    // Add secondary links
    const numSecondaryLinks = Math.floor(
      minSecondaryLinks +
        Math.random() * (maxSecondaryLinks - minSecondaryLinks + 1)
    );

    for (let i = 0; i < numSecondaryLinks; i++) {
      const room1 = graph.rooms[Math.floor(Math.random() * graph.rooms.length)];
      const room2 = graph.rooms[Math.floor(Math.random() * graph.rooms.length)];

      if (
        room1.id !== room2.id &&
        !graph.links.some(
          (link) =>
            (link.source.id === room1.id && link.target.id === room2.id) ||
            (link.source.id === room2.id && link.target.id === room1.id)
        )
      ) {
        graph.links.push(this.createLink(room1, room2, 'secondary'));
      }
    }

    return graph;
  }

  validateDungeon(graph: DungeonGraph): boolean {
    const visited = new Set<string>();

    const dfs = (roomId: string): void => {
      if (visited.has(roomId)) return;
      visited.add(roomId);

      const neighbors = graph.links
        .filter(
          (link) => link.source.id === roomId || link.target.id === roomId
        )
        .map((link) =>
          link.source.id === roomId ? link.target.id : link.source.id
        );

      neighbors.forEach((neighbor) => dfs(neighbor));
    };

    dfs(graph.rooms[0]?.id || '');

    return visited.size === graph.rooms.length;
  }
}
