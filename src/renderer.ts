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

    // Draw links
    const links = this.svg
      .append('g')
      .selectAll<SVGLineElement, RoomLink>('line')
      .data(graph.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => (d.type === 'door' ? 'black' : 'red'))
      .attr('stroke-width', (d) => (d.type === 'door' ? 2 : 1))
      .attr('stroke-dasharray', (d) =>
        d.type === 'secondary' ? '4,4' : 'none'
      )
      .attr('x1', (d) => d.source.x + offsetX)
      .attr('y1', (d) => d.source.y + offsetY)
      .attr('x2', (d) => d.target.x + offsetX)
      .attr('y2', (d) => d.target.y + offsetY);

    // Draw nodes
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
