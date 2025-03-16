import * as d3 from 'd3';
import type { DungeonGraph, RoomNode, RoomLink } from './types';
import { AStarGrid, type GridCell } from './AStarGrid';
import { DUNGEON_CONSTANTS } from './constants';

// Define Point type for path coordinates
type Point = [number, number];

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
  private navigationData: NavigationGridData | null = null;
  private currentStep: number = -1;
  private linkGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private renderSecondaryConnections: boolean = false;

  constructor(svgElement: SVGSVGElement) {
    this.svg = d3.select(svgElement);
  }

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

  private getNavigationData(): NavigationGridData {
    if (!this.navigationData) {
      throw new Error('Navigation data not initialized');
    }
    return this.navigationData;
  }

  private findNearestWalkableCell(
    x: number,
    y: number,
    grid: GridCell[][]
  ): { x: number; y: number } | null {
    // Check adjacent cells in a spiral pattern
    const checked = new Set<string>();
    const toCheck: Array<[number, number, number]> = [[x, y, 0]]; // x, y, distance

    while (toCheck.length > 0) {
      const [cx, cy, dist] = toCheck.shift()!;
      const key = `${cx},${cy}`;

      if (checked.has(key)) continue;
      checked.add(key);

      // Check if this cell is valid and walkable
      if (cx >= 0 && cy >= 0 && cx < grid[0].length && cy < grid.length) {
        if (grid[cy][cx].walkable) {
          return { x: cx, y: cy };
        }

        // Add adjacent cells with increased distance
        toCheck.push(
          [cx + 1, cy, dist + 1],
          [cx - 1, cy, dist + 1],
          [cx, cy + 1, dist + 1],
          [cx, cy - 1, dist + 1]
        );

        // Sort by distance to prioritize closer cells
        toCheck.sort((a, b) => a[2] - b[2]);
      }
    }

    return null;
  }

  private findBestConnectionPoint(
    room: RoomNode,
    target: RoomNode,
    grid: GridCell[][],
    cellSize: number
  ): { x: number; y: number } | null {
    console.group(`Finding best connection point for Room ${room.id} → Room ${target.id}`);

    const roomX = Math.floor(room.x / cellSize);
    const roomY = Math.floor(room.y / cellSize);
    const targetX = Math.floor(target.x / cellSize);
    const targetY = Math.floor(target.y / cellSize);

    console.log(`Room ${room.id} grid position: (${roomX}, ${roomY})`);
    console.log(`Target ${target.id} grid position: (${targetX}, ${targetY})`);

    // Get the general direction to the target
    const dx = targetX - roomX;
    const dy = targetY - roomY;
    console.log(`Direction vector: dx=${dx}, dy=${dy}`);

    // Generate candidate points around the room
    const candidatePoints: Array<[number, number]> = [];

    // Add points in all four directions
    candidatePoints.push(
      [roomX + 1, roomY], // East
      [roomX - 1, roomY], // West
      [roomX, roomY + 1], // South
      [roomX, roomY - 1]  // North
    );

    // Add diagonal points for more options
    candidatePoints.push(
      [roomX + 1, roomY + 1], // Southeast
      [roomX + 1, roomY - 1], // Northeast
      [roomX - 1, roomY + 1], // Southwest
      [roomX - 1, roomY - 1]  // Northwest
    );

    console.log(`Generated ${candidatePoints.length} candidate points:`, candidatePoints);

    // Filter to valid points and find walkable cells
    const validPoints: Array<{ x: number, y: number, score: number }> = [];

    for (const [x, y] of candidatePoints) {
      // Check if point is within grid bounds
      if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
        // Find a walkable cell near this point
        const walkable = this.findNearestWalkableCell(x, y, grid);
        if (walkable) {
          // Calculate a score for this point based on:
          // 1. Manhattan distance to target (lower is better)
          // 2. Whether it's in the general direction of the target (preferred)
          const distanceToTarget = Math.abs(walkable.x - targetX) + Math.abs(walkable.y - targetY);

          // Direction alignment score - higher if the point is in the same direction as the target
          let directionScore = 0;
          const pointDx = x - roomX;
          const pointDy = y - roomY;

          // If the point is in the same general direction as the target, give it a bonus
          if ((pointDx > 0 && dx > 0) || (pointDx < 0 && dx < 0)) directionScore += 10;
          if ((pointDy > 0 && dy > 0) || (pointDy < 0 && dy < 0)) directionScore += 10;

          // Prefer cardinal directions over diagonals when appropriate
          if (Math.abs(dx) > Math.abs(dy) * 2 && pointDx !== 0 && pointDy === 0) directionScore += 5;
          if (Math.abs(dy) > Math.abs(dx) * 2 && pointDy !== 0 && pointDx === 0) directionScore += 5;

          // NEW: Penalize overshooting the target
          const overshot =
            (dx > 0 && walkable.x > targetX) ||
            (dx < 0 && walkable.x < targetX) ||
            (dy > 0 && walkable.y > targetY) ||
            (dy < 0 && walkable.y < targetY);

          const overshootPenalty = overshot ? 15 : 0;

          // NEW: Prefer points that lead to shorter paths
          // Calculate the actual path length from this point to the target
          const pathLengthEstimate = Math.abs(walkable.x - targetX) + Math.abs(walkable.y - targetY);

          // Calculate final score (lower is better)
          // Add overshoot penalty and give more weight to path length
          const score = pathLengthEstimate * 2 + overshootPenalty - directionScore;

          validPoints.push({
            x: walkable.x,
            y: walkable.y,
            score
          });

          console.log(`Point (${x}, ${y}) → walkable (${walkable.x}, ${walkable.y}), distance=${distanceToTarget}, dirScore=${directionScore}, overshootPenalty=${overshootPenalty}, pathLength=${pathLengthEstimate}, finalScore=${score}`);
        } else {
          console.log(`Point (${x}, ${y}) has no nearby walkable cells`);
        }
      } else {
        console.log(`Point (${x}, ${y}) is out of bounds`);
      }
    }

    // Sort by score (lower is better) and return the best point
    if (validPoints.length > 0) {
      validPoints.sort((a, b) => a.score - b.score);
      console.log(`Selected best point: (${validPoints[0].x}, ${validPoints[0].y}) with score ${validPoints[0].score}`);
      console.groupEnd();
      return validPoints[0];
    }

    console.warn('No valid connection points found');
    console.groupEnd();
    return null;
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

    // For secondary connections, determine direction based on the first/last grid cell in path
    const { grid, cellSize } = this.getNavigationData();
    const sourceX = Math.floor(source.x / cellSize);
    const sourceY = Math.floor(source.y / cellSize);
    const targetX = Math.floor(target.x / cellSize);
    const targetY = Math.floor(target.y / cellSize);

    const walkableStart = this.findNearestWalkableCell(sourceX, sourceY, grid);
    const walkableEnd = this.findNearestWalkableCell(targetX, targetY, grid);

    if (!walkableStart || !walkableEnd) {
      // Fallback to basic direction if no path found
      return this.calculateBasicEndpoint(source, target, bounds);
    }

    const path = new AStarGrid(grid).findPath(
      walkableStart.x,
      walkableStart.y,
      walkableEnd.x,
      walkableEnd.y,
      false
    );

    if (path.length < 2) {
      return this.calculateBasicEndpoint(source, target, bounds);
    }

    // Determine direction based on whether this is source or target node
    const [firstX, firstY] = path[0];
    const [secondX, secondY] = path[1];
    const [lastX, lastY] = path[path.length - 1];
    const [secondLastX, secondLastY] = path[path.length - 2];

    // Calculate angle based on path direction
    let angle: number;
    if (source.x === target.x && source.y === target.y) {
      // Special case for self-connection
      angle = Math.PI / 4; // 45 degrees
    } else if (
      Math.abs(source.x - target.x) < cellSize &&
      Math.abs(source.y - target.y) < cellSize
    ) {
      // Adjacent nodes
      angle = Math.atan2(dy, dx);
    } else {
      // Use path direction
      const isSource =
        Math.abs(source.x / cellSize - firstX) < 2 &&
        Math.abs(source.y / cellSize - firstY) < 2;
      if (isSource) {
        angle = Math.atan2(secondY - firstY, secondX - firstX);
      } else {
        angle = Math.atan2(lastY - secondLastY, lastX - secondLastX);
      }
    }

    const intersectDistance = bounds.width / 2;
    return {
      x: source.x + Math.cos(angle) * intersectDistance,
      y: source.y + Math.sin(angle) * intersectDistance,
    };
  }

  private calculateBasicEndpoint(
    source: RoomNode,
    target: RoomNode,
    bounds: NodeBounds
  ) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);
    const intersectDistance = bounds.width / 2;
    return {
      x: source.x + Math.cos(angle) * intersectDistance,
      y: source.y + Math.sin(angle) * intersectDistance,
    };
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

  private calculateSecondaryPath(
    source: RoomNode,
    target: RoomNode,
    navigationData: NavigationGridData,
    offsetX: number,
    offsetY: number
  ): string {
    const { grid, cellSize } = navigationData;

    console.group(`Secondary Path: Room ${source.id} → Room ${target.id}`);
    console.log(`Source room: (${Math.floor(source.x / cellSize)}, ${Math.floor(source.y / cellSize)})`);
    console.log(`Target room: (${Math.floor(target.x / cellSize)}, ${Math.floor(target.y / cellSize)})`);

    // Find best connection points for both rooms
    const sourcePoint = this.findBestConnectionPoint(source, target, grid, cellSize);
    const targetPoint = this.findBestConnectionPoint(target, source, grid, cellSize);

    if (!sourcePoint || !targetPoint) {
      console.warn('No valid connection points found, using direct line');
      console.groupEnd();
      // Fallback to direct line if no path found
      return `M ${source.x + offsetX} ${source.y + offsetY} 
              L ${target.x + offsetX} ${target.y + offsetY}`;
    }

    console.log(`Source connection point: (${sourcePoint.x}, ${sourcePoint.y}) [grid coordinates]`);
    console.log(`Target connection point: (${targetPoint.x}, ${targetPoint.y}) [grid coordinates]`);

    // Find path between connection points
    const pathfinder = new AStarGrid(grid);
    const path = pathfinder.findPath(
      sourcePoint.x,
      sourcePoint.y,
      targetPoint.x,
      targetPoint.y,
      true,
      true // Use secondary path optimization
    );

    console.log(`Raw path length: ${path.length} points`);
    console.log('Raw path points (grid coordinates):', path);

    // Simplify the path to remove unnecessary points
    const simplifiedPath = this.simplifyPath(path);
    console.log(`Simplified path length: ${simplifiedPath.length} points`);
    console.log('Simplified path points (grid coordinates):', simplifiedPath);

    // Count turns in the path
    let turns = 0;
    let lastDirection = '';
    for (let i = 1; i < simplifiedPath.length; i++) {
      const prev = simplifiedPath[i - 1];
      const current = simplifiedPath[i];
      const dx = current[0] - prev[0];
      const dy = current[1] - prev[1];
      const currentDirection = dx !== 0 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

      if (lastDirection && currentDirection !== lastDirection) {
        turns++;
      }
      lastDirection = currentDirection;
    }
    console.log(`Number of turns in path: ${turns}`);

    // Convert grid coordinates to world coordinates
    const worldPath = simplifiedPath.map(([x, y]) => ({
      x: x * cellSize + offsetX,
      y: y * cellSize + offsetY,
    }));

    // Calculate angles for start and end adjustments
    const startAngle = Math.atan2(
      worldPath[0].y - source.y - offsetY,
      worldPath[0].x - source.x - offsetX
    );
    const endAngle = Math.atan2(
      target.y + offsetY - worldPath[worldPath.length - 1].y,
      target.x + offsetX - worldPath[worldPath.length - 1].x
    );

    // Adjust start and end points to room edges
    const sourceRadius = this.getNodeBounds(source).width / 2;
    const targetRadius = this.getNodeBounds(target).width / 2;
    const adjustedStart = {
      x: source.x + Math.cos(startAngle) * sourceRadius + offsetX,
      y: source.y + Math.sin(startAngle) * sourceRadius + offsetY,
    };
    const adjustedEnd = {
      x: target.x - Math.cos(endAngle) * targetRadius + offsetX,
      y: target.y - Math.sin(endAngle) * targetRadius + offsetY,
    };

    console.log(`Adjusted start point: (${adjustedStart.x.toFixed(2)}, ${adjustedStart.y.toFixed(2)}) [world coordinates]`);
    console.log(`Adjusted end point: (${adjustedEnd.x.toFixed(2)}, ${adjustedEnd.y.toFixed(2)}) [world coordinates]`);

    // Create path commands
    const pathCommands = [`M ${adjustedStart.x} ${adjustedStart.y}`];

    // Add intermediate path points
    worldPath.forEach((point) => {
      pathCommands.push(`L ${point.x} ${point.y}`);
    });

    // End at adjusted target point
    pathCommands.push(`L ${adjustedEnd.x} ${adjustedEnd.y}`);

    console.groupEnd();
    return pathCommands.join(' ');
  }

  /**
   * Simplifies a path by removing unnecessary points that are in a straight line
   */
  private simplifyPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;

    const result: Point[] = [path[0]];
    let lastDirection: string | null = null;

    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const current = path[i];

      // Calculate current direction
      const dx = current[0] - prev[0];
      const dy = current[1] - prev[1];
      const currentDirection = dx !== 0 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

      // If direction changed or this is the last point, add it to the result
      if (currentDirection !== lastDirection || i === path.length - 1) {
        result.push(current);
        lastDirection = currentDirection;
      }
    }

    return result;
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
    const secondaryLinks = this.renderSecondaryConnections
      ? graph.links.filter((l) => l.type === 'secondary')
      : [];

    // Function to create path
    const createPath = (d: RoomLink) => {
      if (d.type === 'secondary') {
        // Use A* pathfinding for secondary connections
        const path = this.calculateSecondaryPath(
          d.source,
          d.target,
          navigationData,
          offsetX,
          offsetY
        );
        return path;
      }

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

      // Primary connection path code
      const sourceX = Math.floor(d.source.x / cellSize);
      const sourceY = Math.floor(d.source.y / cellSize);
      const targetX = Math.floor(d.target.x / cellSize);
      const targetY = Math.floor(d.target.y / cellSize);

      // Find path using A* without debug
      const path = pathfinder.findPath(
        sourceX,
        sourceY,
        targetX,
        targetY,
        false
      );

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
    // Helper to get the first/last path segment direction and position
    const getPathEndpoint = (d: RoomLink, isSource: boolean) => {
      const path = this.calculateSecondaryPath(
        d.source,
        d.target,
        this.getNavigationData(),
        0,
        0
      );
      const commands = path
        .split(/([MLZ])/)
        .filter((cmd) => cmd.trim().length > 0);

      if (isSource) {
        // Get coordinates from first line segment (M x,y L x2,y2)
        const moveCmd = commands[1]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const lineCmd = commands[3]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const angle = Math.atan2(
          lineCmd[1] - moveCmd[1],
          lineCmd[0] - moveCmd[0]
        );

        return {
          x: moveCmd[0],
          y: moveCmd[1],
          angle: angle,
        };
      } else {
        // Get coordinates from last line segment
        const lastCmd = commands[commands.length - 1]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const prevCmd = commands[commands.length - 3]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const angle = Math.atan2(
          lastCmd[1] - prevCmd[1],
          lastCmd[0] - prevCmd[0]
        );

        return {
          x: lastCmd[0],
          y: lastCmd[1],
          angle: angle,
        };
      }
    };

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
      .attr('transform', (d) => {
        const endpoint = getPathEndpoint(d, true);
        const bounds = this.getConnectorBounds(d);
        return `translate(${endpoint.x + offsetX - bounds.width / 2}, ${endpoint.y + offsetY - bounds.height / 2
          }) rotate(${(endpoint.angle * 180) / Math.PI}, ${bounds.width / 2}, ${bounds.height / 2
          })`;
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
      .attr('transform', (d) => {
        const endpoint = getPathEndpoint(d, false);
        const bounds = this.getConnectorBounds(d);
        return `translate(${endpoint.x + offsetX - bounds.width / 2
          }, ${endpoint.y + offsetY - bounds.height / 2
          }) rotate(${(endpoint.angle * 180) / Math.PI
          }, ${bounds.width / 2}, ${bounds.height / 2})`;
      });
  }

  private renderRooms(
    graph: DungeonGraph,
    offsetX: number,
    offsetY: number
  ) {
    // Draw nodes with IDs for debugging
    const nodes = this.svg
      .append('g')
      .selectAll<SVGCircleElement, RoomNode>('circle')
      .data(graph.rooms)
      .enter()
      .append('circle')
      .attr('r', (d) => this.getNodeBounds(d).width / 2)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY);

    // Add room numbers
    this.svg
      .append('g')
      .selectAll<SVGTextElement, RoomNode>('text')
      .data(graph.rooms)
      .enter()
      .append('text')
      .attr('x', (d) => d.x + offsetX)
      .attr('y', (d) => d.y + offsetY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text((d) => d.id);

    // Add tooltips
    nodes.append('title').text((d: RoomNode) => `${d.name} (${d.id})`);
  }

  private renderNavigationGrid(
    navigationData: NavigationGridData,
    offsetX: number,
    offsetY: number
  ) {
    const { grid, cellSize } = navigationData;

    // Create a group for the grid
    const gridGroup = this.svg.append('g');

    // Render each cell
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        gridGroup
          .append('rect')
          .attr('x', x * cellSize + offsetX - cellSize / 2)
          .attr('y', y * cellSize + offsetY - cellSize / 2)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr(
            'fill',
            cell.walkable ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
          )
          .attr('stroke', 'rgba(0, 0, 0, 0.1)')
          .attr('stroke-width', 1);
      }
    }

    // Return the group so it can be placed behind other elements
    return gridGroup;
  }

  private renderStep() {
    if (!this.graph || !this.navigationData || !this.linkGroup) return;

    const { x: offsetX, y: offsetY } = this.calculateOffsets(this.graph);
    const allLinks = [...this.graph.links];
    const currentLink = allLinks[this.currentStep];

    if (!currentLink) return;

    // Skip secondary connections if disabled
    if (currentLink.type === 'secondary' && !this.renderSecondaryConnections) {
      return;
    }

    // Function to create path (reuse existing createPath logic)
    const createPath = (d: RoomLink) => {
      if (d.type === 'secondary') {
        return this.calculateSecondaryPath(
          d.source,
          d.target,
          this.navigationData!,
          offsetX,
          offsetY
        );
      }

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

      const { grid, cellSize } = this.navigationData!;
      const pathfinder = new AStarGrid(grid);
      const sourceX = Math.floor(d.source.x / cellSize);
      const sourceY = Math.floor(d.source.y / cellSize);
      const targetX = Math.floor(d.target.x / cellSize);
      const targetY = Math.floor(d.target.y / cellSize);

      const path = pathfinder.findPath(
        sourceX,
        sourceY,
        targetX,
        targetY,
        false
      );

      if (path.length === 0) {
        return `M ${start.x + offsetX} ${start.y + offsetY} 
                L ${end.x + offsetX} ${end.y + offsetY}`;
      }

      const pathCommands = [`M ${start.x + offsetX} ${start.y + offsetY}`];
      path.slice(1, -1).forEach(([x, y]) => {
        const px = x * cellSize + cellSize / 2 + offsetX;
        const py = y * cellSize + cellSize / 2 + offsetY;
        pathCommands.push(`L ${px} ${py}`);
      });
      pathCommands.push(`L ${end.x + offsetX} ${end.y + offsetY}`);

      return pathCommands.join(' ');
    };

    // Render the current link
    const path = this.linkGroup
      .append('path')
      .attr('class', currentLink.type)
      .attr('stroke', currentLink.type === 'door' ? 'black' : 'red')
      .attr('stroke-width', currentLink.type === 'door' ? 2 : 1)
      .attr('fill', 'none')
      .attr('stroke-dasharray', currentLink.type === 'secondary' ? '4,4' : 'none')
      .attr('d', createPath(currentLink));

    // Add connectors based on link type
    if (currentLink.type === 'door') {
      this.renderDoorConnectorsForLink(currentLink, offsetX, offsetY);
    } else if (this.renderSecondaryConnections) {
      this.renderSecondaryConnectorsForLink(currentLink, offsetX, offsetY);
    }
  }

  private renderDoorConnectorsForLink(
    link: RoomLink,
    offsetX: number,
    offsetY: number
  ) {
    if (!this.linkGroup) return;

    // Source connector
    const start = this.calculateEndpoint(
      link.target,
      link.source,
      this.getNodeBounds(link.target),
      link
    );
    this.linkGroup
      .append('circle')
      .attr('class', 'connector')
      .attr('r', this.getConnectorBounds(link).width / 2)
      .attr('fill', 'black')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('cx', start.x + offsetX)
      .attr('cy', start.y + offsetY);

    // Target connector
    const end = this.calculateEndpoint(
      link.source,
      link.target,
      this.getNodeBounds(link.source),
      link
    );
    this.linkGroup
      .append('circle')
      .attr('class', 'connector-target')
      .attr('r', this.getConnectorBounds(link).width / 2)
      .attr('fill', 'black')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('cx', end.x + offsetX)
      .attr('cy', end.y + offsetY);
  }

  private renderSecondaryConnectorsForLink(
    link: RoomLink,
    offsetX: number,
    offsetY: number
  ) {
    if (!this.linkGroup) return;

    const getPathEndpoint = (isSource: boolean) => {
      const path = this.calculateSecondaryPath(
        link.source,
        link.target,
        this.getNavigationData(),
        0,
        0
      );
      const commands = path
        .split(/([MLZ])/)
        .filter((cmd) => cmd.trim().length > 0);

      if (isSource) {
        const moveCmd = commands[1]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const lineCmd = commands[3]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        return {
          x: moveCmd[0],
          y: moveCmd[1],
          angle: Math.atan2(lineCmd[1] - moveCmd[1], lineCmd[0] - moveCmd[0]),
        };
      } else {
        const lastCmd = commands[commands.length - 1]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const prevCmd = commands[commands.length - 3]
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const angle = Math.atan2(
          lastCmd[1] - prevCmd[1],
          lastCmd[0] - prevCmd[0]
        );

        return {
          x: lastCmd[0],
          y: lastCmd[1],
          angle: angle,
        };
      }
    };

    // Source connector
    const sourceEndpoint = getPathEndpoint(true);
    const bounds = this.getConnectorBounds(link);
    this.linkGroup
      .append('rect')
      .attr('class', 'connector')
      .attr('width', bounds.width)
      .attr('height', bounds.height)
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('transform', `translate(${sourceEndpoint.x + offsetX - bounds.width / 2
        }, ${sourceEndpoint.y + offsetY - bounds.height / 2}) rotate(${(sourceEndpoint.angle * 180) / Math.PI
        }, ${bounds.width / 2}, ${bounds.height / 2})`);

    // Target connector
    const targetEndpoint = getPathEndpoint(false);
    this.linkGroup
      .append('rect')
      .attr('class', 'connector-target')
      .attr('width', bounds.width)
      .attr('height', bounds.height)
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('transform', `translate(${targetEndpoint.x + offsetX - bounds.width / 2
        }, ${targetEndpoint.y + offsetY - bounds.height / 2
        }) rotate(${(targetEndpoint.angle * 180) / Math.PI
        }, ${bounds.width / 2}, ${bounds.height / 2})`);
  }

  public initializeRender(graph: DungeonGraph, navigationData: NavigationGridData): void {
    this.navigationData = navigationData;
    this.svg.selectAll('*').remove();
    this.graph = graph;
    this.currentStep = -1;

    const { x: offsetX, y: offsetY } = this.calculateOffsets(graph);

    // Render navigation grid
    this.gridGroup = this.renderNavigationGrid(navigationData, offsetX, offsetY);
    this.gridGroup.lower();

    // Render rooms
    this.renderRooms(graph, offsetX, offsetY);

    // Create empty link group for step-by-step rendering
    this.linkGroup = this.svg.append('g');
  }

  public nextStep(): boolean {
    if (!this.graph || this.currentStep >= this.graph.links.length - 1) {
      return false;
    }

    this.currentStep++;

    // Skip secondary connections if disabled
    if (
      this.renderSecondaryConnections === false &&
      this.graph.links[this.currentStep].type === 'secondary'
    ) {
      return this.nextStep();
    }

    this.renderStep();
    return true;
  }

  public previousStep(): boolean {
    if (!this.graph || this.currentStep <= 0) {
      return false;
    }

    // Remove the current step's rendering
    if (this.linkGroup) {
      this.linkGroup.selectAll('*').remove();
    }

    this.currentStep--;

    // Skip secondary connections if disabled
    if (
      this.renderSecondaryConnections === false &&
      this.graph.links[this.currentStep].type === 'secondary'
    ) {
      return this.previousStep();
    }

    // Re-render all steps up to the current one
    for (let i = 0; i <= this.currentStep; i++) {
      this.currentStep = i;
      this.renderStep();
    }

    return true;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getTotalSteps(): number {
    if (!this.graph) return 0;

    if (this.renderSecondaryConnections) {
      return this.graph.links.length;
    } else {
      return this.graph.links.filter(link => link.type !== 'secondary').length;
    }
  }

  public setRenderSecondaryConnections(render: boolean): void {
    this.renderSecondaryConnections = render;
  }

  render(graph: DungeonGraph, navigationData: NavigationGridData): void {
    // Initialize the render
    this.initializeRender(graph, navigationData);

    // Render all steps at once
    while (this.nextStep()) { }
  }

  renderDebug(graph: DungeonGraph, navigationData: NavigationGridData): void {
    this.render(graph, navigationData);
  }
}

/**
 * SquareCellRenderer - Renders dungeon rooms as squares with borders
 * instead of circular nodes with connectors.
 */
export class SquareCellRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private graph: DungeonGraph | null = null;
  private navigationData: NavigationGridData | null = null;
  private currentStep: number = -1;
  private linkGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private renderSecondaryConnections: boolean = false;

  constructor(svgElement: SVGSVGElement) {
    this.svg = d3.select(svgElement);
  }

  private getCellSize(): number {
    return DUNGEON_CONSTANTS.CELL_SIZE;
  }

  private getNavigationData(): NavigationGridData {
    if (!this.navigationData) {
      throw new Error('Navigation data not initialized');
    }
    return this.navigationData;
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

  private renderRooms(
    graph: DungeonGraph,
    offsetX: number,
    offsetY: number
  ) {
    const cellSize = this.getCellSize();

    // Draw rooms as squares with borders that fill the entire cell
    const nodes = this.svg
      .append('g')
      .selectAll<SVGRectElement, RoomNode>('rect')
      .data(graph.rooms)
      .enter()
      .append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('x', (d) => d.x + offsetX - cellSize / 2) // Center the square
      .attr('y', (d) => d.y + offsetY - cellSize / 2) // Center the square
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    // Add room numbers (keep the same as in DungeonRenderer)
    this.svg
      .append('g')
      .selectAll<SVGTextElement, RoomNode>('text')
      .data(graph.rooms)
      .enter()
      .append('text')
      .attr('x', (d) => d.x + offsetX)
      .attr('y', (d) => d.y + offsetY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text((d) => d.id);

    // Add tooltips
    nodes.append('title').text((d: RoomNode) => `${d.name} (${d.id})`);
  }

  private calculateLinkEndpoint(
    source: RoomNode,
    target: RoomNode,
    offsetX: number,
    offsetY: number
  ) {
    // Calculate direction vector
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Determine the dominant direction and snap to cardinal
    const cellSize = this.getCellSize();
    const halfSize = cellSize / 2;

    // Determine exit point on the square (at the edge of the cell)
    let exitX, exitY;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal dominant direction
      exitX = source.x + (dx > 0 ? halfSize : -halfSize);
      exitY = source.y;
    } else {
      // Vertical dominant direction
      exitX = source.x;
      exitY = source.y + (dy > 0 ? halfSize : -halfSize);
    }

    return {
      x: exitX + offsetX,
      y: exitY + offsetY
    };
  }

  private renderLinks(
    graph: DungeonGraph,
    offsetX: number,
    offsetY: number,
    navigationData: NavigationGridData
  ) {
    const linkGroup = this.svg.append('g');

    // Divide links by type
    const primaryLinks = graph.links.filter((l) => l.type === 'door');
    const secondaryLinks = this.renderSecondaryConnections
      ? graph.links.filter((l) => l.type === 'secondary')
      : [];

    // Function to create path
    const createPath = (d: RoomLink) => {
      const start = this.calculateLinkEndpoint(d.source, d.target, offsetX, offsetY);
      const end = this.calculateLinkEndpoint(d.target, d.source, offsetX, offsetY);

      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
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

  private renderNavigationGrid(
    navigationData: NavigationGridData,
    offsetX: number,
    offsetY: number
  ) {
    const { grid, cellSize } = navigationData;

    // Create a group for the grid
    const gridGroup = this.svg.append('g');

    // Render each cell
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        gridGroup
          .append('rect')
          .attr('x', x * cellSize + offsetX - cellSize / 2)
          .attr('y', y * cellSize + offsetY - cellSize / 2)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr(
            'fill',
            cell.walkable ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
          )
          .attr('stroke', 'rgba(0, 0, 0, 0.1)')
          .attr('stroke-width', 1);
      }
    }

    return gridGroup;
  }

  private renderStep() {
    if (!this.graph || !this.navigationData || !this.linkGroup) return;

    const { x: offsetX, y: offsetY } = this.calculateOffsets(this.graph);
    const allLinks = [...this.graph.links];
    const currentLink = allLinks[this.currentStep];

    if (!currentLink) return;

    // Skip secondary connections if disabled
    if (currentLink.type === 'secondary' && !this.renderSecondaryConnections) {
      return;
    }

    // Function to create path
    const createPath = (d: RoomLink) => {
      const start = this.calculateLinkEndpoint(d.source, d.target, offsetX, offsetY);
      const end = this.calculateLinkEndpoint(d.target, d.source, offsetX, offsetY);

      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    };

    // Render the current link
    this.linkGroup
      .append('path')
      .attr('class', currentLink.type)
      .attr('stroke', currentLink.type === 'door' ? 'black' : 'red')
      .attr('stroke-width', currentLink.type === 'door' ? 2 : 1)
      .attr('fill', 'none')
      .attr('stroke-dasharray', currentLink.type === 'secondary' ? '4,4' : 'none')
      .attr('d', createPath(currentLink));
  }

  public initializeRender(graph: DungeonGraph, navigationData: NavigationGridData): void {
    this.navigationData = navigationData;
    this.svg.selectAll('*').remove();
    this.graph = graph;
    this.currentStep = -1;

    const { x: offsetX, y: offsetY } = this.calculateOffsets(graph);

    // Render navigation grid
    this.gridGroup = this.renderNavigationGrid(navigationData, offsetX, offsetY);
    this.gridGroup.lower();

    // Render rooms
    this.renderRooms(graph, offsetX, offsetY);

    // Create empty link group for step-by-step rendering
    this.linkGroup = this.svg.append('g');
  }

  public nextStep(): boolean {
    if (!this.graph || this.currentStep >= this.graph.links.length - 1) {
      return false;
    }

    this.currentStep++;

    // Skip secondary connections if disabled
    if (
      this.renderSecondaryConnections === false &&
      this.graph.links[this.currentStep].type === 'secondary'
    ) {
      return this.nextStep();
    }

    this.renderStep();
    return true;
  }

  public previousStep(): boolean {
    if (!this.graph || this.currentStep <= 0) {
      return false;
    }

    // Remove the current step's rendering
    if (this.linkGroup) {
      this.linkGroup.selectAll('*').remove();
    }

    this.currentStep--;

    // Skip secondary connections if disabled
    if (
      this.renderSecondaryConnections === false &&
      this.graph.links[this.currentStep].type === 'secondary'
    ) {
      return this.previousStep();
    }

    // Re-render all steps up to the current one
    for (let i = 0; i <= this.currentStep; i++) {
      this.currentStep = i;
      this.renderStep();
    }

    return true;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getTotalSteps(): number {
    if (!this.graph) return 0;

    if (this.renderSecondaryConnections) {
      return this.graph.links.length;
    } else {
      return this.graph.links.filter(link => link.type !== 'secondary').length;
    }
  }

  public setRenderSecondaryConnections(render: boolean): void {
    this.renderSecondaryConnections = render;
  }

  render(graph: DungeonGraph, navigationData: NavigationGridData): void {
    // Initialize the render
    this.initializeRender(graph, navigationData);

    // Render all steps at once
    while (this.nextStep()) { }
  }

  renderDebug(graph: DungeonGraph, navigationData: NavigationGridData): void {
    this.render(graph, navigationData);
  }
}
