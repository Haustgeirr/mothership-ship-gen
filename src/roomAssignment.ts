import { RoomType } from './types';
import { Dice } from './dice';

/**
 * Defines the distribution of room types for each ship type
 * The values represent weighted probabilities for room selection
 * Higher numbers = higher probability of that room being selected
 */
export interface RoomTypeDistribution {
    [RoomType.BARRACKS]: number;
    [RoomType.CARGO_HOLD]: number;
    [RoomType.COMMAND]: number;
    [RoomType.COMPUTER]: number;
    [RoomType.CRYOCHAMBER]: number;
    [RoomType.ENGINE]: number;
    [RoomType.ENGINES]: number;
    [RoomType.GALLEY]: number;
    [RoomType.HABITAT_AREA]: number;
    [RoomType.JUMP_DRIVE]: number;
    [RoomType.LIFE_SUPPORT]: number;
    [RoomType.LIVING_QUARTERS]: number;
    [RoomType.MEDBAY]: number;
    [RoomType.SCIENCE_LAB]: number;
    [RoomType.THRUSTERS]: number;
    [RoomType.WEAPON]: number;
}

/**
 * Room type distributions per ship type
 * Values represent weighted probabilities (higher = more likely)
 */
export const ROOM_DISTRIBUTIONS: Record<string, RoomTypeDistribution> = {
    "Mining Frigate": {
        [RoomType.BARRACKS]: 4,
        [RoomType.CARGO_HOLD]: 8,
        [RoomType.COMMAND]: 2,
        [RoomType.COMPUTER]: 2,
        [RoomType.CRYOCHAMBER]: 1,
        [RoomType.ENGINE]: 3,
        [RoomType.ENGINES]: 3,
        [RoomType.GALLEY]: 2,
        [RoomType.HABITAT_AREA]: 1,
        [RoomType.JUMP_DRIVE]: 1,
        [RoomType.LIFE_SUPPORT]: 3,
        [RoomType.LIVING_QUARTERS]: 3,
        [RoomType.MEDBAY]: 2,
        [RoomType.SCIENCE_LAB]: 1,
        [RoomType.THRUSTERS]: 3,
        [RoomType.WEAPON]: 1
    },
    "Freighter": {
        [RoomType.BARRACKS]: 3,
        [RoomType.CARGO_HOLD]: 10,
        [RoomType.COMMAND]: 2,
        [RoomType.COMPUTER]: 2,
        [RoomType.CRYOCHAMBER]: 1,
        [RoomType.ENGINE]: 3,
        [RoomType.ENGINES]: 3,
        [RoomType.GALLEY]: 2,
        [RoomType.HABITAT_AREA]: 2,
        [RoomType.JUMP_DRIVE]: 2,
        [RoomType.LIFE_SUPPORT]: 3,
        [RoomType.LIVING_QUARTERS]: 3,
        [RoomType.MEDBAY]: 1,
        [RoomType.SCIENCE_LAB]: 0,
        [RoomType.THRUSTERS]: 2,
        [RoomType.WEAPON]: 1
    },
    "Raider": {
        [RoomType.BARRACKS]: 4,
        [RoomType.CARGO_HOLD]: 2,
        [RoomType.COMMAND]: 3,
        [RoomType.COMPUTER]: 3,
        [RoomType.CRYOCHAMBER]: 0,
        [RoomType.ENGINE]: 5,
        [RoomType.ENGINES]: 5,
        [RoomType.GALLEY]: 2,
        [RoomType.HABITAT_AREA]: 0,
        [RoomType.JUMP_DRIVE]: 2,
        [RoomType.LIFE_SUPPORT]: 2,
        [RoomType.LIVING_QUARTERS]: 2,
        [RoomType.MEDBAY]: 1,
        [RoomType.SCIENCE_LAB]: 0,
        [RoomType.THRUSTERS]: 4,
        [RoomType.WEAPON]: 5
    },
    "Executive Transport": {
        [RoomType.BARRACKS]: 1,
        [RoomType.CARGO_HOLD]: 2,
        [RoomType.COMMAND]: 3,
        [RoomType.COMPUTER]: 3,
        [RoomType.CRYOCHAMBER]: 1,
        [RoomType.ENGINE]: 2,
        [RoomType.ENGINES]: 2,
        [RoomType.GALLEY]: 4,
        [RoomType.HABITAT_AREA]: 3,
        [RoomType.JUMP_DRIVE]: 2,
        [RoomType.LIFE_SUPPORT]: 3,
        [RoomType.LIVING_QUARTERS]: 5,
        [RoomType.MEDBAY]: 3,
        [RoomType.SCIENCE_LAB]: 1,
        [RoomType.THRUSTERS]: 2,
        [RoomType.WEAPON]: 3
    },
    "Exploration Vessel": {
        [RoomType.BARRACKS]: 2,
        [RoomType.CARGO_HOLD]: 3,
        [RoomType.COMMAND]: 3,
        [RoomType.COMPUTER]: 4,
        [RoomType.CRYOCHAMBER]: 4,
        [RoomType.ENGINE]: 3,
        [RoomType.ENGINES]: 3,
        [RoomType.GALLEY]: 3,
        [RoomType.HABITAT_AREA]: 4,
        [RoomType.JUMP_DRIVE]: 3,
        [RoomType.LIFE_SUPPORT]: 4,
        [RoomType.LIVING_QUARTERS]: 3,
        [RoomType.MEDBAY]: 3,
        [RoomType.SCIENCE_LAB]: 5,
        [RoomType.THRUSTERS]: 2,
        [RoomType.WEAPON]: 1
    },
    "Jumpliner": {
        [RoomType.BARRACKS]: 1,
        [RoomType.CARGO_HOLD]: 3,
        [RoomType.COMMAND]: 2,
        [RoomType.COMPUTER]: 3,
        [RoomType.CRYOCHAMBER]: 2,
        [RoomType.ENGINE]: 2,
        [RoomType.ENGINES]: 2,
        [RoomType.GALLEY]: 4,
        [RoomType.HABITAT_AREA]: 5,
        [RoomType.JUMP_DRIVE]: 5,
        [RoomType.LIFE_SUPPORT]: 4,
        [RoomType.LIVING_QUARTERS]: 5,
        [RoomType.MEDBAY]: 2,
        [RoomType.SCIENCE_LAB]: 1,
        [RoomType.THRUSTERS]: 2,
        [RoomType.WEAPON]: 1
    },
    "Corvette": {
        [RoomType.BARRACKS]: 4,
        [RoomType.CARGO_HOLD]: 1,
        [RoomType.COMMAND]: 4,
        [RoomType.COMPUTER]: 4,
        [RoomType.CRYOCHAMBER]: 0,
        [RoomType.ENGINE]: 4,
        [RoomType.ENGINES]: 4,
        [RoomType.GALLEY]: 2,
        [RoomType.HABITAT_AREA]: 1,
        [RoomType.JUMP_DRIVE]: 2,
        [RoomType.LIFE_SUPPORT]: 3,
        [RoomType.LIVING_QUARTERS]: 2,
        [RoomType.MEDBAY]: 2,
        [RoomType.SCIENCE_LAB]: 1,
        [RoomType.THRUSTERS]: 3,
        [RoomType.WEAPON]: 5
    },
    "Troopship": {
        [RoomType.BARRACKS]: 8,
        [RoomType.CARGO_HOLD]: 5,
        [RoomType.COMMAND]: 3,
        [RoomType.COMPUTER]: 2,
        [RoomType.CRYOCHAMBER]: 3,
        [RoomType.ENGINE]: 2,
        [RoomType.ENGINES]: 2,
        [RoomType.GALLEY]: 3,
        [RoomType.HABITAT_AREA]: 3,
        [RoomType.JUMP_DRIVE]: 2,
        [RoomType.LIFE_SUPPORT]: 3,
        [RoomType.LIVING_QUARTERS]: 2,
        [RoomType.MEDBAY]: 4,
        [RoomType.SCIENCE_LAB]: 1,
        [RoomType.THRUSTERS]: 2,
        [RoomType.WEAPON]: 5
    },
    "Colony Ship": {
        [RoomType.BARRACKS]: 2,
        [RoomType.CARGO_HOLD]: 5,
        [RoomType.COMMAND]: 2,
        [RoomType.COMPUTER]: 3,
        [RoomType.CRYOCHAMBER]: 8,
        [RoomType.ENGINE]: 2,
        [RoomType.ENGINES]: 2,
        [RoomType.GALLEY]: 4,
        [RoomType.HABITAT_AREA]: 8,
        [RoomType.JUMP_DRIVE]: 3,
        [RoomType.LIFE_SUPPORT]: 5,
        [RoomType.LIVING_QUARTERS]: 4,
        [RoomType.MEDBAY]: 4,
        [RoomType.SCIENCE_LAB]: 4,
        [RoomType.THRUSTERS]: 2,
        [RoomType.WEAPON]: 2
    },
    // Default fallback for any unrecognized ship type
    "Default": {
        [RoomType.BARRACKS]: 3,
        [RoomType.CARGO_HOLD]: 3,
        [RoomType.COMMAND]: 3,
        [RoomType.COMPUTER]: 3,
        [RoomType.CRYOCHAMBER]: 2,
        [RoomType.ENGINE]: 3,
        [RoomType.ENGINES]: 3,
        [RoomType.GALLEY]: 3,
        [RoomType.HABITAT_AREA]: 3,
        [RoomType.JUMP_DRIVE]: 2,
        [RoomType.LIFE_SUPPORT]: 3,
        [RoomType.LIVING_QUARTERS]: 3,
        [RoomType.MEDBAY]: 3,
        [RoomType.SCIENCE_LAB]: 2,
        [RoomType.THRUSTERS]: 3,
        [RoomType.WEAPON]: 2
    }
};

/**
 * Utility class for assigning room types to ships
 */
export class RoomAssigner {
    /**
     * Assigns a room type based on the ship type using weighted probabilities
     * @param shipType The type of ship
     * @returns A randomly selected room type based on the ship's typical distribution
     */
    static getRandomRoomType(shipType: string): RoomType {

        // Get the room distribution for this ship type, or use default if not found
        const distribution = ROOM_DISTRIBUTIONS[shipType] || ROOM_DISTRIBUTIONS["Default"];

        // Convert the distribution to an outcome table format
        const outcomes: Record<number, RoomType> = {};
        let cumulativeWeight = 0;

        // Populate outcomes with cumulative weights
        for (const [roomType, weight] of Object.entries(distribution)) {
            if (weight > 0) { // Only include room types with a non-zero probability
                outcomes[cumulativeWeight] = roomType as RoomType;
                cumulativeWeight += weight;
            }
        }

        // Roll a random number between 0 and the total weight
        const roll = Dice.roll(cumulativeWeight, 1).total;

        // Find the corresponding room type for this roll
        let selectedType = RoomType.CARGO_HOLD; // Default fallback
        for (let i = cumulativeWeight - 1; i >= 0; i--) {
            if (outcomes[i] !== undefined && roll >= i) {
                selectedType = outcomes[i];
                break;
            }
        }

        return selectedType;
    }

    /**
     * Gets a list of room types for a given ship based on the number of rooms needed
     * @param shipType The type of ship
     * @param roomCount The number of rooms to generate
     * @param guaranteedRooms Room types that must be included (e.g., COMMAND, ENGINE)
     * @returns An array of room types
     */
    static assignRoomTypesForShip(
        shipType: string,
        roomCount: number,
        guaranteedRooms: RoomType[] = [
            RoomType.COMMAND,
            RoomType.ENGINE,
            RoomType.LIFE_SUPPORT
        ]
    ): RoomType[] {

        const roomTypes: RoomType[] = [];

        // First add all guaranteed rooms
        for (const roomType of guaranteedRooms) {
            if (roomTypes.length < roomCount) {
                roomTypes.push(roomType);
            }
        }

        // Define room types that should be unique (only appear once)
        const uniqueRoomTypes = [
            RoomType.COMMAND,
            RoomType.JUMP_DRIVE,
            RoomType.ENGINE // You can customize this list based on your preferences
        ];

        // Then fill the rest with weighted random selections
        while (roomTypes.length < roomCount) {
            const newType = this.getRandomRoomType(shipType);

            // Skip this room type if it's supposed to be unique and already exists
            if (uniqueRoomTypes.includes(newType) && roomTypes.includes(newType)) {
                continue;
            }

            roomTypes.push(newType);
        }

        return roomTypes;
    }
} 