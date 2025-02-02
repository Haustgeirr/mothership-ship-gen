import * as d3 from 'd3';
import type { DungeonGraph, RoomNode, RoomLink } from './types';
import { AStarGrid, type GridCell } from './AStarGrid';
import { DUNGEON_CONSTANTS } from './constants';

interface NodeBounds {
  width: number;
  height: number;
  shape: 'circle' | 'rectangle';
}

export interface NavigationGridData {
  grid: GridCell[][];
  cellSize: number;
}

export class DungeonRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private graph: DungeonGraph | null = null;

  private getNodeBounds(node: RoomNode): NodeBounds {
    return {
      width: node.size || DUNGEON_CONSTANTS.NODE_SIZE,
      height: node.size || DUNGEON_CONSTANTS.NODE_SIZE,
      shape: 'circle',
    };
  }

  private getConnectorBounds(link: RoomLink): NodeBounds {
    return {
      width: DUNGEON_CONSTANTS.CONNECTOR_SIZE,
      height: DUNGEON_CONSTANTS.CONNECTOR_SIZE,
      shape: link.type === 'door' ? 'circle' : 'rectangle',
    };
  }

  private calculateEndpoint(
    source: RoomNode,
    target: RoomNode,
    bounds: NodeBounds,
    link?: RoomLink
  ) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // For non-secondary connections, keep existing cardinal direction logic
    if (!link || link.type !== 'secondary') {
      // Determine the dominant direction and snap to cardinal
      let angle: number;
      if (Math.abs(dx) > Math.abs(dy)) {
        angle = dx > 0 ? 0 : Math.PI; // 0 for East, PI for West
      } else {
        angle = dy > 0 ? Math.PI / 2 : -Math.PI / 2; // PI/2 for South, -PI/2 for North
      }

      let intersectDistance: number;
      if (bounds.shape === 'circle') {
        intersectDistance = bounds.width / 2;
      } else {
        intersectDistance =
          Math.abs(Math.cos(angle)) > 0 ? bounds.width / 2 : bounds.height / 2;
      }

      return {
        x: source.x + Math.cos(angle) * intersectDistance,
        y: source.y + Math.sin(angle) * intersectDistance,
      };
    }

    // Get all existing connections for this room
    const existingLinks = (this.graph?.links || []).filter(
      (l) =>
        (l.source === source || l.target === source) && l.type === 'secondary'
    );

    // Calculate used directions and positions
    const usedPositions = new Set<string>();
    existingLinks.forEach((l) => {
      const otherNode = l.source === source ? l.target : l.source;
      const endpoint = this.calculateEndpoint(source, otherNode, bounds);
      usedPositions.add(`${Math.round(endpoint.x)},${Math.round(endpoint.y)}`);
    });

    // Available cardinal directions (North, South, East, West)
    const directions = [
      { angle: -Math.PI / 2, name: 'N' }, // North
      { angle: Math.PI / 2, name: 'S' }, // South
      { angle: 0, name: 'E' }, // East
      { angle: Math.PI, name: 'W' }, // West
    ];

    // Calculate scores for each direction
    const scoredDirections = directions.map((dir) => {
      const intersectDistance = bounds.width / 2;
      const x = source.x + Math.cos(dir.angle) * intersectDistance;
      const y = source.y + Math.sin(dir.angle) * intersectDistance;
      const posKey = `${Math.round(x)},${Math.round(y)}`;

      // Check if position is already used
      const isUsed = usedPositions.has(posKey);

      // Calculate angle to target
      const targetAngle = Math.atan2(dy, dx);

      // Calculate angle difference (0 to PI)
      let angleDiff = Math.abs(dir.angle - targetAngle);
      angleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

      // Score based on direction to target and whether position is used
      // Prefer directions that point towards the target
      return {
        ...dir,
        x,
        y,
        score: isUsed ? -1000 : (Math.PI - angleDiff) * 10,
      };
    });

    // Sort by score and pick best available direction
    scoredDirections.sort((a, b) => b.score - a.score);
    const bestDir = scoredDirections[0];

    return {
      x: bestDir.x,
      y: bestDir.y,
    };
  }

  constructor(svgElement: SVGSVGElement) {
    this.svg = d3.select(svgElement);
  }

  private calculateOffsets(graph: DungeonGraph) {
    const svgWidth = +this.svg.attr('width');
    const svgHeight = +this.svg.attr('height');

    const xExtent = d3.extent(graph.rooms, (d) => d.x) as [number, number];
    const yExtent = d3.extent(graph.rooms, (d) => d.y) as [number, number];

    const dungeonWidth = xExtent[1] - xExtent[0];
    const dungeonHeight = yExtent[1] - yExtent[0];

    return {
      x: (svgWidth - dungeonWidth) / 2 - xExtent[0],
      y: (svgHeight - dungeonHeight) / 2 - yExtent[0],
    };
  }

  private renderLinks(
    graph: DungeonGraph,
    offsetX: number,
    offsetY: number,
    navigationData: NavigationGridData
  ) {
    const linkGroup = this.svg.append('g');
    const { grid, cellSize } = navigationData;
    const pathfinder = new AStarGrid(grid);

    // Render primary links first, then secondary
    const primaryLinks = graph.links.filter((l) => l.type === 'door');
    const secondaryLinks = graph.links.filter((l) => l.type === 'secondary');

    // Function to create path
    const createPath = (d: RoomLink) => {
      // Calculate proper start and end points for all connection types
      const start = this.calculateEndpoint(
        d.source,
        d.target,
        this.getNodeBounds(d.source),
        d
      );
      const end = this.calculateEndpoint(
        d.target,
        d.source,
        this.getNodeBounds(d.target),
        d
      );

      if (d.type === 'secondary') {
        // Check if there's a primary connection between these rooms
        const primaryConnection = graph.links.find(
          (link) =>
            link.type === 'door' &&
            ((link.source === d.source && link.target === d.target) ||
              (link.source === d.target && link.target === d.source))
        );

        const offset = 20; // Base offset in pixels
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const useVerticalFirst = Math.abs(dy) > Math.abs(dx);

        if (primaryConnection) {
          // Calculate primary connection endpoints
          const primaryStart = this.calculateEndpoint(
            primaryConnection.source,
            primaryConnection.target,
            this.getNodeBounds(primaryConnection.source)
          );
          const primaryEnd = this.calculateEndpoint(
            primaryConnection.target,
            primaryConnection.source,
            this.getNodeBounds(primaryConnection.target)
          );

          // Determine if our start or end points coincide with primary connection
          const startCoincident =
            Math.abs(start.x - primaryStart.x) < 1 ||
            Math.abs(start.x - primaryEnd.x) < 1;
          const endCoincident =
            Math.abs(end.x - primaryStart.x) < 1 ||
            Math.abs(end.x - primaryEnd.x) < 1;

          if (useVerticalFirst) {
            const offsetX = dx > 0 ? offset : -offset;
            // Adjust start and end X positions if they coincide with primary connection
            const startX = startCoincident
              ? start.x + offsetX * 2
              : start.x + offsetX;
            const endX = endCoincident ? end.x + offsetX * 2 : end.x + offsetX;

            return `M ${startX + offsetX} ${start.y + offsetY}
                    L ${startX + offsetX} ${end.y + offsetY}
                    L ${endX} ${end.y + offsetY}`;
          } else {
            const offsetY = dy > 0 ? offset : -offset;
            // Adjust start and end Y positions if they coincide with primary connection
            const startY = startCoincident
              ? start.y + offsetY * 2
              : start.y + offsetY;
            const endY = endCoincident ? end.y + offsetY * 2 : end.y + offsetY;

            return `M ${start.x + offsetX} ${startY + offsetY}
                    L ${end.x + offsetX} ${startY + offsetY}
                    L ${end.x + offsetX} ${endY}`;
          }
        } else {
          // Standard L-shaped path for non-coincident connections
          if (useVerticalFirst) {
            return `M ${start.x + offsetX} ${start.y + offsetY}
                    L ${start.x + offsetX} ${end.y + offsetY}
                    L ${end.x + offsetX} ${end.y + offsetY}`;
          } else {
            return `M ${start.x + offsetX} ${start.y + offsetY}
                    L ${end.x + offsetX} ${start.y + offsetY}
                    L ${end.x + offsetX} ${end.y + offsetY}`;
          }
        }
      }

      // Primary connection path code
      const sourceX = Math.floor(d.source.x / cellSize);
      const sourceY = Math.floor(d.source.y / cellSize);
      const targetX = Math.floor(d.target.x / cellSize);
      const targetY = Math.floor(d.target.y / cellSize);

      // Find path using A*
      const path = pathfinder.findPath(sourceX, sourceY, targetX, targetY);

      if (path.length === 0) {
        return `M ${start.x + offsetX} ${start.y + offsetY} 
                L ${end.x + offsetX} ${end.y + offsetY}`;
      }

      // Start from the calculated start point
      const pathCommands = [`M ${start.x + offsetX} ${start.y + offsetY}`];

      // Add path points
      path.slice(1, -1).forEach(([x, y]) => {
        const px = x * cellSize + cellSize / 2 + offsetX;
        const py = y * cellSize + cellSize / 2 + offsetY;
        pathCommands.push(`L ${px} ${py}`);
      });

      // End at the calculated end point
      pathCommands.push(`L ${end.x + offsetX} ${end.y + offsetY}`);

      return pathCommands.join(' ');
    };

    // Render primary links
    linkGroup
      .selectAll<SVGPathElement, RoomLink>('path.primary')
      .data(primaryLinks)
      .enter()
      .append('path')
      .attr('class', 'primary')
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('d', createPath);

    // Render secondary links
    linkGroup
      .selectAll<SVGPathElement, RoomLink>('path.secondary')
      .data(secondaryLinks)
      .enter()
      .append('path')
      .attr('class', 'secondary')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .attr('stroke-dasharray', '4,4')
      .attr('d', createPath);

    return linkGroup;
  }

  private renderDoorConnectors(
    linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    graph: DungeonGraph,
    offsetX: number,
    offsetY: number
  ) {
    // Source side connectors
    linkGroup
      .selectAll<SVGCircleElement, RoomLink>('circle.connector')
      .data(graph.links.filter((d) => d.type === 'door'))
      .enter()
      .append('circle')
      .attr('class', 'connector')
      .attr('r', (d) => this.getConnectorBounds(d).width / 2)
      .attr('fill', 'black')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('cx', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target),
          d
        );
        return start.x + offsetX;
      })
      .attr('cy', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target),
          d
        );
        return start.y + offsetY;
      });

    // Target side connectors
    linkGroup
      .selectAll<SVGCircleElement, RoomLink>('circle.connector-target')
      .data(graph.links.filter((d) => d.type === 'door'))
      .enter()
      .append('circle')
      .attr('class', 'connector-target')
      .attr('r', (d) => this.getConnectorBounds(d).width / 2)
      .attr('fill', 'black')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('cx', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source),
          d
        );
        return end.x + offsetX;
      })
      .attr('cy', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source),
          d
        );
        return end.y + offsetY;
      });
  }

  private renderSecondaryConnectors(
    linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    graph: DungeonGraph,
    offsetX: number,
    offsetY: number
  ) {
    // Source side connectors
    linkGroup
      .selectAll<SVGRectElement, RoomLink>('rect.connector')
      .data(graph.links.filter((d) => d.type === 'secondary'))
      .enter()
      .append('rect')
      .attr('class', 'connector')
      .attr('width', (d) => this.getConnectorBounds(d).width)
      .attr('height', (d) => this.getConnectorBounds(d).height)
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('x', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target),
          d
        );
        return start.x + offsetX - this.getConnectorBounds(d).width / 2;
      })
      .attr('y', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target),
          d
        );
        return start.y + offsetY - this.getConnectorBounds(d).height / 2;
      });

    // Target side connectors
    linkGroup
      .selectAll<SVGRectElement, RoomLink>('rect.connector-target')
      .data(graph.links.filter((d) => d.type === 'secondary'))
      .enter()
      .append('rect')
      .attr('class', 'connector-target')
      .attr('width', (d) => this.getConnectorBounds(d).width)
      .attr('height', (d) => this.getConnectorBounds(d).height)
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('x', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source),
          d
        );
        return end.x + offsetX - this.getConnectorBounds(d).width / 2;
      })
      .attr('y', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source),
          d
        );
        return end.y + offsetY - this.getConnectorBounds(d).height / 2;
      });
  }

  private renderRooms(graph: DungeonGraph, offsetX: number, offsetY: number) {
    // Create a group for each room that will contain both circle and text
    const roomGroups = this.svg
      .append('g')
      .selectAll<SVGGElement, RoomNode>('g')
      .data(graph.rooms)
      .enter()
      .append('g');

    // Add circles
    roomGroups
      .append('circle')
      .attr('r', (d) => this.getNodeBounds(d).width / 2)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY)
      .append('title')
      .text((d: RoomNode) => `${d.name} (${d.id})`);

    // Add text labels inside circles
    roomGroups
      .append('text')
      .attr('x', (d) => d.x + offsetX)
      .attr('y', (d) => d.y + offsetY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .text((d) => d.id.toString());

    return roomGroups;
  }

  render(graph: DungeonGraph, navigationData: NavigationGridData): void {
    this.svg.selectAll('*').remove();
    this.graph = graph;

    const { x: offsetX, y: offsetY } = this.calculateOffsets(graph);

    // Render rooms first so they appear behind everything else
    this.renderRooms(graph, offsetX, offsetY);
    const linkGroup = this.renderLinks(graph, offsetX, offsetY, navigationData);
    this.renderDoorConnectors(linkGroup, graph, offsetX, offsetY);
    this.renderSecondaryConnectors(linkGroup, graph, offsetX, offsetY);
  }

  // Remove the debug render method since we now show IDs by default
  renderDebug(graph: DungeonGraph): void {
    this.render(graph, { grid: [], cellSize: 1 });
  }
}
