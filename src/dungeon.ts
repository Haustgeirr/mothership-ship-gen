import * as d3 from 'd3';
import { PRNG } from './prng';

export interface RoomNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface RoomLink {
  source: RoomNode;
  target: RoomNode;
  type: 'door' | 'secondary';
}

export interface DungeonGraph {
  rooms: RoomNode[];
  links: RoomLink[];
}

export class DungeonGenerator {
  graph: DungeonGraph;
  cellSize: number;
  private random: PRNG;

  constructor(cellSize: number = 40, random?: PRNG) {
    this.graph = { rooms: [], links: [] };
    this.cellSize = cellSize;
    this.random = random || new PRNG();
  }

  private isPositionOccupied(x: number, y: number): boolean {
    return this.graph.rooms.some(
      (room) =>
        Math.abs(room.x - x * this.cellSize) < 0.1 &&
        Math.abs(room.y - y * this.cellSize) < 0.1
    );
  }

  private isValidBranchPosition(
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
    return !this.graph.rooms.some((room) => {
      if (room.id === sourceRoom.id) return false;
      const roomGridX = room.x / this.cellSize;
      const roomGridY = room.y / this.cellSize;
      return (
        (Math.abs(x - roomGridX) === 1 && y === roomGridY) ||
        (Math.abs(y - roomGridY) === 1 && x === roomGridX)
      );
    });
  }

  addRoom(
    name: string,
    x: number,
    y: number,
    isBranch: boolean = false,
    sourceRoomId?: string
  ): { room: RoomNode; id: string } | null {
    if (this.isPositionOccupied(x, y)) {
      console.warn(`Position (${x}, ${y}) is already occupied`);
      return null;
    }

    if (isBranch && sourceRoomId) {
      const sourceRoom = this.graph.rooms.find(
        (room) => room.id === sourceRoomId
      );
      if (!sourceRoom || !this.isValidBranchPosition(x, y, sourceRoom)) {
        console.warn(`Invalid branch room position at (${x}, ${y})`);
        return null;
      }
    }

    const id = `room-${this.graph.rooms.length}`;
    const room: RoomNode = {
      id,
      name: name || `Room ${this.graph.rooms.length}`,
      x: x * this.cellSize,
      y: y * this.cellSize,
    };

    this.graph.rooms.push(room);

    if (isBranch && sourceRoomId) {
      this.addLink(sourceRoomId, id, 'branch');
    }

    return { room, id };
  }

  addLink(source: string, target: string, type: string): RoomLink | null {
    const sourceNode = this.graph.rooms.find(
      (room) => room.id === source || room.id === `room-${source}`
    );
    const targetNode = this.graph.rooms.find(
      (room) => room.id === target || room.id === `room-${target}`
    );

    if (!sourceNode || !targetNode) {
      console.warn(`Invalid link: ${source} -> ${target}`);
      return null;
    }

    // Check for existing link
    const existingLink = this.graph.links.find(
      (link) =>
        (link.source === sourceNode && link.target === targetNode) ||
        (link.source === targetNode && link.target === sourceNode)
    );

    if (existingLink) {
      return null;
    }

    const link: RoomLink = {
      source: sourceNode,
      target: targetNode,
      type: type === 'secondary' ? 'secondary' : 'door',
    };
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
    const maxAttempts = 1000;

    while (roomsCreated < numRooms && attempts < maxAttempts) {
      const x = Math.floor(this.random.next() * (dungeonWidth / this.cellSize));
      const y = Math.floor(
        this.random.next() * (dungeonHeight / this.cellSize)
      );

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
    // Create primary connections between adjacent rooms
    for (const room of this.graph.rooms) {
      const roomGridX = room.x / this.cellSize;
      const roomGridY = room.y / this.cellSize;

      this.graph.rooms.forEach((otherRoom) => {
        if (room.id === otherRoom.id) return;

        const otherGridX = otherRoom.x / this.cellSize;
        const otherGridY = otherRoom.y / this.cellSize;

        const isAdjacent =
          (Math.abs(roomGridX - otherGridX) === 1 &&
            roomGridY === otherGridY) ||
          (Math.abs(roomGridY - otherGridY) === 1 && roomGridX === otherGridX);

        if (isAdjacent) {
          this.addLink(room.id, otherRoom.id, 'primary');
        } else if (this.random.next() > primaryProbability) {
          this.addLink(room.id, otherRoom.id, 'secondary');
        }
      });
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
      .attr('stroke-dasharray', (d) =>
        d.type === 'secondary' ? '4,4' : 'none'
      )
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
      .attr('r', 6)
      .attr('fill', 'black')
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY);

    // Add room IDs as labels for debugging
    // svg
    //   .append('g')
    //   .selectAll('text')
    //   .data(this.graph.rooms)
    //   .enter()
    //   .append('text')
    //   .attr('x', (d) => d.x + offsetX)
    //   .attr('y', (d) => d.y + offsetY - 15)
    //   .attr('text-anchor', 'middle')
    //   .attr('font-size', '10px')
    //   .text((d) => d.id);

    // Add tooltips
    nodes.append('title').text((d: RoomNode) => `${d.name} (${d.id})`);
  }
}
