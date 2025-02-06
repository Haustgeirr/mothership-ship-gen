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

export class AStarGrid {
  private rows: number;
  private cols: number;
  private grid: GridCell[][];
  private debug: boolean = false;

  constructor(grid: GridCell[][]) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0]?.length || 0;
  }

  private heuristic(ax: number, ay: number, bx: number, by: number) {
    // Use diagonal distance - more accurate than Manhattan
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
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
    const baseCost = 1;
    const turnPenalty = 5000;
    const alignmentBonus = -2000;
    const diagonalPenalty = 3000;
    const straightLineBonus = -1500;

    if (!current.parent) {
      return baseCost;
    }

    const newDirection = this.getDirection(current.x, current.y, nextX, nextY);
    const currentDirection = this.getDirection(
      current.parent.x,
      current.parent.y,
      current.x,
      current.y
    );

    let cost = baseCost;
    let debugInfo: Record<string, number> = {};

    // Heavily penalize turns
    if (newDirection !== currentDirection) {
      cost += turnPenalty;
      debugInfo.turnPenalty = turnPenalty;
    } else {
      // Reward continuing in the same direction
      cost += straightLineBonus;
      debugInfo.straightLineBonus = straightLineBonus;
    }

    // Improved diagonal penalty calculation
    const dx = Math.abs(goalX - current.x);
    const dy = Math.abs(goalY - current.y);

    // If we're closer to being aligned with one axis, strongly prefer moving along that axis
    if (Math.abs(dx - dy) < 2) {
      // If roughly diagonal distance to goal
      if ((newDirection === 'right' || newDirection === 'left') && dy > 1) {
        cost += diagonalPenalty;
        debugInfo.diagonalPenalty = diagonalPenalty;
      }
      if ((newDirection === 'up' || newDirection === 'down') && dx > 1) {
        cost += diagonalPenalty;
        debugInfo.diagonalPenalty = diagonalPenalty;
      }
    } else {
      // If clearly closer to one axis, very strongly prefer that axis
      if (dx > dy) {
        if (newDirection !== 'left' && newDirection !== 'right') {
          cost += diagonalPenalty * 2;
          debugInfo.diagonalPenalty = diagonalPenalty * 2;
        }
      } else {
        if (newDirection !== 'up' && newDirection !== 'down') {
          cost += diagonalPenalty * 2;
          debugInfo.diagonalPenalty = diagonalPenalty * 2;
        }
      }
    }

    // Enhanced alignment bonus calculation
    if (
      this.isDirectionTowardsGoal(
        newDirection,
        current.x,
        current.y,
        goalX,
        goalY
      )
    ) {
      const alignmentStrength = Math.abs(dx - dy) / Math.max(dx, dy); // How well aligned we are
      const alignmentCost = alignmentBonus * alignmentStrength;
      cost += alignmentCost;
      debugInfo.alignmentBonus = alignmentCost;
    }

    if (this.debug) {
      console.log(
        `Move ${current.x},${current.y} -> ${nextX},${nextY} (${newDirection}):`,
        {
          currentDirection,
          newDirection,
          cost,
          penalties: debugInfo,
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
    this.debug = debug;

    if (debug) {
      console.log(
        `Finding path from (${startX},${startY}) to (${endX},${endY})`
      );
    }

    const open: AStarNode[] = [];
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
      // Sort by f-cost, then h-cost for ties
      open.sort((a, b) => {
        if (a.f === b.f) {
          return a.h - b.h; // Prefer nodes closer to goal
        }
        return a.f - b.f;
      });

      const current = open.shift()!;
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
          console.log(`Path found with ${path.length} steps`);
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

          console.log(`Path has ${turns} turns`);
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
