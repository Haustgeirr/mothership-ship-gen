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

// Priority Queue implementation optimized for A* pathfinding
class PriorityQueue<T extends { f: number; h: number }> {
  private items: T[] = [];

  public push(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  public pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    
    const result = this.items[0];
    const last = this.items.pop()!;
    
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    
    return result;
  }

  public get length(): number {
    return this.items.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) break;
      
      [this.items[parentIndex], this.items[index]] = 
      [this.items[index], this.items[parentIndex]];
      
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

      [this.items[index], this.items[smallest]] = 
      [this.items[smallest], this.items[index]];
      
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

  public update(item: T): void {
    const index = this.items.findIndex(i => i === item);
    if (index !== -1) {
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

  constructor(grid: GridCell[][], debug: boolean = false) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0]?.length || 0;
    this.debug = debug;
  }

  private heuristic(ax: number, ay: number, bx: number, by: number) {
    // Modified heuristic that heavily favors cardinal movements
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    
    // Base cost is Manhattan distance
    const baseCost = dx + dy;
    
    // Add a small penalty for situations that might require diagonal movement
    // This helps maintain cardinal preference while still allowing diagonal when necessary
    const diagonalPotentialPenalty = Math.min(dx, dy) * 0.001;
    
    return baseCost + diagonalPotentialPenalty;
  }

  private getDirection(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): string {
    if (toX > fromX) return 'right';
    if (toX < fromX) return 'left';
    if (toY > fromY) return 'down';
    if (toY < fromY) return 'up';
    return 'none';
  }

  private isDirectionTowardsGoal(
    direction: string,
    currentX: number,
    currentY: number,
    goalX: number,
    goalY: number
  ): boolean {
    const dx = goalX - currentX;
    const dy = goalY - currentY;

    switch (direction) {
      case 'right':
        return dx > 0 && Math.abs(dx) > Math.abs(dy);
      case 'left':
        return dx < 0 && Math.abs(dx) > Math.abs(dy);
      case 'down':
        return dy > 0 && Math.abs(dy) > Math.abs(dx);
      case 'up':
        return dy < 0 && Math.abs(dy) > Math.abs(dx);
      default:
        return false;
    }
  }

  private calculateMovementCost(
    current: AStarNode,
    nextX: number,
    nextY: number,
    goalX: number,
    goalY: number
  ): number {
    // Base movement cost
    const baseCost = 1000;
    
    // Calculate primary direction to goal
    const dx = goalX - current.x;
    const dy = goalY - current.y;
    const isHorizontalPrimary = Math.abs(dx) > Math.abs(dy);
    
    // Calculate movement direction
    const moveX = nextX - current.x;
    const moveY = nextY - current.y;

    let cost = baseCost;

    // If this is the first move from the start node
    if (!current.parent) {
      // Strongly encourage initial movement in primary direction
      if (isHorizontalPrimary && moveY !== 0) {
        cost *= 10; // Heavy penalty for not moving in primary direction
      } else if (!isHorizontalPrimary && moveX !== 0) {
        cost *= 10;
      }
      return cost;
    }

    // Get previous movement
    const prevMoveX = current.x - current.parent.x;
    const prevMoveY = current.y - current.parent.y;

    // Penalties
    const turnPenalty = baseCost * 8;        // Penalty for changing direction
    const wrongDirPenalty = baseCost * 12;   // Penalty for moving away from goal
    const directionChangePenalty = baseCost * 5; // Penalty for changing cardinal direction

    // Penalize direction changes
    if (moveX !== prevMoveX || moveY !== prevMoveY) {
      cost += turnPenalty;
      
      // Extra penalty for changing cardinal direction
      if ((prevMoveX !== 0 && moveY !== 0) || (prevMoveY !== 0 && moveX !== 0)) {
        cost += directionChangePenalty;
      }
    }

    // Penalize moving away from goal
    if ((dx > 0 && moveX < 0) || (dx < 0 && moveX > 0)) {
      cost += wrongDirPenalty;
    }
    if ((dy > 0 && moveY < 0) || (dy < 0 && moveY > 0)) {
      cost += wrongDirPenalty;
    }

    // Penalize non-primary direction movement more when far from goal
    const distanceToGoal = Math.abs(dx) + Math.abs(dy);
    if (distanceToGoal > 2) {
      if (isHorizontalPrimary && moveY !== 0) {
        cost += baseCost * 3;
      } else if (!isHorizontalPrimary && moveX !== 0) {
        cost += baseCost * 3;
      }
    }

    if (this.debug) {
      console.log(
        `Move ${current.x},${current.y} -> ${nextX},${nextY}:`,
        {
          cost,
          isHorizontalPrimary,
          dx,
          dy,
          moveX,
          moveY,
          distanceToGoal
        }
      );
    }

    return cost;
  }

  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    debug: boolean = false
  ): Point[] {
    const open = new PriorityQueue<AStarNode>();
    const closed = new Set<string>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
      direction: 'none',
    };
    startNode.f = startNode.g + startNode.h;
    open.push(startNode);

    const key = (x: number, y: number) => `${x},${y}`;

    while (open.length > 0) {
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
        if (debug && path.length > 0) {
          let turns = 0;
          let lastDirection = '';

          for (let i = 1; i < path.length; i++) {
            const direction = this.getDirection(
              path[i - 1][0],
              path[i - 1][1],
              path[i][0],
              path[i][1]
            );
            if (lastDirection && direction !== lastDirection) {
              turns++;
            }
            lastDirection = direction;
          }
        }
        return path.reverse();
      }

      closed.add(currentKey);

      // Explore neighbors
      const neighbors = [
        [current.x + 1, current.y],
        [current.x - 1, current.y],
        [current.x, current.y + 1],
        [current.x, current.y - 1],
      ];

      for (const [nx, ny] of neighbors) {
        const neighborKey = key(nx, ny);

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

        const existing = open.find((o) => o.x === nx && o.y === ny);
        if (!existing || gCost < existing.g) {
          const direction = this.getDirection(current.x, current.y, nx, ny);
          if (existing) {
            existing.g = gCost;
            existing.f = fCost;
            existing.parent = current;
            existing.direction = direction;
            open.update(existing);
          } else {
            open.push({
              x: nx,
              y: ny,
              g: gCost,
              h: hCost,
              f: fCost,
              parent: current,
              direction: direction,
            });
          }
        }
      }
    }

    return [];
  }
}
