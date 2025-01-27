import * as d3 from 'd3';

export interface RoomNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface RoomLink extends d3.SimulationLinkDatum<RoomNode> {
  source: RoomNode;
  target: RoomNode;
  type: string;
}

export interface DungeonGraph {
  rooms: RoomNode[];
  links: RoomLink[];
}

export class DungeonGenerator {
  graph: DungeonGraph;
  cellSize: number;

  constructor(cellSize: number = 40) {
    this.graph = { rooms: [], links: [] };
    this.cellSize = cellSize; // Size of each grid cell
  }

  addRoom(
    name: string,
    x: number,
    y: number,
    isBranch: boolean = false,
    sourceRoomId?: string
  ): { room: RoomNode; id: string } | null {
    // Check if position is already occupied
    const isOccupied = this.graph.rooms.some(
      (room) =>
        Math.abs(room.x - x * this.cellSize) < 0.1 &&
        Math.abs(room.y - y * this.cellSize) < 0.1
    );

    if (isOccupied) {
      console.warn(`Position (${x}, ${y}) is already occupied`);
      return null;
    }

    // If this is a branch room, validate adjacency with source room
    if (isBranch && sourceRoomId) {
      const sourceRoom = this.graph.rooms.find(
        (room) => room.id === sourceRoomId
      );
      if (sourceRoom) {
        const sourceGridX = sourceRoom.x / this.cellSize;
        const sourceGridY = sourceRoom.y / this.cellSize;

        // Check if the new room is exactly one cell away in a cardinal direction
        const isCardinalAdjacent =
          // North
          (x === sourceGridX && y === sourceGridY - 1) ||
          // South
          (x === sourceGridX && y === sourceGridY + 1) ||
          // East
          (x === sourceGridX + 1 && y === sourceGridY) ||
          // West
          (x === sourceGridX - 1 && y === sourceGridY);

        if (!isCardinalAdjacent) {
          console.warn(
            `Branch room at (${x}, ${y}) must be directly adjacent (N,S,E,W) to source room at (${sourceGridX}, ${sourceGridY})`
          );
          return null;
        }

        // Check if this position would create an invalid connection with any other room
        const wouldCreateInvalidConnection = this.graph.rooms.some((room) => {
          if (room.id === sourceRoomId) return false;
          const roomGridX = room.x / this.cellSize;
          const roomGridY = room.y / this.cellSize;
          return (
            // Check if directly adjacent to any other room
            (Math.abs(x - roomGridX) === 1 && y === roomGridY) ||
            (Math.abs(y - roomGridY) === 1 && x === roomGridX)
          );
        });

        if (wouldCreateInvalidConnection) {
          console.warn(
            `Branch room at (${x}, ${y}) would create invalid connection with existing room`
          );
          return null;
        }
      }
    }

    const id = `room-${this.graph.rooms.length}`;
    const roomName = name || `Room ${this.graph.rooms.length}`;

    const room: RoomNode = {
      id,
      name: roomName,
      x: x * this.cellSize,
      y: y * this.cellSize,
    };
    this.graph.rooms.push(room);

    // If this is a branch room and we have a source room, create the link
    if (isBranch && sourceRoomId) {
      this.addLink(sourceRoomId, id, 'branch');
    }

    return { room, id };
  }

  addLink(source: string, target: string, type: string): RoomLink | null {
    // Clean up the room IDs by removing any 'branch-' or 'room-' prefixes
    const sourceId = source.replace(/^(branch|room)-/, '');
    const targetId = target.replace(/^(branch|room)-/, '');

    // Try to find rooms by both prefixed and unprefixed IDs
    const sourceNode = this.graph.rooms.find(
      (room) => room.id === source || room.id.endsWith(`-${sourceId}`)
    );
    const targetNode = this.graph.rooms.find(
      (room) => room.id === target || room.id.endsWith(`-${targetId}`)
    );

    if (!sourceNode || !targetNode) {
      console.warn(`Could not find rooms for link: ${source} -> ${target}`);
      return null;
    }

    const link: RoomLink = { source: sourceNode, target: targetNode, type };
    this.graph.links.push(link);
    return link;
  }

  generateRooms(
    numRooms: number,
    dungeonWidth: number,
    dungeonHeight: number
  ): void {
    let roomsCreated = 0;
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops

    while (roomsCreated < numRooms && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * (dungeonWidth / this.cellSize));
      const y = Math.floor(Math.random() * (dungeonHeight / this.cellSize));

      const result = this.addRoom(`Room ${roomsCreated}`, x, y, false);
      if (result) {
        roomsCreated++;
      }
      attempts++;
    }

    if (roomsCreated < numRooms) {
      console.warn(`Could only create ${roomsCreated} of ${numRooms} rooms`);
    }
  }

  generateLinks(primaryProbability: number = 0.8): void {
    const adjacencyMap = new Map<string, RoomNode[]>();

    // Build adjacency map for primary connections (adjacent main path nodes only)
    const mainPathRooms = this.graph.rooms.filter(
      (room) => !room.id.startsWith('branch-')
    );

    for (const room of mainPathRooms) {
      adjacencyMap.set(room.id, []);
      for (const otherRoom of mainPathRooms) {
        if (
          room.id !== otherRoom.id &&
          ((Math.abs(room.x - otherRoom.x) === this.cellSize &&
            room.y === otherRoom.y) ||
            (Math.abs(room.y - otherRoom.y) === this.cellSize &&
              room.x === otherRoom.x))
        ) {
          adjacencyMap.get(room.id)?.push(otherRoom);
        }
      }
    }

    // Create primary connections (adjacent main path nodes)
    for (const [roomId, neighbors] of adjacencyMap.entries()) {
      for (const neighbor of neighbors) {
        const existingLink = this.graph.links.find(
          (link) =>
            (link.source.id === roomId && link.target.id === neighbor.id) ||
            (link.source.id === neighbor.id && link.target.id === roomId)
        );
        if (!existingLink) {
          this.addLink(roomId, neighbor.id, 'primary');
        }
      }
    }

    // Create secondary connections (random, between any rooms)
    for (let i = 0; i < this.graph.rooms.length; i++) {
      for (let j = i + 1; j < this.graph.rooms.length; j++) {
        const roomA = this.graph.rooms[i];
        const roomB = this.graph.rooms[j];

        if (Math.random() > primaryProbability) {
          if (
            !this.graph.links.some(
              (link) =>
                (link.source.id === roomA.id && link.target.id === roomB.id) ||
                (link.source.id === roomB.id && link.target.id === roomA.id)
            )
          ) {
            this.addLink(roomA.id, roomB.id, 'secondary');
          }
        }
      }
    }
  }

  validateDungeon(): void {
    // Ensure all nodes are reachable
    const visited = new Set<string>();

    const dfs = (roomId: string): void => {
      if (visited.has(roomId)) return;
      visited.add(roomId);
      const neighbors = this.graph.links
        .filter(
          (link) => link.source.id === roomId || link.target.id === roomId
        )
        .map((link) =>
          link.source.id === roomId ? link.target.id : link.source.id
        );

      neighbors.forEach((neighbor) => dfs(neighbor));
    };

    dfs(this.graph.rooms[0]?.id || '');

    if (visited.size !== this.graph.rooms.length) {
      console.warn('Some rooms are unreachable');
    }
  }

  render(svgElement: SVGSVGElement): void {
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const svgWidth = +svg.attr('width');
    const svgHeight = +svg.attr('height');

    // Calculate dungeon bounding box
    const xExtent = d3.extent(this.graph.rooms, (d) => d.x) as [number, number];
    const yExtent = d3.extent(this.graph.rooms, (d) => d.y) as [number, number];

    const dungeonWidth = xExtent[1] - xExtent[0];
    const dungeonHeight = yExtent[1] - yExtent[0];

    const offsetX = (svgWidth - dungeonWidth) / 2 - xExtent[0];
    const offsetY = (svgHeight - dungeonHeight) / 2 - yExtent[0];

    // Draw links with debug info
    const links = svg
      .append('g')
      .selectAll<SVGLineElement, RoomLink>('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => (d.type === 'door' ? 'black' : 'red'))
      .attr('stroke-width', (d) => (d.type === 'door' ? 2 : 1))
      .attr('x1', (d) => d.source.x + offsetX)
      .attr('y1', (d) => d.source.y + offsetY)
      .attr('x2', (d) => d.target.x + offsetX)
      .attr('y2', (d) => d.target.y + offsetY);

    // Draw nodes with IDs for debugging
    const nodes = svg
      .append('g')
      .selectAll<SVGCircleElement, RoomNode>('circle')
      .data(this.graph.rooms)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'blue')
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY);

    // Add room IDs as labels for debugging
    svg
      .append('g')
      .selectAll('text')
      .data(this.graph.rooms)
      .enter()
      .append('text')
      .attr('x', (d) => d.x + offsetX)
      .attr('y', (d) => d.y + offsetY - 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text((d) => d.id);

    // Add tooltips
    nodes.append('title').text((d: RoomNode) => `${d.name} (${d.id})`);
  }
}
