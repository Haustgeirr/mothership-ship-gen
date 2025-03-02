export type GridCell = {
  walkable: boolean;
};

type Point = [number, number];

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: AStarNode;
  direction?: string;
}

// Direction constants
export enum Direction {
  NONE = 'none',
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

// Cost configuration interface for flexible path preferences
export interface PathCostConfig {
  baseCost: number;
  turnPenaltyMultiplier: number;
  wrongDirectionMultiplier: number;
  cardinalChangeMultiplier: number;
  nonPrimaryDirectionMultiplier: number;
  initialNonPrimaryMultiplier: number;
}

// Default cost configuration
const DEFAULT_COST_CONFIG: PathCostConfig = {
  baseCost: 1000,
  turnPenaltyMultiplier: 4,
  wrongDirectionMultiplier: 8,
  cardinalChangeMultiplier: 3,
  nonPrimaryDirectionMultiplier: 2,
  initialNonPrimaryMultiplier: 5
};

// Priority Queue implementation optimized for A* pathfinding
class PriorityQueue<T extends { f: number; h: number }> {
  private items: T[] = [];
  private nodeMap = new Map<string, number>();

  constructor() { }

  // Generate a unique key for a node
  private getNodeKey(item: any): string {
    if ('x' in item && 'y' in item) {
      return `${item.x},${item.y}`;
    }
    return JSON.stringify(item);
  }

  public push(item: T): void {
    const index = this.items.length;
    this.items.push(item);
    this.nodeMap.set(this.getNodeKey(item), index);
    this.bubbleUp(index);
  }

  public pop(): T | undefined {
    if (this.items.length === 0) return undefined;

    const result = this.items[0];
    const last = this.items.pop()!;
    this.nodeMap.delete(this.getNodeKey(result));

    if (this.items.length > 0) {
      this.items[0] = last;
      this.nodeMap.set(this.getNodeKey(last), 0);
      this.bubbleDown(0);
    }

    return result;
  }

  public get length(): number {
    return this.items.length;
  }

  private bubbleUp(index: number): void {
    const item = this.items[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) break;

      // Swap items
      [this.items[parentIndex], this.items[index]] =
        [this.items[index], this.items[parentIndex]];

      // Update map
      this.nodeMap.set(this.getNodeKey(this.items[parentIndex]), parentIndex);
      this.nodeMap.set(this.getNodeKey(this.items[index]), index);

      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.items.length &&
        this.compare(this.items[leftChild], this.items[smallest]) < 0) {
        smallest = leftChild;
      }

      if (rightChild < this.items.length &&
        this.compare(this.items[rightChild], this.items[smallest]) < 0) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      // Swap items
      [this.items[index], this.items[smallest]] =
        [this.items[smallest], this.items[index]];

      // Update map
      this.nodeMap.set(this.getNodeKey(this.items[index]), index);
      this.nodeMap.set(this.getNodeKey(this.items[smallest]), smallest);

      index = smallest;
    }
  }

  private compare(a: T, b: T): number {
    // Primary sort by f-cost
    if (a.f !== b.f) return a.f - b.f;
    // Secondary sort by h-cost to prefer nodes closer to goal
    return a.h - b.h;
  }

  public find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  public contains(x: number, y: number): boolean {
    return this.nodeMap.has(`${x},${y}`);
  }

  public getNode(x: number, y: number): T | undefined {
    const index = this.nodeMap.get(`${x},${y}`);
    return index !== undefined ? this.items[index] : undefined;
  }

  public update(item: T): void {
    const key = this.getNodeKey(item);
    const index = this.nodeMap.get(key);

    if (index !== undefined) {
      // Update the item in place
      this.items[index] = item;

      // Reheapify
      this.bubbleUp(index);
      this.bubbleDown(index);
    }
  }
}

export class AStarGrid {
  private rows: number;
  private cols: number;
  private grid: GridCell[][];
  private debug: boolean;
  private costConfig: PathCostConfig;

  constructor(
    grid: GridCell[][],
    costConfig: Partial<PathCostConfig> = {},
    debug: boolean = false
  ) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0]?.length || 0;
    this.debug = debug;
    this.costConfig = { ...DEFAULT_COST_CONFIG, ...costConfig };
  }

  /**
   * Manhattan distance heuristic - optimized for cardinal movements
   * This is more appropriate than diagonal distance when only cardinal moves are allowed
   */
  private heuristic(ax: number, ay: number, bx: number, by: number): number {
    // Pure Manhattan distance for cardinal movement
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  /**
   * Get cardinal direction from one point to another
   */
  private getDirection(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Direction {
    if (toX > fromX) return Direction.RIGHT;
    if (toX < fromX) return Direction.LEFT;
    if (toY > fromY) return Direction.DOWN;
    if (toY < fromY) return Direction.UP;
    return Direction.NONE;
  }

  /**
   * Determine if a direction is towards the goal
   */
  private isDirectionTowardsGoal(
    direction: Direction,
    currentX: number,
    currentY: number,
    goalX: number,
    goalY: number
  ): boolean {
    const dx = goalX - currentX;
    const dy = goalY - currentY;

    switch (direction) {
      case Direction.RIGHT:
        return dx > 0;
      case Direction.LEFT:
        return dx < 0;
      case Direction.DOWN:
        return dy > 0;
      case Direction.UP:
        return dy < 0;
      default:
        return false;
    }
  }

  /**
   * Calculate movement cost with configurable penalties
   */
  private calculateMovementCost(
    current: AStarNode,
    nextX: number,
    nextY: number,
    goalX: number,
    goalY: number
  ): number {
    const {
      baseCost,
      turnPenaltyMultiplier,
      wrongDirectionMultiplier,
      cardinalChangeMultiplier,
      nonPrimaryDirectionMultiplier,
      initialNonPrimaryMultiplier
    } = this.costConfig;

    // Calculate primary direction to goal
    const dx = goalX - current.x;
    const dy = goalY - current.y;
    const isHorizontalPrimary = Math.abs(dx) > Math.abs(dy);

    // Calculate movement direction
    const moveX = nextX - current.x;
    const moveY = nextY - current.y;
    const currentDirection = this.getDirection(current.x, current.y, nextX, nextY);

    let cost = baseCost;
    const penalties: { reason: string, amount: number }[] = [];

    // If this is the first move from the start node
    if (!current.parent) {
      // Encourage initial movement in primary direction
      if ((isHorizontalPrimary && moveY !== 0) || (!isHorizontalPrimary && moveX !== 0)) {
        const penalty = baseCost * (initialNonPrimaryMultiplier - 1);
        cost += penalty;
        penalties.push({ reason: 'Initial non-primary direction', amount: penalty });
      }

      return cost;
    }

    // Get previous movement
    const prevMoveX = current.x - current.parent.x;
    const prevMoveY = current.y - current.parent.y;
    const prevDirection = current.direction as Direction;

    // Apply penalties

    // 1. Penalize direction changes
    if (currentDirection !== prevDirection && prevDirection !== Direction.NONE) {
      const turnPenalty = baseCost * turnPenaltyMultiplier;
      cost += turnPenalty;
      penalties.push({ reason: 'Direction change', amount: turnPenalty });

      // Extra penalty for changing cardinal direction (e.g., horizontal to vertical)
      const isCurrentHorizontal = moveX !== 0;
      const isPrevHorizontal = prevMoveX !== 0;

      if (isCurrentHorizontal !== isPrevHorizontal) {
        const cardinalPenalty = baseCost * cardinalChangeMultiplier;
        cost += cardinalPenalty;
        penalties.push({ reason: 'Cardinal direction change', amount: cardinalPenalty });
      }
    }

    // 2. Penalize moving away from goal
    if (!this.isDirectionTowardsGoal(currentDirection, current.x, current.y, goalX, goalY)) {
      const wrongDirPenalty = baseCost * wrongDirectionMultiplier;
      cost += wrongDirPenalty;
      penalties.push({ reason: 'Moving away from goal', amount: wrongDirPenalty });
    }

    // 3. Penalize non-primary direction movement when far from goal
    const distanceToGoal = Math.abs(dx) + Math.abs(dy);
    if (distanceToGoal > 2) {
      if ((isHorizontalPrimary && moveY !== 0) || (!isHorizontalPrimary && moveX !== 0)) {
        const nonPrimaryPenalty = baseCost * nonPrimaryDirectionMultiplier;
        cost += nonPrimaryPenalty;
        penalties.push({ reason: 'Non-primary direction movement', amount: nonPrimaryPenalty });
      }
    }

    return cost;
  }

  /**
   * Find a path from start to end using A* algorithm
   */
  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    debug: boolean = false,
    isSecondary: boolean = false
  ): Point[] {
    // Log path start information
    if (isSecondary) {
      console.log(`\n=== Finding Secondary Path ===`);
      console.log(`From: (${startX}, ${startY}) To: (${endX}, ${endY})`);
    }

    const open = new PriorityQueue<AStarNode>();
    const closed = new Set<string>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
      direction: Direction.NONE,
    };
    startNode.f = startNode.g + startNode.h;
    open.push(startNode);

    const key = (x: number, y: number) => `${x},${y}`;
    let iterations = 0;
    let maxIterations = 1000; // Safety limit

    while (open.length > 0 && iterations < maxIterations) {
      iterations++;
      const current = open.pop()!;
      const currentKey = key(current.x, current.y);

      // Goal check first
      if (current.x === endX && current.y === endY) {
        const path: Point[] = [];
        let node: typeof current | undefined = current;
        while (node) {
          path.push([node.x, node.y] as Point);
          node = node.parent;
        }

        // Reverse path to get start-to-end order
        const finalPath = path.reverse();

        if (isSecondary) {
          // Log the final path for secondary links
          console.log(`Path found with ${finalPath.length} points after ${iterations} iterations`);

          // Count turns in the path
          let turns = 0;
          let lastDirection = Direction.NONE;

          for (let i = 1; i < finalPath.length; i++) {
            const direction = this.getDirection(
              finalPath[i - 1][0],
              finalPath[i - 1][1],
              finalPath[i][0],
              finalPath[i][1]
            );
            if (lastDirection !== Direction.NONE && direction !== lastDirection) {
              turns++;
            }
            lastDirection = direction;
          }

          console.log(`Path has ${turns} turns`);

          // Log path points in a more readable format
          console.log("Path coordinates:");
          let pathStr = "";
          finalPath.forEach((point, index) => {
            pathStr += `(${point[0]},${point[1]})`;
            if (index < finalPath.length - 1) {
              pathStr += " → ";
              // Add line breaks for readability
              if ((index + 1) % 5 === 0) {
                pathStr += "\n";
              }
            }
          });
          console.log(pathStr);
          console.log(`=== End of Path ===\n`);
        }

        return finalPath;
      }

      closed.add(currentKey);

      // Explore neighbors - only cardinal directions (no diagonals)
      let neighbors: [number, number][];

      if (isSecondary) {
        // For secondary links, prioritize neighbors based on direction to goal
        const dx = endX - current.x;
        const dy = endY - current.y;

        // Determine primary and secondary directions
        const primaryDirs: [number, number][] = [];
        const secondaryDirs: [number, number][] = [];

        if (Math.abs(dx) >= Math.abs(dy)) {
          // Horizontal is primary
          if (dx > 0) primaryDirs.push([current.x + 1, current.y]);
          else if (dx < 0) primaryDirs.push([current.x - 1, current.y]);

          if (dy > 0) secondaryDirs.push([current.x, current.y + 1]);
          else if (dy < 0) secondaryDirs.push([current.x, current.y - 1]);
        } else {
          // Vertical is primary
          if (dy > 0) primaryDirs.push([current.x, current.y + 1]);
          else if (dy < 0) primaryDirs.push([current.x, current.y - 1]);

          if (dx > 0) secondaryDirs.push([current.x + 1, current.y]);
          else if (dx < 0) secondaryDirs.push([current.x - 1, current.y]);
        }

        // Add opposite directions last
        if (dx <= 0) secondaryDirs.push([current.x + 1, current.y]);
        if (dx >= 0) secondaryDirs.push([current.x - 1, current.y]);
        if (dy <= 0) secondaryDirs.push([current.x, current.y + 1]);
        if (dy >= 0) secondaryDirs.push([current.x, current.y - 1]);

        // Combine directions with primary first
        neighbors = [...primaryDirs, ...secondaryDirs];

        // Remove duplicates
        neighbors = [...new Map(neighbors.map(n => [n.toString(), n])).values()];
      } else {
        // Standard neighbor exploration for primary links
        neighbors = [
          [current.x + 1, current.y], // right
          [current.x - 1, current.y], // left
          [current.x, current.y + 1], // down
          [current.x, current.y - 1], // up
        ];
      }

      for (const [nx, ny] of neighbors) {
        const neighborKey = key(nx, ny);

        // Skip invalid or closed nodes
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= this.cols ||
          ny >= this.rows ||
          !this.grid[ny][nx].walkable ||
          closed.has(neighborKey)
        ) {
          continue;
        }

        // Calculate costs
        const movementCost = this.calculateMovementCost(
          current,
          nx,
          ny,
          endX,
          endY
        );
        const gCost = current.g + movementCost;
        const hCost = this.heuristic(nx, ny, endX, endY);
        const fCost = gCost + hCost;
        const direction = this.getDirection(current.x, current.y, nx, ny);

        // Check if node is in open list
        const existing = open.getNode(nx, ny);

        if (!existing) {
          // Add new node to open list
          open.push({
            x: nx,
            y: ny,
            g: gCost,
            h: hCost,
            f: fCost,
            parent: current,
            direction,
          });
        } else if (gCost < existing.g) {
          // Update existing node if we found a better path
          existing.g = gCost;
          existing.f = fCost;
          existing.parent = current;
          existing.direction = direction;
          open.update(existing);
        }
      }
    }

    if (debug) {
      console.warn(`No path found after ${iterations} iterations or max iterations reached`);
    }

    // No path found
    return [];
  }
}
