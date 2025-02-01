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
    endY: number
  ): Point[] {
    const open: AStarNode[] = [];
    const closed = new Set<string>();

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
      // Sort or use a priority queue: picking the lowest f-cost node
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      closed.add(key(current.x, current.y));

      // Goal check
      if (current.x === endX && current.y === endY) {
        // Reconstruct path
        const path: Point[] = [];
        let node: typeof current | undefined = current;
        while (node) {
          path.push([node.x, node.y] as Point);
          node = node.parent;
        }
        return path.reverse();
      }

      // Explore neighbors (4-directional)
      const neighbors = [
        [current.x + 1, current.y],
        [current.x - 1, current.y],
        [current.x, current.y + 1],
        [current.x, current.y - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= this.cols ||
          ny >= this.rows ||
          !this.grid[ny][nx].walkable ||
          closed.has(key(nx, ny))
        ) {
          continue;
        }

        const gCost = current.g + 1; // Step cost is 1
        const hCost = this.heuristic(nx, ny, endX, endY);
        const fCost = gCost + hCost;
        const existing = open.find((o) => o.x === nx && o.y === ny);

        if (!existing) {
          open.push({
            x: nx,
            y: ny,
            g: gCost,
            h: hCost,
            f: fCost,
            parent: current,
          });
        } else if (gCost < existing.g) {
          existing.g = gCost;
          existing.f = fCost;
          existing.parent = current;
        }
      }
    }

    // No path found
    return [];
  }
}
