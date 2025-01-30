import * as d3 from 'd3';
import type { DungeonGraph, RoomNode, RoomLink } from './types';

interface NodeBounds {
  width: number;
  height: number;
  shape: 'circle' | 'rectangle';
}

export class DungeonRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

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
    bounds: NodeBounds
  ) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Determine the dominant direction and snap to cardinal
    let angle: number;
    if (Math.abs(dx) > Math.abs(dy)) {
      // East or West
      angle = dx > 0 ? 0 : Math.PI; // 0 for East, PI for West
    } else {
      // North or South
      angle = dy > 0 ? Math.PI / 2 : -Math.PI / 2; // PI/2 for South, -PI/2 for North
    }

    let intersectDistance: number;
    if (bounds.shape === 'circle') {
      intersectDistance = bounds.width / 2;
    } else {
      // For rectangles, we now know it's exactly width/2 or height/2
      // depending on the cardinal direction
      intersectDistance =
        Math.abs(Math.cos(angle)) > 0
          ? bounds.width / 2 // East/West
          : bounds.height / 2; // North/South
    }

    // Calculate the endpoint using the snapped angle
    return {
      x: source.x + Math.cos(angle) * intersectDistance,
      y: source.y + Math.sin(angle) * intersectDistance,
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

    // Draw the lines first
    linkGroup
      .selectAll<SVGLineElement, RoomLink>('line')
      .data(graph.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => (d.type === 'door' ? 'black' : 'red'))
      .attr('stroke-width', (d) => (d.type === 'door' ? 2 : 1))
      .attr('stroke-dasharray', (d) =>
        d.type === 'secondary' ? '4,4' : 'none'
      )
      .attr('x1', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target)
        );
        return start.x + offsetX;
      })
      .attr('y1', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target)
        );
        return start.y + offsetY;
      })
      .attr('x2', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source)
        );
        return end.x + offsetX;
      })
      .attr('y2', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source)
        );
        return end.y + offsetY;
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
          this.getNodeBounds(d.target)
        );
        return start.x + offsetX;
      })
      .attr('cy', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target)
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
          this.getNodeBounds(d.source)
        );
        return end.x + offsetX;
      })
      .attr('cy', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source)
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
          this.getNodeBounds(d.target)
        );
        return start.x + offsetX - this.getConnectorBounds(d).width / 2;
      })
      .attr('y', (d) => {
        const start = this.calculateEndpoint(
          d.target,
          d.source,
          this.getNodeBounds(d.target)
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
          this.getNodeBounds(d.source)
        );
        return end.x + offsetX - this.getConnectorBounds(d).width / 2;
      })
      .attr('y', (d) => {
        const end = this.calculateEndpoint(
          d.source,
          d.target,
          this.getNodeBounds(d.source)
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
