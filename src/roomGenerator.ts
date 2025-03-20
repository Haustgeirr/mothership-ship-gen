import type { DungeonGraph, RoomNode } from './types';
import { RoomType } from './types';
import { RoomAssigner } from './roomAssignment';
import { RoomPlacementRuleEngine } from './roomPlacementRules';
import { DUNGEON_CONSTANTS } from './constants';

/**
 * RoomGenerator - Applies room type assignments to an existing ship layout
 * based on placement rules and room type distributions.
 * 
 * This class does not modify the structure of the ship layout,
 * it only assigns appropriate room types to the existing rooms.
 */
export class RoomGenerator {
    private cellSize: number;

    constructor() {
        this.cellSize = DUNGEON_CONSTANTS.CELL_SIZE;
    }

    /**
     * Applies room types to an existing ship layout based on placement rules
     * 
     * @param shipGraph The existing ship layout graph
     * @param shipType The type of ship (e.g., "Mining Frigate", "Raider")
     * @returns The updated ship layout with room types assigned
     */
    applyRoomTypes(shipGraph: DungeonGraph, shipType: string): DungeonGraph {

        // Create a working copy of the graph to avoid modifying the original
        const workingGraph: DungeonGraph = {
            rooms: [...shipGraph.rooms],
            links: [...shipGraph.links]
        };

        // Calculate the total number of decks
        const totalDecks = this.calculateTotalDecks(workingGraph);

        // First, generate candidate room types based on ship type
        const roomTypes = RoomAssigner.assignRoomTypesForShip(
            shipType,
            workingGraph.rooms.length
        );

        const typeCounts: Record<string, number> = {};
        roomTypes.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        Object.entries(typeCounts).forEach(([type, count]) => {
        });

        // Create a map to store the best room type for each room position
        const roomTypeAssignments = new Map<number, RoomType>();

        // Create an array of room positions with their deck indices
        const roomPositions = workingGraph.rooms.map(room => {
            return {
                id: room.id,
                x: Math.floor(room.x / this.cellSize),
                y: Math.floor(room.y / this.cellSize)
            };
        });

        // Find adjacent rooms for each room
        const adjacencyMap = this.buildAdjacencyMap(workingGraph);

        // Score each possible room type for each position
        // Start with guaranteed rooms (COMMAND, ENGINE, LIFE_SUPPORT)
        const guaranteedTypes = [RoomType.COMMAND, RoomType.ENGINE, RoomType.LIFE_SUPPORT];

        this.assignGuaranteedRooms(
            guaranteedTypes,
            roomPositions,
            roomTypeAssignments,
            totalDecks,
            shipType,
            adjacencyMap
        );

        // Log guaranteed room assignments
        guaranteedTypes.forEach(type => {
            const roomId = [...roomTypeAssignments.entries()]
                .find(([, roomType]) => roomType === type)?.[0];

            if (roomId !== undefined) {
                const pos = roomPositions.find(p => p.id === roomId);
            }
        });

        // Get remaining room types to assign (excluding already assigned guaranteed types)
        const assignedRoomTypes = Array.from(roomTypeAssignments.values());
        const remainingRoomTypes = roomTypes.filter(type => !assignedRoomTypes.includes(type));

        // Get remaining room positions
        const remainingPositions = roomPositions.filter(pos =>
            !roomTypeAssignments.has(pos.id)
        );


        // Assign remaining room types based on optimal placement
        this.assignRemainingRooms(
            remainingRoomTypes,
            remainingPositions,
            roomTypeAssignments,
            totalDecks,
            shipType,
            adjacencyMap
        );


        // Apply the room type assignments to the working graph
        workingGraph.rooms = workingGraph.rooms.map(room => {
            const assignedType = roomTypeAssignments.get(room.id);
            if (assignedType) {
                // Create a new room object with the assigned type
                return {
                    ...room,
                    type: assignedType,
                    name: `${assignedType} ${room.id}` // Update name based on type
                };
            }
            return room;
        });

        return workingGraph;
    }

    /**
     * Calculates the total number of decks in the ship layout
     */
    private calculateTotalDecks(shipGraph: DungeonGraph): number {
        if (shipGraph.rooms.length === 0) return 0;

        const minY = Math.min(
            ...shipGraph.rooms.map(room => Math.floor(room.y / this.cellSize))
        );
        const maxY = Math.max(
            ...shipGraph.rooms.map(room => Math.floor(room.y / this.cellSize))
        );

        return maxY - minY + 1;
    }

    /**
     * Builds a map of adjacent rooms for each room
     */
    private buildAdjacencyMap(shipGraph: DungeonGraph): Map<number, number[]> {
        const adjacencyMap = new Map<number, number[]>();

        // Initialize the map for each room
        for (const room of shipGraph.rooms) {
            adjacencyMap.set(room.id, []);
        }

        // Add adjacent rooms based on links
        for (const link of shipGraph.links) {
            const sourceId = link.source.id;
            const targetId = link.target.id;

            const sourceAdjacent = adjacencyMap.get(sourceId) || [];
            if (!sourceAdjacent.includes(targetId)) {
                sourceAdjacent.push(targetId);
                adjacencyMap.set(sourceId, sourceAdjacent);
            }

            const targetAdjacent = adjacencyMap.get(targetId) || [];
            if (!targetAdjacent.includes(sourceId)) {
                targetAdjacent.push(sourceId);
                adjacencyMap.set(targetId, targetAdjacent);
            }
        }

        return adjacencyMap;
    }

    /**
     * Assigns guaranteed room types (COMMAND, ENGINE, LIFE_SUPPORT)
     * to their optimal positions in the ship
     */
    private assignGuaranteedRooms(
        guaranteedTypes: RoomType[],
        roomPositions: Array<{ id: number, x: number, y: number }>,
        assignments: Map<number, RoomType>,
        totalDecks: number,
        shipType: string,
        adjacencyMap: Map<number, number[]>
    ): void {
        for (const roomType of guaranteedTypes) {

            // Score each position for this room type
            const scoredPositions = roomPositions
                .filter(pos => !assignments.has(pos.id)) // Only consider unassigned positions
                .map(pos => {
                    // Get deck position score
                    const deckScore = RoomPlacementRuleEngine.getDeckPositionScore(
                        roomType,
                        shipType,
                        totalDecks,
                        pos.y
                    );

                    // Get adjacency scores with already assigned rooms
                    let adjacencyScore = 0;
                    const adjacentRoomIds = adjacencyMap.get(pos.id) || [];

                    for (const adjacentId of adjacentRoomIds) {
                        const adjacentType = assignments.get(adjacentId);
                        if (adjacentType) {
                            adjacencyScore += RoomPlacementRuleEngine.getAdjacencyScore(
                                roomType,
                                adjacentType,
                                shipType
                            );
                        }
                    }

                    // Calculate total score
                    const totalScore = deckScore + adjacencyScore;

                    return {
                        id: pos.id,
                        x: pos.x,
                        y: pos.y,
                        score: totalScore,
                        deckScore,
                        adjacencyScore
                    };
                });

            // Sort by score (highest first)
            scoredPositions.sort((a, b) => b.score - a.score);

            // Assign the room type to the best position
            if (scoredPositions.length > 0) {
                const bestPosition = scoredPositions[0];
                assignments.set(bestPosition.id, roomType);
            } else {
            }
        }
    }

    /**
     * Assigns the remaining room types to their optimal positions
     */
    private assignRemainingRooms(
        remainingTypes: RoomType[],
        remainingPositions: Array<{ id: number, x: number, y: number }>,
        assignments: Map<number, RoomType>,
        totalDecks: number,
        shipType: string,
        adjacencyMap: Map<number, number[]>
    ): void {
        // Create a copy of positions to work with
        const availablePositions = [...remainingPositions];
        let assignedTypeCount = 0;

        // For each remaining room type
        for (const roomType of remainingTypes) {
            if (availablePositions.length === 0) {
                break;
            }

            // Score each position for this room type
            const scoredPositions = availablePositions.map(pos => {
                // Get deck position score
                const deckScore = RoomPlacementRuleEngine.getDeckPositionScore(
                    roomType,
                    shipType,
                    totalDecks,
                    pos.y
                );

                // Get adjacency scores with already assigned rooms
                let adjacencyScore = 0;
                const adjacentRoomIds = adjacencyMap.get(pos.id) || [];

                for (const adjacentId of adjacentRoomIds) {
                    const adjacentType = assignments.get(adjacentId);
                    if (adjacentType) {
                        adjacencyScore += RoomPlacementRuleEngine.getAdjacencyScore(
                            roomType,
                            adjacentType,
                            shipType
                        );
                    }
                }

                // Calculate total score
                const totalScore = deckScore + adjacencyScore;

                return {
                    id: pos.id,
                    x: pos.x,
                    y: pos.y,
                    score: totalScore,
                    deckScore,
                    adjacencyScore
                };
            });

            // Sort by score (highest first)
            scoredPositions.sort((a, b) => b.score - a.score);

            // Assign the room type to the best position
            if (scoredPositions.length > 0) {
                const bestPosition = scoredPositions[0];
                assignments.set(bestPosition.id, roomType);
                assignedTypeCount++;

                // Log all room assignments with their IDs - always log, not just high scoring ones

                // Remove this position from available positions
                const index = availablePositions.findIndex(
                    pos => pos.id === bestPosition.id
                );
                if (index !== -1) {
                    availablePositions.splice(index, 1);
                }
            }
        }

        // Log how many positions were filled
    }
} 