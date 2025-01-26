import * as d3 from 'd3';

export interface RoomNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface RoomLink extends d3.SimulationLinkDatum<RoomNode> {
  source: string | RoomNode;
  target: string | RoomNode;
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

  addRoom(name: string, x: number, y: number): RoomNode {
    const room: RoomNode = {
      id: `room-${this.graph.rooms.length}`,
      name,
      x: x * this.cellSize,
      y: y * this.cellSize,
    };
    this.graph.rooms.push(room);
    return room;
  }

  addLink(source: string, target: string, type: string): RoomLink {
    const link: RoomLink = { source, target, type };
    this.graph.links.push(link);
    return link;
  }

  generateRooms(
    numRooms: number,
    dungeonWidth: number,
    dungeonHeight: number
  ): void {
    const occupiedPositions = new Set<string>();

    for (let i = 0; i < numRooms; i++) {
      let x: number, y: number;

      // Generate unique coordinates aligned to the grid
      do {
        x = Math.floor(Math.random() * (dungeonWidth / this.cellSize));
        y = Math.floor(Math.random() * (dungeonHeight / this.cellSize));
      } while (occupiedPositions.has(`${x},${y}`));

      occupiedPositions.add(`${x},${y}`);
      this.addRoom(`Room ${i}`, x, y);
    }
  }

  generateLinks(primaryProbability: number = 0.8): void {
    const adjacencyMap = new Map<string, RoomNode[]>();

    // Build adjacency map for primary connections (adjacent nodes)
    for (const room of this.graph.rooms) {
      adjacencyMap.set(room.id, []);
      for (const otherRoom of this.graph.rooms) {
        if (
          (room.id !== otherRoom.id &&
            Math.abs(room.x - otherRoom.x) === this.cellSize &&
            room.y === otherRoom.y) ||
          (Math.abs(room.y - otherRoom.y) === this.cellSize &&
            room.x === otherRoom.x)
        ) {
          adjacencyMap.get(room.id)?.push(otherRoom);
        }
      }
    }

    // Create primary connections (adjacent nodes)
    for (const [roomId, neighbors] of adjacencyMap.entries()) {
      for (const neighbor of neighbors) {
        const existingLink = this.graph.links.find(
          (link) =>
            (link.source === roomId && link.target === neighbor.id) ||
            (link.source === neighbor.id && link.target === roomId)
        );
        if (!existingLink) {
          this.addLink(roomId, neighbor.id, 'primary');
        }
      }
    }

    // Create secondary connections (random)
    for (let i = 0; i < this.graph.rooms.length; i++) {
      for (let j = i + 1; j < this.graph.rooms.length; j++) {
        const roomA = this.graph.rooms[i];
        const roomB = this.graph.rooms[j];

        if (Math.random() > primaryProbability) {
          if (
            !this.graph.links.some(
              (link) =>
                (link.source === roomA.id && link.target === roomB.id) ||
                (link.source === roomB.id && link.target === roomA.id)
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
        .filter((link) => link.source === roomId || link.target === roomId)
        .map((link) => (link.source === roomId ? link.target : link.source));

      neighbors.forEach((neighbor) => dfs(neighbor as string));
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

    // Draw links
    svg
      .append('g')
      .selectAll<SVGLineElement, RoomLink>('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => (d.type === 'primary' ? 'black' : 'red'))
      .attr('stroke-width', (d) => (d.type === 'primary' ? 2 : 1))
      .attr('x1', (d) => {
        const source = this.graph.rooms.find((room) => room.id === d.source);
        return source ? source.x + offsetX : 0;
      })
      .attr('y1', (d) => {
        const source = this.graph.rooms.find((room) => room.id === d.source);
        return source ? source.y + offsetY : 0;
      })
      .attr('x2', (d) => {
        const target = this.graph.rooms.find((room) => room.id === d.target);
        return target ? target.x + offsetX : 0;
      })
      .attr('y2', (d) => {
        const target = this.graph.rooms.find((room) => room.id === d.target);
        return target ? target.y + offsetY : 0;
      });

    // Draw nodes
    svg
      .append('g')
      .selectAll<SVGCircleElement, RoomNode>('circle')
      .data(this.graph.rooms)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'blue')
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY);

    svg
      .selectAll('circle')
      .append('title')
      .text((d) => d.name);
  }
}
