import * as d3 from 'd3';

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface Link {
  source: string;
  target: string;
  type: string;
}

export interface DungeonGraph {
  rooms: Room[];
  links: Link[];
}

export class DungeonGenerator {
  graph: DungeonGraph;

  constructor() {
    this.graph = { rooms: [], links: [] };
  }

  addRoom(name: string, x: number, y: number): Room {
    const room: Room = { id: `room-${this.graph.rooms.length}`, name, x, y };
    this.graph.rooms.push(room);
    return room;
  }

  addLink(source: string, target: string, type: string): Link {
    const link: Link = { source, target, type };
    this.graph.links.push(link);
    return link;
  }

  render(svgElement: SVGSVGElement) {
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove(); // Clear previous content

    const width = +svg.attr('width');
    const height = +svg.attr('height');

    const simulation = d3
      .forceSimulation(this.graph.rooms)
      .force(
        'link',
        d3
          .forceLink(this.graph.links)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    // Nodes
    const node = svg
      .append('g')
      .selectAll('circle')
      .data(this.graph.rooms)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'blue')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node.append('title').text((d) => d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
    });
  }
}
