import type {
    DungeonGraph,
    RoomNode,
    RoomLink,
    GenerationConfig,
} from './types';
import { Dice } from './dice';
import type { GridCell } from './AStarGrid';
import { DUNGEON_CONSTANTS } from './constants';

/**
 * ShipGenerator - Creates ship layouts with rooms in a grid pattern
 * Each deck is arranged vertically, with rooms placed adjacently in a
 * spaceship-like configuration.
 */
export class ShipGenerator {
    private cellSize: number;
    private shipWidth: number = 0;
    private shipHeight: number = 0;
    private graph: DungeonGraph = { rooms: [], links: [] };
    private grid: boolean[][] = []; // true if cell is occupied

    constructor() {
        this.cellSize = DUNGEON_CONSTANTS.CELL_SIZE;
    }

    /**
     * Creates a room at the specified grid coordinates
     */
    private createRoom(id: number, x: number, y: number): RoomNode {
        return {
            id: id,
            x: x * this.cellSize,
            y: y * this.cellSize,
            name: `Room ${id}`,
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
        } = config;

        // Store ship dimensions
        this.shipWidth = Math.ceil(dungeonWidth / this.cellSize);
        this.shipHeight = Math.ceil(dungeonHeight / this.cellSize);

        // Initialize grid with all cells unoccupied
        this.grid = Array(this.shipHeight)
            .fill(null)
            .map(() => Array(this.shipWidth).fill(false));

        this.graph = {
            rooms: [],
            links: [],
        };

        let roomId = 0;

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

                // We'll place rooms around the spine position, with at least one room
                // guaranteed to be at or adjacent to the spine

                // Calculate room placement to ensure we have a balanced distribution with the spine
                let leftRooms = Math.floor((roomsThisDeck - 1) / 2);  // Rooms to the left of spine
                let rightRooms = roomsThisDeck - 1 - leftRooms;       // Rooms to the right of spine

                // Add some randomness - shift the balance sometimes
                if (roomsThisDeck > 2 && Dice.d(100) > 50) {
                    // Randomly shift the balance, making one side heavier than the other
                    const maxShift = Math.min(leftRooms, rightRooms);
                    const shift = maxShift > 0 ? Dice.d(maxShift) : 0;

                    if (Dice.d(2) === 1) {
                        // Shift to the left
                        leftRooms += shift;
                        rightRooms -= shift;
                    } else {
                        // Shift to the right
                        leftRooms -= shift;
                        rightRooms += shift;
                    }
                }

                // Start position is spine minus the number of rooms to the left
                const startX = Math.max(1, spineX - leftRooms);
                let endX = startX + roomsThisDeck - 1;

                // Verify we're not going out of bounds
                let finalStartX = startX;
                if (endX >= this.shipWidth) {
                    // If we are, adjust the startX to make sure all rooms fit
                    finalStartX = Math.max(1, this.shipWidth - roomsThisDeck);
                    endX = finalStartX + roomsThisDeck - 1;
                }

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
                // Generate a random number of rooms for this deck (1-6 now instead of 1-3)
                const roomsForThisDeck = shouldRandomize
                    ? Dice.d(6) // Random 1-6 rooms per deck
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
            ? `random (1-6) ${roomsPerDeckArray.join(', ')} rooms per deck`
            : `${config.roomsPerDeck || defaultRoomsPerDeck} room(s) per deck`;

        console.log(`Generating ship with ${numDecks} decks, ${roomCountDescription} (${totalRooms} total rooms)`);

        // Determine ship width - should be wider than tall
        // Find maximum rooms in any deck to determine width
        const maxRoomsInAnyDeck = roomsPerDeckArray.length > 0
            ? Math.max(...roomsPerDeckArray, config.roomsPerDeck || defaultRoomsPerDeck)
            : (config.roomsPerDeck || defaultRoomsPerDeck);

        const baseWidth = Math.max(3, maxRoomsInAnyDeck + 2); // Just enough width plus buffer

        const completeConfig: GenerationConfig = {
            numRooms: totalRooms,
            dungeonWidth: baseWidth * this.cellSize,
            dungeonHeight: numDecks * this.cellSize, // Height based on number of decks
            numDecks,
            roomsPerDeck: config.roomsPerDeck || defaultRoomsPerDeck,
            roomsPerDeckArray: config.roomsPerDeckArray || roomsPerDeckArray,
            randomizeRoomsPerDeck: shouldRandomize,
            minSecondaryLinks: 1,
            maxSecondaryLinks: Math.ceil(totalRooms * 0.3),
            ...config
        };

        return this.generate(completeConfig);
    }
} 