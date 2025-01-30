import * as d3 from 'd3';
import type { DungeonGraph, RoomNode, RoomLink } from './types';

interface NodeBounds {
  width: number;
  height: number;
  shape: 'circle' | 'rectangle';
}

export class DungeonRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private graph: DungeonGraph | null = null;

  private getNodeBounds(node: RoomNode): NodeBounds {
    return {
      width: node.size || 12, // Default to 12 if size not specified
      height: node.size || 12,
      shape: 'circle',
    };
  }

  private getConnectorBounds(link: RoomLink): NodeBounds {
    return {
      width: 6, // Connectors are always small
      height: 6,
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

    // Get all primary connections for this room
    const primaryDirections = new Set<number>();
    const links = (this.graph?.links || []).filter(
      (l) => (l.source === source || l.target === source) && l.type === 'door'
    );

    // Find the angles used by primary connections
    links.forEach((l) => {
      const otherNode = l.source === source ? l.target : l.source;
      const linkDx = otherNode.x - source.x;
      const linkDy = otherNode.y - source.y;
      if (Math.abs(linkDx) > Math.abs(linkDy)) {
        primaryDirections.add(linkDx > 0 ? 0 : Math.PI); // East or West
      } else {
        primaryDirections.add(linkDy > 0 ? Math.PI / 2 : -Math.PI / 2); // South or North
      }
    });

    // Calculate center of the dungeon
    const rooms = this.graph?.rooms || [];
    const centerX = d3.mean(rooms, (r) => r.x) || 0;
    const centerY = d3.mean(rooms, (r) => r.y) || 0;

    // Available cardinal directions
    const angles = [
      Math.PI / 2, // South
      -Math.PI / 2, // North
      0, // East
      Math.PI, // West
    ].filter((angle) => !primaryDirections.has(angle));

    // If no free directions, fall back to the original direction
    if (angles.length === 0) {
      if (Math.abs(dx) > Math.abs(dy)) {
        angles.push(dx > 0 ? 0 : Math.PI);
      } else {
        angles.push(dy > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }

    // Sort angles by:
    // 1. How well they point outward from center
    // 2. How well they match the target direction
    const targetAngle = Math.atan2(dy, dx);
    angles.sort((a, b) => {
      // Calculate endpoints for each angle
      const pointA = {
        x: source.x + Math.cos(a) * bounds.width,
        y: source.y + Math.sin(a) * bounds.width,
      };
      const pointB = {
        x: source.x + Math.cos(b) * bounds.width,
        y: source.y + Math.sin(b) * bounds.width,
      };

      // Calculate distances from center for each endpoint
      const distA = Math.sqrt(
        (pointA.x - centerX) ** 2 + (pointA.y - centerY) ** 2
      );
      const distB = Math.sqrt(
        (pointB.x - centerX) ** 2 + (pointB.y - centerY) ** 2
      );

      // Calculate how well each matches the target direction
      const targetScoreA = Math.abs(
        ((a - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
      );
      const targetScoreB = Math.abs(
        ((b - targetAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
      );

      // Combine scores - prefer greater distance from center and better target match
      const scoreA = distA - targetScoreA * 20;
      const scoreB = distB - targetScoreB * 20;

      return scoreB - scoreA; // Higher score first
    });

    const intersectDistance =
      bounds.shape === 'circle' ? bounds.width / 2 : bounds.width / 2;

    return {
      x: source.x + Math.cos(angles[0]) * intersectDistance,
      y: source.y + Math.sin(angles[0]) * intersectDistance,
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

  private renderLinks(graph: DungeonGraph, offsetX: number, offsetY: number) {
    const linkGroup = this.svg.append('g');
    const GRID_UNIT = 20; // Standard grid unit for offset

    linkGroup
      .selectAll<SVGPathElement, RoomLink>('path')
      .data(graph.links)
      .enter()
      .append('path')
      .attr('stroke', (d) => (d.type === 'door' ? 'black' : 'red'))
      .attr('stroke-width', (d) => (d.type === 'door' ? 2 : 1))
      .attr('fill', 'none')
      .attr('stroke-dasharray', (d) =>
        d.type === 'secondary' ? '4,4' : 'none'
      )
      .attr('d', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target),
          d
        );
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source),
          d
        );

        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // For secondary connections, check if nodes are collinear
        if (d.type === 'secondary') {
          // If nodes are horizontally aligned
          if (Math.abs(dy) < 1) {
            // Calculate center of the dungeon
            const rooms = this.graph?.rooms || [];
            const centerY = d3.mean(rooms, (r) => r.y) || 0;
            // Invert the offset direction to match connector preference
            const offsetDirection = start.y > centerY ? 1 : -1;

            return `M ${start.x + offsetX} ${start.y + offsetY}
                    V ${start.y + GRID_UNIT * offsetDirection + offsetY}
                    H ${end.x + offsetX}
                    V ${end.y + offsetY}`;
          }
          // If nodes are vertically aligned
          if (Math.abs(dx) < 1) {
            // Calculate center of the dungeon
            const rooms = this.graph?.rooms || [];
            const centerX = d3.mean(rooms, (r) => r.x) || 0;
            // Invert the offset direction to match connector preference
            const offsetDirection = start.x > centerX ? 1 : -1;

            return `M ${start.x + offsetX} ${start.y + offsetY}
                    H ${start.x + GRID_UNIT * offsetDirection + offsetX}
                    V ${end.y + offsetY}
                    H ${end.x + offsetX}`;
          }
        }

        // For non-collinear connections or primary connections, use the original logic
        const horizontalFirst = Math.abs(dx) > Math.abs(dy);

        if (horizontalFirst) {
          return `M ${start.x + offsetX} ${start.y + offsetY}
                  H ${end.x + offsetX}
                  V ${end.y + offsetY}`;
        } else {
          return `M ${start.x + offsetX} ${start.y + offsetY}
                  V ${end.y + offsetY}
                  H ${end.x + offsetX}`;
        }
      });

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
      .attr('fill', 'white')
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
      .attr('fill', 'white')
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
    return this.svg
      .append('g')
      .selectAll<SVGCircleElement, RoomNode>('circle')
      .data(graph.rooms)
      .enter()
      .append('circle')
      .attr('r', 6)
      .attr('fill', 'black')
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY)
      .append('title')
      .text((d: RoomNode) => `${d.name} (${d.id})`);
  }

  render(graph: DungeonGraph): void {
    this.svg.selectAll('*').remove();
    this.graph = graph; // Store the graph

    const { x: offsetX, y: offsetY } = this.calculateOffsets(graph);

    const linkGroup = this.renderLinks(graph, offsetX, offsetY);
    this.renderDoorConnectors(linkGroup, graph, offsetX, offsetY);
    this.renderSecondaryConnectors(linkGroup, graph, offsetX, offsetY);
    this.renderRooms(graph, offsetX, offsetY);
  }

  // Optional: Add debug rendering
  renderDebug(graph: DungeonGraph): void {
    this.render(graph);

    const svgWidth = +this.svg.attr('width');
    const svgHeight = +this.svg.attr('height');

    // Add room IDs as labels
    this.svg
      .append('g')
      .selectAll('text')
      .data(graph.rooms)
      .enter()
      .append('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y - 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text((d) => d.id);
  }
}
