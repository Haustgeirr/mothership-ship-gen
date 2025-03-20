import { RoomType } from './types';


// 1.	BARRACKS
// 2.	CARGO HOLD
// 3.	COMMAND
// 4.	COMPUTER
// 5.	CRYOCHAMBER
// 6.	ENGINE
// 7.	ENGINES
// 8.	GALLEY
// 9.	HABITAT AREA
// 10.	JUMP DRIVE
// 11.	LIFE SUPPORT
// 12.	LIVING QUARTERS
// 13.	MEDBAY
// 14.	SCIENCE LAB
// 15.	THRUSTERS
// 16.	WEAPON

/**
 * Defines the vertical positioning of a room on the ship
 */
export enum DeckPosition {
    UPPER = 'UPPER',   // Upper decks (top 33%)
    MIDDLE = 'MIDDLE', // Middle decks (middle 34%)
    LOWER = 'LOWER',   // Lower decks (bottom 33%)
    ANY = 'ANY'        // No preference
}

/**
 * Defines positioning rules for each room type
 */
export interface DeckPlacementRule {
    roomType: RoomType;
    preferredPosition: DeckPosition;
    avoidPosition?: DeckPosition;
    placementWeight: number; // Higher = stronger preference (0-10)
}

/**
 * Defines which room types should be adjacent to each other
 */
export interface AdjacencyRule {
    roomType: RoomType;
    requiredAdjacent: RoomType[];   // Must be adjacent if possible
    preferredAdjacent: RoomType[];  // Preferred adjacent
    avoidAdjacent: RoomType[];      // Should not be adjacent if possible
}

/**
 * Default deck placement rules for each room type
 * These define where on the ship (vertically) each room type should ideally be placed
 */
export const DECK_PLACEMENT_RULES: DeckPlacementRule[] = [
    // Command and Navigation
    {
        roomType: RoomType.COMMAND,
        preferredPosition: DeckPosition.UPPER,
        avoidPosition: DeckPosition.LOWER,
        placementWeight: 9
    },
    {
        roomType: RoomType.COMPUTER,
        preferredPosition: DeckPosition.UPPER,
        placementWeight: 7
    },

    // Propulsion
    {
        roomType: RoomType.ENGINE,
        preferredPosition: DeckPosition.LOWER,
        avoidPosition: DeckPosition.UPPER,
        placementWeight: 15
    },
    {
        roomType: RoomType.ENGINES,
        preferredPosition: DeckPosition.LOWER,
        avoidPosition: DeckPosition.UPPER,
        placementWeight: 15
    },
    {
        roomType: RoomType.THRUSTERS,
        preferredPosition: DeckPosition.LOWER,
        avoidPosition: DeckPosition.UPPER,
        placementWeight: 12
    },
    {
        roomType: RoomType.JUMP_DRIVE,
        preferredPosition: DeckPosition.LOWER,
        placementWeight: 6
    },

    // Crew Areas
    {
        roomType: RoomType.LIVING_QUARTERS,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 5
    },
    {
        roomType: RoomType.BARRACKS,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 5
    },
    {
        roomType: RoomType.GALLEY,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 4
    },
    {
        roomType: RoomType.HABITAT_AREA,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 5
    },

    // Storage & Support
    {
        roomType: RoomType.CARGO_HOLD,
        preferredPosition: DeckPosition.LOWER,
        placementWeight: 7
    },
    {
        roomType: RoomType.LIFE_SUPPORT,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 6
    },
    {
        roomType: RoomType.MEDBAY,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 5
    },
    {
        roomType: RoomType.CRYOCHAMBER,
        preferredPosition: DeckPosition.MIDDLE,
        placementWeight: 4
    },
    {
        roomType: RoomType.SCIENCE_LAB,
        preferredPosition: DeckPosition.MIDDLE,
        avoidPosition: DeckPosition.LOWER,
        placementWeight: 5
    },
    {
        roomType: RoomType.WEAPON,
        preferredPosition: DeckPosition.ANY, // Can be distributed
        placementWeight: 3
    }
];

/**
 * Ship-specific deck placement rule overrides
 * These modify the default rules for specific ship types
 */
export const SHIP_SPECIFIC_PLACEMENT: Record<string, Partial<DeckPlacementRule>[]> = {
    "Mining Frigate": [
        {
            roomType: RoomType.CARGO_HOLD,
            preferredPosition: DeckPosition.LOWER,
            placementWeight: 10
        }
    ],
    "Freighter": [
        {
            roomType: RoomType.CARGO_HOLD,
            preferredPosition: DeckPosition.MIDDLE, // Cargo is main purpose, so more central
            placementWeight: 10
        }
    ],
    "Raider": [
        {
            roomType: RoomType.WEAPON,
            preferredPosition: DeckPosition.UPPER, // Weapons more important on raiders
            placementWeight: 8
        },
        {
            roomType: RoomType.ENGINE,
            preferredPosition: DeckPosition.LOWER,
            placementWeight: 10 // Even stronger preference for engines at bottom
        }
    ],
    "Executive Transport": [
        {
            roomType: RoomType.LIVING_QUARTERS,
            preferredPosition: DeckPosition.UPPER, // Premium quarters higher up
            placementWeight: 8
        }
    ],
    "Exploration Vessel": [
        {
            roomType: RoomType.SCIENCE_LAB,
            preferredPosition: DeckPosition.UPPER, // Science labs get premium spots
            placementWeight: 9
        }
    ],
    "Corvette": [
        {
            roomType: RoomType.COMMAND,
            preferredPosition: DeckPosition.UPPER,
            placementWeight: 10 // Military vessels have command at top
        },
        {
            roomType: RoomType.WEAPON,
            preferredPosition: DeckPosition.UPPER, // Weapons are important
            placementWeight: 8
        }
    ],
    "Troopship": [
        {
            roomType: RoomType.BARRACKS,
            preferredPosition: DeckPosition.MIDDLE,
            placementWeight: 9 // Barracks are the main feature
        }
    ],
    "Colony Ship": [
        {
            roomType: RoomType.HABITAT_AREA,
            preferredPosition: DeckPosition.MIDDLE,
            placementWeight: 10 // Habitat areas are central
        },
        {
            roomType: RoomType.CRYOCHAMBER,
            preferredPosition: DeckPosition.MIDDLE,
            placementWeight: 10 // Cryochambers are critical
        }
    ]
};

/**
 * Default adjacency rules for each room type
 * These define which rooms should be adjacent to each other
 */
export const ADJACENCY_RULES: AdjacencyRule[] = [
    // Command and Navigation
    {
        roomType: RoomType.COMMAND,
        requiredAdjacent: [RoomType.COMPUTER],
        preferredAdjacent: [RoomType.LIVING_QUARTERS],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.CARGO_HOLD]
    },
    {
        roomType: RoomType.COMPUTER,
        requiredAdjacent: [RoomType.COMMAND],
        preferredAdjacent: [RoomType.SCIENCE_LAB],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES]
    },

    // Propulsion
    {
        roomType: RoomType.ENGINE,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.THRUSTERS, RoomType.ENGINES, RoomType.JUMP_DRIVE],
        avoidAdjacent: [RoomType.LIVING_QUARTERS, RoomType.COMMAND, RoomType.HABITAT_AREA]
    },
    {
        roomType: RoomType.ENGINES,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.ENGINE, RoomType.THRUSTERS, RoomType.JUMP_DRIVE],
        avoidAdjacent: [RoomType.LIVING_QUARTERS, RoomType.COMMAND, RoomType.HABITAT_AREA]
    },
    {
        roomType: RoomType.THRUSTERS,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.ENGINE, RoomType.ENGINES],
        avoidAdjacent: [RoomType.LIVING_QUARTERS, RoomType.COMMAND]
    },
    {
        roomType: RoomType.JUMP_DRIVE,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.COMPUTER],
        avoidAdjacent: [RoomType.HABITAT_AREA, RoomType.CRYOCHAMBER]
    },

    // Crew Areas
    {
        roomType: RoomType.LIVING_QUARTERS,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.GALLEY, RoomType.HABITAT_AREA, RoomType.MEDBAY],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.CARGO_HOLD, RoomType.WEAPON]
    },
    {
        roomType: RoomType.BARRACKS,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.GALLEY, RoomType.WEAPON],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES]
    },
    {
        roomType: RoomType.GALLEY,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.LIVING_QUARTERS, RoomType.BARRACKS, RoomType.HABITAT_AREA],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.MEDBAY]
    },
    {
        roomType: RoomType.HABITAT_AREA,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.LIVING_QUARTERS, RoomType.GALLEY, RoomType.MEDBAY],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.CARGO_HOLD, RoomType.WEAPON]
    },

    // Storage & Support
    {
        roomType: RoomType.CARGO_HOLD,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.CARGO_HOLD], // Cargo holds can be adjacent to other cargo holds
        avoidAdjacent: [RoomType.COMMAND, RoomType.LIVING_QUARTERS, RoomType.MEDBAY, RoomType.HABITAT_AREA]
    },
    {
        roomType: RoomType.LIFE_SUPPORT,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.HABITAT_AREA, RoomType.LIVING_QUARTERS],
        avoidAdjacent: []
    },
    {
        roomType: RoomType.MEDBAY,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.LIVING_QUARTERS, RoomType.HABITAT_AREA, RoomType.CRYOCHAMBER],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.CARGO_HOLD]
    },
    {
        roomType: RoomType.CRYOCHAMBER,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.MEDBAY, RoomType.LIFE_SUPPORT],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.JUMP_DRIVE]
    },
    {
        roomType: RoomType.SCIENCE_LAB,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.COMPUTER, RoomType.MEDBAY],
        avoidAdjacent: [RoomType.ENGINE, RoomType.ENGINES, RoomType.CARGO_HOLD]
    },
    {
        roomType: RoomType.WEAPON,
        requiredAdjacent: [],
        preferredAdjacent: [RoomType.COMMAND, RoomType.BARRACKS],
        avoidAdjacent: [RoomType.HABITAT_AREA, RoomType.CRYOCHAMBER, RoomType.LIVING_QUARTERS]
    }
];

/**
 * Ship-specific adjacency rule overrides 
 * These modify the default rules for specific ship types
 */
export const SHIP_SPECIFIC_ADJACENCY: Record<string, Partial<AdjacencyRule>[]> = {
    "Raider": [
        {
            roomType: RoomType.COMMAND,
            requiredAdjacent: [RoomType.WEAPON, RoomType.COMPUTER] // Raiders need weapons by command
        },
        {
            roomType: RoomType.WEAPON,
            preferredAdjacent: [RoomType.COMMAND, RoomType.BARRACKS, RoomType.COMPUTER]
        }
    ],
    "Freighter": [
        {
            roomType: RoomType.CARGO_HOLD,
            preferredAdjacent: [RoomType.CARGO_HOLD], // Cargo holds should cluster
        }
    ],
    "Exploration Vessel": [
        {
            roomType: RoomType.SCIENCE_LAB,
            preferredAdjacent: [RoomType.SCIENCE_LAB, RoomType.COMPUTER] // Science labs can cluster
        }
    ],
    "Colony Ship": [
        {
            roomType: RoomType.HABITAT_AREA,
            preferredAdjacent: [RoomType.HABITAT_AREA, RoomType.GALLEY] // Habitat areas can cluster
        },
        {
            roomType: RoomType.CRYOCHAMBER,
            preferredAdjacent: [RoomType.CRYOCHAMBER, RoomType.MEDBAY] // Cryochambers can cluster
        }
    ]
};

/**
 * Utility class for applying room placement rules
 */
export class RoomPlacementRuleEngine {
    /**
     * Determines the optimal deck position for a room type on a specific ship
     * @param roomType Type of room to place
     * @param shipType Type of ship
     * @param totalDecks Total number of decks on the ship
     * @returns The optimal deck index (0-based)
     */
    static getOptimalDeckForRoomType(
        roomType: RoomType,
        shipType: string,
        totalDecks: number,
        deckIndex: number
    ): number {
        // Get the default placement rule for this room type
        const defaultRule = DECK_PLACEMENT_RULES.find(rule => rule.roomType === roomType);

        if (!defaultRule) {
            return deckIndex; // No rule found, keep current position
        }

        // Check if there's a ship-specific override
        const shipSpecificRules = SHIP_SPECIFIC_PLACEMENT[shipType] || [];
        const shipOverride = shipSpecificRules.find(rule => rule.roomType === roomType);

        // Combine the default rule with any ship-specific overrides
        const rule = shipOverride ? { ...defaultRule, ...shipOverride } : defaultRule;

        // If the rule specifies "ANY" position, return the current deck
        if (rule.preferredPosition === DeckPosition.ANY) {
            return deckIndex;
        }

        // Define deck zones
        const upperDeckThreshold = Math.floor(totalDecks * 0.33);
        const lowerDeckThreshold = Math.floor(totalDecks * 0.67);

        // Check if current deck is in the avoided zone
        const isInAvoidedZone =
            (rule.avoidPosition === DeckPosition.UPPER && deckIndex <= upperDeckThreshold) ||
            (rule.avoidPosition === DeckPosition.MIDDLE && deckIndex > upperDeckThreshold && deckIndex < lowerDeckThreshold) ||
            (rule.avoidPosition === DeckPosition.LOWER && deckIndex >= lowerDeckThreshold);

        // If current deck position is in an avoided zone, move to preferred zone
        if (isInAvoidedZone) {
            // Calculate a target deck based on preferred position
            switch (rule.preferredPosition) {
                case DeckPosition.UPPER:
                    return Math.floor(totalDecks * 0.2); // Top 20% of decks
                case DeckPosition.MIDDLE:
                    return Math.floor(totalDecks * 0.5); // Middle of the ship
                case DeckPosition.LOWER:
                    return Math.floor(totalDecks * 0.8); // Bottom 20% of decks
                default:
                    return deckIndex; // Keep current position
            }
        }

        // Check if current deck is in the preferred zone
        const isInPreferredZone =
            (rule.preferredPosition === DeckPosition.UPPER && deckIndex <= upperDeckThreshold) ||
            (rule.preferredPosition === DeckPosition.MIDDLE && deckIndex > upperDeckThreshold && deckIndex < lowerDeckThreshold) ||
            (rule.preferredPosition === DeckPosition.LOWER && deckIndex >= lowerDeckThreshold);

        // If already in preferred zone, keep current position
        if (isInPreferredZone) {
            return deckIndex;
        }

        // Move to preferred zone
        switch (rule.preferredPosition) {
            case DeckPosition.UPPER:
                return Math.min(upperDeckThreshold, Math.floor(totalDecks * 0.2)); // Top 20% of ship
            case DeckPosition.MIDDLE:
                return Math.floor(totalDecks * 0.5); // Middle of the ship
            case DeckPosition.LOWER:
                return Math.max(lowerDeckThreshold, Math.floor(totalDecks * 0.8)); // Bottom 20% of ship
            default:
                return deckIndex; // Keep current position
        }
    }

    /**
     * Calculates a score for how well two room types should be adjacent
     * Higher scores mean the rooms should be adjacent, negative scores mean they should not
     * @param roomType1 First room type
     * @param roomType2 Second room type
     * @param shipType Type of ship
     * @returns Adjacency score (-10 to 10)
     */
    static getAdjacencyScore(roomType1: RoomType, roomType2: RoomType, shipType: string): number {
        if (roomType1 === roomType2) {
            // Same room types can sometimes cluster (like cargo holds or science labs)
            // Check if this room type should cluster
            const rule = ADJACENCY_RULES.find(r => r.roomType === roomType1);
            if (rule && rule.preferredAdjacent.includes(roomType1)) {
                return 5; // These room types can cluster
            }
            return 0; // Neutral for same type
        }

        // Get default rule for first room type
        const defaultRule1 = ADJACENCY_RULES.find(rule => rule.roomType === roomType1);
        if (!defaultRule1) return 0; // No rule found

        // Check for ship-specific rule overrides
        const shipRules = SHIP_SPECIFIC_ADJACENCY[shipType] || [];
        const shipRule1 = shipRules.find(rule => rule.roomType === roomType1);

        // Combine rules
        const rule1 = shipRule1 ? { ...defaultRule1, ...shipRule1 } : defaultRule1;

        // Calculate base adjacency score
        let score = 0;

        // Required adjacency is a strong positive
        if (rule1.requiredAdjacent && rule1.requiredAdjacent.includes(roomType2)) {
            score += 10;
        }

        // Preferred adjacency is a moderate positive
        if (rule1.preferredAdjacent && rule1.preferredAdjacent.includes(roomType2)) {
            score += 5;
        }

        // Avoided adjacency is a negative
        if (rule1.avoidAdjacent && rule1.avoidAdjacent.includes(roomType2)) {
            score -= 7;
        }

        // Also check the rule for the second room type (reciprocal relationship)
        const defaultRule2 = ADJACENCY_RULES.find(rule => rule.roomType === roomType2);
        if (defaultRule2) {
            const shipRule2 = shipRules.find(rule => rule.roomType === roomType2);
            const rule2 = shipRule2 ? { ...defaultRule2, ...shipRule2 } : defaultRule2;

            // Add points from the second room's perspective
            if (rule2.requiredAdjacent && rule2.requiredAdjacent.includes(roomType1)) {
                score += 10;
            }

            if (rule2.preferredAdjacent && rule2.preferredAdjacent.includes(roomType1)) {
                score += 5;
            }

            if (rule2.avoidAdjacent && rule2.avoidAdjacent.includes(roomType1)) {
                score -= 7;
            }
        }

        // Return the final score, clamped to range -10 to 10
        return Math.max(-10, Math.min(10, score));
    }

    /**
     * Calculates a score indicating how well a room type fits at a specific deck position
     * @param roomType The room type to evaluate
     * @param shipType The type of ship
     * @param totalDecks The total number of decks in the ship
     * @param deckIndex The current deck index (0-based)
     * @returns A score (-50 to 10) where higher values indicate better placement
     */
    static getDeckPositionScore(
        roomType: RoomType,
        shipType: string,
        totalDecks: number,
        deckIndex: number
    ): number {
        // Get the default placement rule for this room type
        const defaultRule = DECK_PLACEMENT_RULES.find(rule => rule.roomType === roomType);

        if (!defaultRule) {
            return 0; // No rule found, neutral score
        }

        // Check if there's a ship-specific override
        const shipSpecificRules = SHIP_SPECIFIC_PLACEMENT[shipType] || [];
        const shipOverride = shipSpecificRules.find(rule => rule.roomType === roomType);

        // Combine the default rule with any ship-specific overrides
        const rule = shipOverride ? { ...defaultRule, ...shipOverride } : defaultRule;

        // If the rule specifies "ANY" position, return a neutral score
        if (rule.preferredPosition === DeckPosition.ANY) {
            return 5; // Slightly positive for flexibility
        }

        // Define deck zones
        const upperDeckThreshold = Math.floor(totalDecks * 0.33);
        const lowerDeckThreshold = Math.floor(totalDecks * 0.67);

        // Determine which zone this deck is in
        const deckZone =
            deckIndex <= upperDeckThreshold ? DeckPosition.UPPER :
                deckIndex >= lowerDeckThreshold ? DeckPosition.LOWER :
                    DeckPosition.MIDDLE;

        let score = 0;

        // Check if deck is in preferred zone
        if (deckZone === rule.preferredPosition) {
            // Higher score based on placement weight
            score += rule.placementWeight;
        } else {
            // Slightly negative score if not in preferred zone
            score -= Math.ceil(rule.placementWeight / 2);
        }

        // Check if deck is in avoided zone (very negative)
        if (rule.avoidPosition && deckZone === rule.avoidPosition) {
            // Apply a more severe penalty
            score -= rule.placementWeight * 3;

            // Special case for propulsion rooms in upper decks - apply an even stronger penalty
            if ((roomType === RoomType.ENGINE || roomType === RoomType.ENGINES || roomType === RoomType.THRUSTERS) &&
                deckZone === DeckPosition.UPPER) {
                score -= 20; // Additional severe penalty for engines in upper decks

                // If we have more than 3 decks, apply an even more severe penalty in the top deck
                if (totalDecks > 3 && deckIndex === 0) {
                    score -= 20; // Extremely severe penalty for engines in the very top deck
                }
            }
        }

        // Normalize the score to the range -50 to 10 (increased range for very negative scores)
        return Math.max(-50, Math.min(10, score));
    }

    /**
     * Evaluate the optimal horizontal placement for a room on a deck based on adjacency rules
     * @param roomType The room type to place
     * @param shipType The type of ship
     * @param availablePositions Array of X positions available
     * @param existingRooms Array of existing room types and their X positions on this deck
     * @returns The optimal X position from the available positions
     */
    static getOptimalHorizontalPosition(
        roomType: RoomType,
        shipType: string,
        availablePositions: number[],
        existingRooms: Array<{ type: RoomType; x: number }>
    ): number {
        // If no positions available or no existing rooms to optimize against, return random position
        if (availablePositions.length === 0) {
            return -1; // No position available
        }

        if (availablePositions.length === 1) {
            return availablePositions[0]; // Only one choice
        }

        if (existingRooms.length === 0) {
            // No existing rooms, return the middle position or a random one
            const middleIndex = Math.floor(availablePositions.length / 2);
            return availablePositions[middleIndex];
        }

        // Score each available position based on adjacency to existing rooms
        const positionScores = availablePositions.map(position => {
            let totalScore = 0;

            // Check adjacency to each existing room
            for (const existingRoom of existingRooms) {
                // Rooms are adjacent if their X positions differ by 1
                const isAdjacent = Math.abs(position - existingRoom.x) === 1;

                if (isAdjacent) {
                    // Calculate adjacency score 
                    const adjacencyScore = this.getAdjacencyScore(
                        roomType, existingRoom.type, shipType);

                    totalScore += adjacencyScore;
                }
            }

            return { position, score: totalScore };
        });

        // Sort by score (highest first)
        positionScores.sort((a, b) => b.score - a.score);

        // Return the position with the highest score
        return positionScores[0].position;
    }
} 