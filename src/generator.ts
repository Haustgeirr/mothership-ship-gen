// TODO: add room names, purpose and descriptions

import type {
  DungeonGraph,
  RoomNode,
  RoomLink,
  GenerationConfig,
} from './types';
import { Dice } from './dice';
import type { GridCell } from './AStarGrid';
import { DUNGEON_CONSTANTS } from './constants';

export class DungeonGenerator {
  private cellSize: number;
  private dungeonWidth: number = 0;
  private dungeonHeight: number = 0;
  private graph: DungeonGraph = { rooms: [], links: [] };
  private readonly directions = [
    { x: 0, y: -1 }, // North
    { x: 0, y: 1 }, // South
    { x: 1, y: 0 }, // East
    { x: -1, y: 0 }, // West
  ] as const;

  constructor() {
    this.cellSize = DUNGEON_CONSTANTS.CELL_SIZE;
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
      id: id,
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

    // Store dungeon dimensions
    this.dungeonWidth = dungeonWidth;
    this.dungeonHeight = dungeonHeight;

    this.graph = {
      rooms: [],
      links: [],
    };

    // Start with center room
    const centerX = Math.floor(dungeonWidth / (2 * this.cellSize));
    const centerY = Math.floor(dungeonHeight / (2 * this.cellSize));
    this.graph.rooms.push(this.createRoom(0, centerX, centerY));

    // Generate main path first
    const mainPathRooms = Math.max(
      2,
      Math.floor(numRooms * (1 - branchingFactor / 100))
    );
    let currentRoom = this.graph.rooms[0];
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
            !this.isPositionOccupied(this.graph, pos.x, pos.y)
        );

      if (validPositions.length === 0) break;

      // Prefer continuing in the same direction if possible
      let nextPos = validPositions[0];
      if (lastDirection && Dice.d(100) <= directionalBias) {
        const sameDirection = validPositions.find(
          (pos) =>
            pos.dir.x === lastDirection!.x && pos.dir.y === lastDirection!.y
        );
        if (sameDirection) {
          nextPos = sameDirection;
        }
      }

      const newRoom = this.createRoom(i, nextPos.x, nextPos.y);
      this.graph.rooms.push(newRoom);
      this.graph.links.push(this.createLink(currentRoom, newRoom, 'door'));

      lastDirection = nextPos.dir;
      currentRoom = newRoom;
    }

    // Add branch rooms
    while (this.graph.rooms.length < numRooms) {
      const sourceRoom = this.graph.rooms[Dice.d(this.graph.rooms.length) - 1];
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
            !this.isPositionOccupied(this.graph, pos.x, pos.y) &&
            this.isValidBranchPosition(this.graph, pos.x, pos.y, sourceRoom)
        );

      if (validPositions.length === 0) continue;

      const pos = validPositions[Dice.d(validPositions.length) - 1];
      const newRoom = this.createRoom(this.graph.rooms.length, pos.x, pos.y);
      this.graph.rooms.push(newRoom);
      this.graph.links.push(this.createLink(sourceRoom, newRoom, 'door'));
    }

    // Add secondary links
    const numSecondaryLinks =
      minSecondaryLinks + Dice.d(maxSecondaryLinks - minSecondaryLinks + 1) - 1;

    for (let i = 0; i < numSecondaryLinks; i++) {
      const room1 = this.graph.rooms[Dice.d(this.graph.rooms.length) - 1];
      const room2 = this.graph.rooms[Dice.d(this.graph.rooms.length) - 1];

      if (
        room1.id !== room2.id &&
        !this.graph.links.some(
          (link) =>
            (link.source.id === room1.id && link.target.id === room2.id) ||
            (link.source.id === room2.id && link.target.id === room1.id)
        )
      ) {
        this.graph.links.push(this.createLink(room1, room2, 'secondary'));
      }
    }

    return this.graph;
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

  /**
   * Converts the dungeon graph into a grid format suitable for pathfinding
   * @returns A 2D array of GridCell objects
   */
  public createNavigationGrid(): { grid: GridCell[][]; cellSize: number } {
    const width = Math.ceil(this.dungeonWidth / this.cellSize);
    const height = Math.ceil(this.dungeonHeight / this.cellSize);

    // Initialize grid with all cells walkable (empty space is walkable)
    const grid: GridCell[][] = Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({ walkable: true }))
      );

    // Debug: Count walkable cells before setting
    let walkableCount = 0;
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.walkable) walkableCount++;
      })
    );
    console.log('Initial walkable cells:', walkableCount);

    // Mark room cells as non-walkable (rooms block movement)
    for (const room of this.graph.rooms) {
      const gridX = Math.floor(room.x / this.cellSize);
      const gridY = Math.floor(room.y / this.cellSize);
      grid[gridY][gridX].walkable = false;
    }

    // Mark corridors as non-walkable (corridors block movement)
    for (const link of this.graph.links) {
      const startX = Math.floor(link.source.x / this.cellSize);
      const startY = Math.floor(link.source.y / this.cellSize);
      const endX = Math.floor(link.target.x / this.cellSize);
      const endY = Math.floor(link.target.y / this.cellSize);

      // Mark cells between rooms as non-walkable
      if (startX === endX) {
        // Vertical corridor
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        for (let y = minY; y <= maxY; y++) {
          grid[y][startX].walkable = false;
        }
      } else if (startY === endY) {
        // Horizontal corridor
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        for (let x = minX; x <= maxX; x++) {
          grid[startY][x].walkable = false;
        }
      }
    }

    // Debug: Final count of walkable cells
    walkableCount = 0;
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.walkable) walkableCount++;
      })
    );
    console.log('Final walkable cells:', walkableCount);

    return { grid, cellSize: this.cellSize };
  }
}
