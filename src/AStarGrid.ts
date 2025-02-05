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
}

export class AStarGrid {
  private rows: number;
  private cols: number;
  private grid: GridCell[][];

  constructor(grid: GridCell[][]) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0]?.length || 0;
  }

  private heuristic(ax: number, ay: number, bx: number, by: number) {
    // Manhattan distance
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    debug: boolean = false
  ): Point[] {
    const open: AStarNode[] = [];
    const closed = new Set<string>();

    if (debug) {
      console.log('A* pathfinding:', {
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        gridSize: { rows: this.rows, cols: this.cols },
      });
    }

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
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

      if (debug) {
        console.log('Current node:', {
          x: current.x,
          y: current.y,
          g: current.g,
          h: current.h,
          f: current.f,
        });
      }

      // Goal check first
      if (current.x === endX && current.y === endY) {
        const path: Point[] = [];
        let node: typeof current | undefined = current;
        while (node) {
          path.push([node.x, node.y] as Point);
          node = node.parent;
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
          if (debug) {
            console.log('Skipping neighbor:', {
              x: nx,
              y: ny,
              reason:
                nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows
                  ? 'out of bounds'
                  : !this.grid[ny][nx].walkable
                  ? 'not walkable'
                  : 'already explored',
            });
          }
          continue;
        }

        const gCost = current.g + 1;
        const hCost = this.heuristic(nx, ny, endX, endY);
        const fCost = gCost + hCost;

        const existing = open.find((o) => o.x === nx && o.y === ny);
        if (!existing || gCost < existing.g) {
          // Add or update node
          if (existing) {
            existing.g = gCost;
            existing.f = fCost;
            existing.parent = current;
          } else {
            open.push({
              x: nx,
              y: ny,
              g: gCost,
              h: hCost,
              f: fCost,
              parent: current,
            });
          }
        }
      }
    }

    return [];
  }
}
