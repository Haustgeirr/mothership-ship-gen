import * as d3 from 'd3';

// Refined Room Node Type
export interface RoomNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

// Refined Link Type
export interface RoomLink extends d3.SimulationLinkDatum<RoomNode> {
  source: string | RoomNode; // Source room ID or reference
  target: string | RoomNode; // Target room ID or reference
  type: string;
}

// Dungeon Graph Interface
export interface DungeonGraph {
  rooms: RoomNode[];
  links: RoomLink[];
}

export class DungeonGenerator {
  graph: DungeonGraph;

  constructor() {
    this.graph = { rooms: [], links: [] };
  }

  // Add a new room to the graph
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

  // Add a new link between rooms
  addLink(source: string, target: string, type: string): RoomLink {
    const link: RoomLink = { source, target, type };
    this.graph.links.push(link);
    return link;
  }

  // Render the graph using D3
  render(svgElement: SVGSVGElement): void {
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove(); // Clear previous content

    const width = +svg.attr('width');
    const height = +svg.attr('height');

    const simulation = d3
      .forceSimulation(this.graph.rooms)
      .force(
        'link',
        d3
          .forceLink<RoomNode, RoomLink>(this.graph.links)
          .id((d: RoomNode) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Render Links
    const link = svg
      .append('g')
      .selectAll<SVGLineElement, RoomLink>('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    // Render Nodes
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
          .on(
            'start',
            (
              event: d3.D3DragEvent<SVGCircleElement, RoomNode, RoomNode>,
              d: RoomNode
            ) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            }
          )
          .on(
            'drag',
            (
              event: d3.D3DragEvent<SVGCircleElement, RoomNode, RoomNode>,
              d: RoomNode
            ) => {
              d.fx = event.x;
              d.fy = event.y;
            }
          )
          .on(
            'end',
            (
              event: d3.D3DragEvent<SVGCircleElement, RoomNode, RoomNode>,
              d: RoomNode
            ) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            }
          )
      );

    // Add tooltips to nodes
    node.append('title').text((d: RoomNode) => d.name);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: RoomLink) => (d.source as RoomNode).x!)
        .attr('y1', (d: RoomLink) => (d.source as RoomNode).y!)
        .attr('x2', (d: RoomLink) => (d.target as RoomNode).x!)
        .attr('y2', (d: RoomLink) => (d.target as RoomNode).y!);

      node.attr('cx', (d: RoomNode) => d.x!).attr('cy', (d: RoomNode) => d.y!);
    });
  }
}
