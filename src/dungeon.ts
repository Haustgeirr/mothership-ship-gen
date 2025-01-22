import * as d3 from 'd3';

export interface RoomNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface RoomLink extends d3.SimulationLinkDatum<RoomNode> {
  source: string | RoomNode;
  target: string | RoomNode;
  type: string;
}

export interface DungeonGraph {
  rooms: RoomNode[];
  links: RoomLink[];
}

export class DungeonGenerator {
  graph: DungeonGraph;

  constructor() {
    this.graph = { rooms: [], links: [] };
  }

  addRoom(name: string, x: number, y: number): RoomNode {
    const room: RoomNode = {
      id: `room-${this.graph.rooms.length}`,
      name,
      x,
      y,
    };
    this.graph.rooms.push(room);
    return room;
  }

  addLink(source: string, target: string, type: string): RoomLink {
    const link: RoomLink = { source, target, type };
    this.graph.links.push(link);
    return link;
  }

  render(svgElement: SVGSVGElement): void {
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const width = +svg.attr('width');
    const height = +svg.attr('height');

    const simulation = d3
      .forceSimulation(this.graph.rooms)
      .force(
        'link',
        d3
          .forceLink<RoomNode, RoomLink>(this.graph.links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append('g')
      .selectAll<SVGLineElement, RoomLink>('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    const node = svg
      .append('g')
      .selectAll<SVGCircleElement, RoomNode>('circle')
      .data(this.graph.rooms)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'blue')
      .call(
        d3
          .drag<SVGCircleElement, RoomNode>()
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
        .attr('x1', (d) => (d.source as RoomNode).x!)
        .attr('y1', (d) => (d.source as RoomNode).y!)
        .attr('x2', (d) => (d.target as RoomNode).x!)
        .attr('y2', (d) => (d.target as RoomNode).y!);

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
    });
  }
}
