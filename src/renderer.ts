import * as d3 from 'd3';
import type { DungeonGraph, RoomNode, RoomLink } from './types';

export class DungeonRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

  constructor(svgElement: SVGSVGElement) {
    this.svg = d3.select(svgElement);
  }

  render(graph: DungeonGraph): void {
    this.svg.selectAll('*').remove();

    const svgWidth = +this.svg.attr('width');
    const svgHeight = +this.svg.attr('height');

    // Calculate dungeon bounding box
    const xExtent = d3.extent(graph.rooms, (d) => d.x) as [number, number];
    const yExtent = d3.extent(graph.rooms, (d) => d.y) as [number, number];

    const dungeonWidth = xExtent[1] - xExtent[0];
    const dungeonHeight = yExtent[1] - yExtent[0];

    const offsetX = (svgWidth - dungeonWidth) / 2 - xExtent[0];
    const offsetY = (svgHeight - dungeonHeight) / 2 - yExtent[0];

    // Helper functions to calculate bounds
    interface NodeBounds {
      width: number;
      height: number;
      shape: 'circle' | 'rectangle';
    }

    const getNodeBounds = (node: RoomNode): NodeBounds => ({
      width: node.size || 12, // Default to 12 if size not specified
      height: node.size || 12,
      shape: 'circle',
    });

    const getConnectorBounds = (link: RoomLink): NodeBounds => ({
      width: 6, // Connectors are always small
      height: 6,
      shape: link.type === 'door' ? 'circle' : 'rectangle',
    });

    const calculateEndpoint = (
      source: RoomNode,
      target: RoomNode,
      bounds: NodeBounds
    ) => {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      let intersectDistance: number;
      if (bounds.shape === 'circle') {
        // For circles, distance is always radius
        intersectDistance = bounds.width / 2;
      } else {
        // For rectangles, calculate intersection with bounding box
        // Using parametric form of line and rectangle intersection
        const w = bounds.width / 2;
        const h = bounds.height / 2;

        // Calculate distances to intersection with vertical and horizontal edges
        const tx = Math.abs(w / Math.cos(angle));
        const ty = Math.abs(h / Math.sin(angle));

        // Use the shorter distance
        intersectDistance = Math.min(tx, ty);
      }

      // Calculate the point that's intersectDistance units along the line
      const ratio = (distance - intersectDistance) / distance;
      return {
        x: source.x + dx * ratio,
        y: source.y + dy * ratio,
      };
    };

    // Draw links
    const linkGroup = this.svg.append('g');

    // Draw the lines first
    const links = linkGroup
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
        const start = calculateEndpoint(
          d.target,
          d.source,
          getNodeBounds(d.target)
        );
        return start.x + offsetX;
      })
      .attr('y1', (d) => {
        const start = calculateEndpoint(
          d.target,
          d.source,
          getNodeBounds(d.target)
        );
        return start.y + offsetY;
      })
      .attr('x2', (d) => {
        const end = calculateEndpoint(
          d.source,
          d.target,
          getNodeBounds(d.source)
        );
        return end.x + offsetX;
      })
      .attr('y2', (d) => {
        const end = calculateEndpoint(
          d.source,
          d.target,
          getNodeBounds(d.source)
        );
        return end.y + offsetY;
      });

    // Add connectors at link endpoints
    // Circles for doors
    linkGroup
      .selectAll<SVGCircleElement, RoomLink>('circle.connector')
      .data(graph.links.filter((d) => d.type === 'door'))
      .enter()
      .append('circle')
      .attr('class', 'connector')
      .attr('r', (d) => getConnectorBounds(d).width / 2)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('cx', (d) => {
        const start = calculateEndpoint(
          d.target,
          d.source,
          getNodeBounds(d.target)
        );
        return start.x + offsetX;
      })
      .attr('cy', (d) => {
        const start = calculateEndpoint(
          d.target,
          d.source,
          getNodeBounds(d.target)
        );
        return start.y + offsetY;
      });

    // Squares for secondary connections
    linkGroup
      .selectAll<SVGRectElement, RoomLink>('rect.connector')
      .data(graph.links.filter((d) => d.type === 'secondary'))
      .enter()
      .append('rect')
      .attr('class', 'connector')
      .attr('width', (d) => getConnectorBounds(d).width)
      .attr('height', (d) => getConnectorBounds(d).height)
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('x', (d) => {
        const start = calculateEndpoint(
          d.target,
          d.source,
          getNodeBounds(d.target)
        );
        return start.x + offsetX - getConnectorBounds(d).width / 2;
      })
      .attr('y', (d) => {
        const start = calculateEndpoint(
          d.target,
          d.source,
          getNodeBounds(d.target)
        );
        return start.y + offsetY - getConnectorBounds(d).height / 2;
      });

    // Add connectors at link endpoints (target side)
    // Circles for doors
    linkGroup
      .selectAll<SVGCircleElement, RoomLink>('circle.connector-target')
      .data(graph.links.filter((d) => d.type === 'door'))
      .enter()
      .append('circle')
      .attr('class', 'connector-target')
      .attr('r', (d) => getConnectorBounds(d).width / 2)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('cx', (d) => {
        const end = calculateEndpoint(
          d.source,
          d.target,
          getNodeBounds(d.source)
        );
        return end.x + offsetX;
      })
      .attr('cy', (d) => {
        const end = calculateEndpoint(
          d.source,
          d.target,
          getNodeBounds(d.source)
        );
        return end.y + offsetY;
      });

    // Squares for secondary connections
    linkGroup
      .selectAll<SVGRectElement, RoomLink>('rect.connector-target')
      .data(graph.links.filter((d) => d.type === 'secondary'))
      .enter()
      .append('rect')
      .attr('class', 'connector-target')
      .attr('width', (d) => getConnectorBounds(d).width)
      .attr('height', (d) => getConnectorBounds(d).height)
      .attr('fill', 'red')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('x', (d) => {
        const end = calculateEndpoint(
          d.source,
          d.target,
          getNodeBounds(d.source)
        );
        return end.x + offsetX - getConnectorBounds(d).width / 2;
      })
      .attr('y', (d) => {
        const end = calculateEndpoint(
          d.source,
          d.target,
          getNodeBounds(d.source)
        );
        return end.y + offsetY - getConnectorBounds(d).height / 2;
      });

    // // Draw nodes
    const nodes = this.svg
      .append('g')
      .selectAll<SVGCircleElement, RoomNode>('circle')
      .data(graph.rooms)
      .enter()
      .append('circle')
      .attr('r', 6)
      .attr('fill', 'black')
      .attr('cx', (d) => d.x + offsetX)
      .attr('cy', (d) => d.y + offsetY);

    // Add tooltips
    nodes.append('title').text((d: RoomNode) => `${d.name} (${d.id})`);
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
