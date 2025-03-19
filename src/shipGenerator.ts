import type {
    DungeonGraph,
    RoomNode,
    RoomLink,
    GenerationConfig,
    RoomType
} from './types';
import { Dice } from './dice';
import type { GridCell } from './AStarGrid';
import { DUNGEON_CONSTANTS } from './constants';
import { RoomAssigner } from './roomAssignment';

/**
 * ShipGenerator - Creates ship layouts with rooms in a grid pattern
 * Each deck is arranged vertically, with rooms placed adjacently in a
 * spaceship-like configuration.
 */
export class ShipGenerator {
    private cellSize: number;
    private shipWidth: number = 11; // Fixed width of 11 cells
    private shipHeight: number = 0;
    private graph: DungeonGraph = { rooms: [], links: [] };
    private grid: boolean[][] = []; // true if cell is occupied
    private shipTypeName: string = "Default"; // Store the ship type name for room type assignment
    private roomTypes: RoomType[] = []; // Store assigned room types

    constructor() {
        this.cellSize = DUNGEON_CONSTANTS.CELL_SIZE;
    }

    /**
     * Creates a room at the specified grid coordinates
     */
    private createRoom(id: number, x: number, y: number, type?: RoomType): RoomNode {
        // Use the provided room type or get the next one from the roomTypes array
        const roomType = type || (this.roomTypes.length > id - 1 ? this.roomTypes[id - 1] : undefined);

        // Generate a name based on room type if available
        const roomName = roomType ? `${roomType} ${id}` : `Room ${id}`;

        return {
            id: id,
            x: x * this.cellSize,
            y: y * this.cellSize,
            name: roomName,
            type: roomType,
        };
    }

    /**
     * Checks if a grid position is occupied
     */
    private isPositionOccupied(x: number, y: number): boolean {
        // Check if position is out of bounds
        if (x < 0 || x >= this.shipWidth || y < 0 || y >= this.shipHeight) {
            return true;
        }

        return this.grid[y][x];
    }

    /**
     * Creates a link between two rooms
     */
    private createLink(
        source: RoomNode,
        target: RoomNode,
        type: 'door' | 'secondary'
    ): RoomLink {
        return { source, target, type };
    }

    /**
     * Gets valid adjacent positions (up, down, left, right) for a room
     */
    private getValidAdjacentPositions(x: number, y: number): { x: number, y: number }[] {
        const directions = [
            { x: 0, y: -1 }, // North
            { x: 0, y: 1 },  // South
            { x: 1, y: 0 },  // East
            { x: -1, y: 0 }, // West
        ];

        return directions
            .map(dir => ({ x: x + dir.x, y: y + dir.y }))
            .filter(pos => !this.isPositionOccupied(pos.x, pos.y));
    }

    /**
     * Generates a ship layout based on configuration
     */
    generate(config: GenerationConfig): DungeonGraph {
        const {
            numRooms,
            dungeonWidth,
            dungeonHeight,
            minSecondaryLinks = 1,
            maxSecondaryLinks = Math.ceil(numRooms * 0.3),
            numDecks = 1,
            roomsPerDeck = 0,
            roomsPerDeckArray = [],
            shipTypeName = this.shipTypeName, // Use the ship type name from config or instance
        } = config;

        // Store the ship type name for room type assignment
        this.shipTypeName = shipTypeName;

        // Pre-generate room types based on the ship type
        this.roomTypes = RoomAssigner.assignRoomTypesForShip(this.shipTypeName, numRooms);

        // Store ship dimensions - height is still dynamic, width is fixed at 11
        // this.shipWidth is now defined as a fixed 11 cells at class level
        this.shipHeight = Math.ceil(dungeonHeight / this.cellSize);

        // Initialize grid with all cells unoccupied
        this.grid = Array(this.shipHeight)
            .fill(null)
            .map(() => Array(this.shipWidth).fill(false));

        this.graph = {
            rooms: [],
            links: [],
        };

        let roomId = 1;

        // If we want a structured ship with multiple rooms per deck
        if (numDecks > 0 && (roomsPerDeck > 0 || roomsPerDeckArray.length > 0)) {
            // Create a structured layout with multiple rooms per deck
            // Create deck by deck

            // Define a central "spine" position that will be consistent across all decks
            const spineX = Math.floor(this.shipWidth / 2);

            for (let deck = 0; deck < numDecks; deck++) {
                const deckY = deck; // Start at y=0 (no bridge at the top)

                // Get number of rooms for this deck - either from array or use default
                const roomsThisDeck = roomsPerDeckArray[deck] !== undefined
                    ? roomsPerDeckArray[deck]
                    : Math.min(roomsPerDeck, this.shipWidth - 2); // Make sure rooms fit in width

                // First, determine a starting position that ensures:
                // 1. At least one room will be at the spine (position 5)
                // 2. All rooms fit within the grid (0-10)
                // 3. Rooms can start at position 0 or end at position 10

                let finalStartX;

                // Create a range of possible starting positions
                // The minimum starting position is 0
                // The maximum starting position must ensure all rooms fit and at least one room is at the spine
                const minStartX = 0;
                const maxStartX = this.shipWidth - roomsThisDeck; // For 6 rooms, this is 5 (ensuring they fit in the grid)

                // Find the range of starting positions that would place a room at the spine
                // For example, with 6 rooms, starting at position 0 would place rooms at 0,1,2,3,4,5
                // Starting at position 5 would place rooms at 5,6,7,8,9,10
                const minStartForSpine = Math.max(0, spineX - (roomsThisDeck - 1));
                const maxStartForSpine = spineX;

                // The actual range is the intersection of these two ranges
                const actualMinStart = Math.max(minStartX, minStartForSpine);
                const actualMaxStart = Math.min(maxStartX, maxStartForSpine);

                // Randomly choose a starting position within this range
                // This ensures we meet all our requirements while introducing randomness
                if (actualMinStart === actualMaxStart) {
                    // Only one possible starting position
                    finalStartX = actualMinStart;
                } else {
                    // Calculate how many possible positions we have
                    const possiblePositions = actualMaxStart - actualMinStart + 1;
                    // Choose a random offset within the range
                    const randomOffset = Dice.d(possiblePositions) - 1;
                    finalStartX = actualMinStart + randomOffset;
                }

                // Calculate the ending position based on the starting position
                const endX = finalStartX + roomsThisDeck - 1;

                // Place rooms side by side on this deck
                for (let i = 0; i < roomsThisDeck; i++) {
                    const roomX = finalStartX + i;

                    // Skip if position is already occupied or out of bounds
                    if (this.isPositionOccupied(roomX, deckY)) continue;

                    // Create the room
                    const newRoom = this.createRoom(roomId++, roomX, deckY);
                    this.graph.rooms.push(newRoom);
                    this.grid[deckY][roomX] = true;

                    // Connect to room to the left if it exists
                    if (i > 0) {
                        const leftRoom = this.graph.rooms.find(r =>
                            Math.floor(r.x / this.cellSize) === roomX - 1 &&
                            Math.floor(r.y / this.cellSize) === deckY
                        );
                        if (leftRoom) {
                            this.graph.links.push(this.createLink(leftRoom, newRoom, 'door'));
                        }
                    }

                    // Connect to room on the deck above if it exists
                    if (deck > 0) {
                        // First try to connect to the room directly above
                        const roomsAbove = this.graph.rooms.filter(r =>
                            Math.floor(r.x / this.cellSize) === roomX &&
                            Math.floor(r.y / this.cellSize) === deckY - 1
                        );

                        if (roomsAbove.length > 0) {
                            // Connect to the room directly above
                            this.graph.links.push(this.createLink(roomsAbove[0], newRoom, 'door'));
                        }
                        // If this is the room at or near the spine position, ensure vertical connectivity
                        else if (Math.abs(roomX - spineX) <= 1) {
                            // Find rooms on the deck above, preferring ones near the spine
                            const centralRoomsAbove = this.graph.rooms.filter(r =>
                                Math.floor(r.y / this.cellSize) === deckY - 1
                            ).sort((a, b) => {
                                // Sort by distance to the spine
                                const distA = Math.abs(Math.floor(a.x / this.cellSize) - spineX);
                                const distB = Math.abs(Math.floor(b.x / this.cellSize) - spineX);
                                return distA - distB;
                            });

                            if (centralRoomsAbove.length > 0) {
                                // Connect to the room closest to the spine on the deck above
                                this.graph.links.push(this.createLink(centralRoomsAbove[0], newRoom, 'door'));
                            }
                        }
                    }
                }
            }
        } else {
            // Use the original algorithm if numDecks and roomsPerDeck aren't specified
            // ... [existing code]
        }

        // Add secondary links (between rooms that aren't already connected)
        const numSecondaryLinks =
            minSecondaryLinks + Dice.d(maxSecondaryLinks - minSecondaryLinks + 1) - 1;

        // Add secondary links between rooms that are adjacent but not connected
        for (let i = 0; i < numSecondaryLinks && i < this.graph.rooms.length * 2; i++) {
            const room1 = this.graph.rooms[Dice.d(this.graph.rooms.length) - 1];

            // Get grid coordinates of the room
            const room1X = Math.floor(room1.x / this.cellSize);
            const room1Y = Math.floor(room1.y / this.cellSize);

            // Find adjacent rooms by grid position
            const adjacentRooms = this.graph.rooms.filter(room => {
                const roomX = Math.floor(room.x / this.cellSize);
                const roomY = Math.floor(room.y / this.cellSize);

                // Check if adjacent (not diagonal)
                return (
                    room.id !== room1.id &&
                    ((Math.abs(roomX - room1X) === 1 && roomY === room1Y) ||
                        (Math.abs(roomY - room1Y) === 1 && roomX === room1X))
                );
            });

            if (adjacentRooms.length > 0) {
                const room2 = adjacentRooms[Dice.d(adjacentRooms.length) - 1];

                // Check if they're already connected
                const alreadyConnected = this.graph.links.some(
                    link =>
                        (link.source.id === room1.id && link.target.id === room2.id) ||
                        (link.source.id === room2.id && link.target.id === room1.id)
                );

                if (!alreadyConnected) {
                    this.graph.links.push(this.createLink(room1, room2, 'secondary'));
                }
            }
        }

        return this.graph;
    }

    /**
     * Validates that all rooms in the ship are connected
     */
    validateDungeon(dungeon: DungeonGraph): boolean {
        // Simple validation to ensure all rooms are connected
        const visited = new Set<number>();
        const stack = [dungeon.rooms[0]];

        while (stack.length > 0) {
            const current = stack.pop()!;
            visited.add(current.id);

            // Find all connected rooms through links
            dungeon.links.forEach((link) => {
                if (link.source.id === current.id && !visited.has(link.target.id)) {
                    stack.push(link.target);
                } else if (
                    link.target.id === current.id &&
                    !visited.has(link.source.id)
                ) {
                    stack.push(link.source);
                }
            });
        }

        return visited.size === dungeon.rooms.length;
    }

    /**
     * Creates a navigation grid for pathfinding
     */
    public createNavigationGrid(): { grid: GridCell[][]; cellSize: number } {
        const width = this.shipWidth;
        const height = this.shipHeight;

        // Initialize grid with all cells walkable (empty space is walkable)
        const grid: GridCell[][] = Array(height)
            .fill(null)
            .map(() =>
                Array(width)
                    .fill(null)
                    .map(() => ({ walkable: true }))
            );

        // Mark room cells as non-walkable (rooms block movement)
        for (const room of this.graph.rooms) {
            const gridX = Math.floor(room.x / this.cellSize);
            const gridY = Math.floor(room.y / this.cellSize);
            grid[gridY][gridX].walkable = false;
        }

        // Mark corridors between rooms as non-walkable
        for (const link of this.graph.links) {
            const startX = Math.floor(link.source.x / this.cellSize);
            const startY = Math.floor(link.source.y / this.cellSize);
            const endX = Math.floor(link.target.x / this.cellSize);
            const endY = Math.floor(link.target.y / this.cellSize);

            // Mark cells between rooms as non-walkable
            if (startX === endX) {
                // Vertical corridor
                const minY = Math.min(startY, endY);
                const maxY = Math.max(startY, endY);
                for (let y = minY; y <= maxY; y++) {
                    grid[y][startX].walkable = false;
                }
            } else if (startY === endY) {
                // Horizontal corridor
                const minX = Math.min(startX, endX);
                const maxX = Math.max(startX, endX);
                for (let x = minX; x <= maxX; x++) {
                    grid[startY][x].walkable = false;
                }
            }
        }

        return { grid, cellSize: this.cellSize };
    }

    /**
     * Generates a ship based on the ShipBreakers ship type.
     * Uses the dice notation from the ship type to determine number of decks
     * and generates rooms for each deck.
     */
    generateShipFromType(shipType: { name: string; decks: string }, config: Partial<GenerationConfig> = {}): DungeonGraph {
        // Roll for number of decks
        const numDecks = Dice.rollFromNotation(shipType.decks).total;

        // Default rooms per deck is 1
        const defaultRoomsPerDeck = 1;

        // Enable randomized rooms per deck by default unless explicitly disabled
        const shouldRandomize = config.randomizeRoomsPerDeck !== false;

        // Create an array of random room counts per deck
        const roomsPerDeckArray = [];
        let totalRooms = 0;

        // If varied rooms per deck is enabled and not specified in config
        if (!config.roomsPerDeckArray) {
            for (let i = 0; i < numDecks; i++) {
                // Generate a weighted random number of rooms for this deck
                const roomsForThisDeck = shouldRandomize
                    ? this.getWeightedRoomCount() // Weighted probability (1 is most likely, 6 is least likely)
                    : (config.roomsPerDeck || defaultRoomsPerDeck);

                roomsPerDeckArray.push(roomsForThisDeck);
                totalRooms += roomsForThisDeck;
            }
        } else if (config.roomsPerDeckArray) {
            // Use the provided array
            totalRooms = config.roomsPerDeckArray.reduce((sum: number, count: number) => sum + count, 0);
        } else {
            // Fixed number of rooms per deck
            totalRooms = numDecks * (config.roomsPerDeck || defaultRoomsPerDeck);
        }

        const roomCountDescription = shouldRandomize
            ? `weighted (1-6) ${roomsPerDeckArray.join(', ')} rooms per deck`
            : `${config.roomsPerDeck || defaultRoomsPerDeck} room(s) per deck`;

        console.log(`Generating ship with ${numDecks} decks, ${roomCountDescription} (${totalRooms} total rooms)`);

        // Since ship width is now fixed at 11 cells, we use that value directly
        // to calculate dungeonWidth based on the cell size
        const dungeonWidth = this.shipWidth * this.cellSize;

        const completeConfig: GenerationConfig = {
            numRooms: totalRooms,
            dungeonWidth: dungeonWidth,
            dungeonHeight: numDecks * this.cellSize, // Height based on number of decks
            numDecks,
            roomsPerDeck: config.roomsPerDeck || defaultRoomsPerDeck,
            roomsPerDeckArray: config.roomsPerDeckArray || roomsPerDeckArray,
            randomizeRoomsPerDeck: shouldRandomize,
            minSecondaryLinks: 1,
            maxSecondaryLinks: Math.ceil(totalRooms * 0.3),
            shipTypeName: shipType.name, // Pass the ship type name to generate
            ...config
        };

        return this.generate(completeConfig);
    }

    /**
     * Returns a weighted random room count where:
     * - 1 room is most likely (6/21 probability, ~28.6%)
     * - 2 rooms is next most likely (5/21 probability, ~23.8%)
     * - 3 rooms is next (4/21 probability, ~19.0%)
     * - 4 rooms is next (3/21 probability, ~14.3%)
     * - 5 rooms is next (2/21 probability, ~9.5%)
     * - 6 rooms is least likely (1/21 probability, ~4.8%)
     * 
     * Uses an n/21 weighted probability distribution
     */
    private getWeightedRoomCount(): number {
        // Roll a d21 (21-sided die)
        const roll = Dice.d(21);

        // Map the d21 roll to our weighted room counts:
        if (roll <= 6) return 1;       // 6/21 probability (~28.6%)
        if (roll <= 11) return 2;      // 5/21 probability (~23.8%)
        if (roll <= 15) return 3;      // 4/21 probability (~19.0%)
        if (roll <= 18) return 4;      // 3/21 probability (~14.3%)
        if (roll <= 20) return 5;      // 2/21 probability (~9.5%)
        return 6;                      // 1/21 probability (~4.8%)
    }
} 