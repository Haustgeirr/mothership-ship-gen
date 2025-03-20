import type { DungeonGraph, GenerationConfig } from './types';
import { ShipGenerator } from './shipGenerator';
import { RoomGenerator } from './roomGenerator';

/**
 * EnhancedShipGenerator - Combines ship layout generation with 
 * optimized room type placement
 */
export class EnhancedShipGenerator {
    private shipGenerator: ShipGenerator;
    private roomGenerator: RoomGenerator;

    constructor() {
        this.shipGenerator = new ShipGenerator();
        this.roomGenerator = new RoomGenerator();
    }

    /**
     * Generates a ship layout with optimized room type placements
     * 
     * @param shipType The ship type definition
     * @param config Additional configuration options
     * @returns A ship layout with optimized room placements
     */
    generateShip(shipType: { name: string; decks: string }, config: Partial<GenerationConfig> = {}): DungeonGraph {
        console.log(`\n🚀 GENERATING OPTIMIZED SHIP: ${shipType.name} with deck config ${shipType.decks}`);

        // First generate the basic ship layout
        console.log(`\n📐 Generating ship layout...`);
        const shipLayout = this.shipGenerator.generateShipFromType(shipType, config);
        console.log(`✅ Base layout created with ${shipLayout.rooms.length} rooms across ${Math.max(...shipLayout.rooms.map(r => Math.floor(r.y / 50))) + 1} decks`);

        // Apply room placement rules
        console.log(`\n🧩 Applying room placement rules...`);
        return this.roomGenerator.applyRoomTypes(shipLayout, shipType.name);
    }
} 