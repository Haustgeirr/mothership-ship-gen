import { PRNG } from './prng';

/**
 * Represents the result of a dice roll
 */
export interface DiceRollResult {
  total: number;
  rolls: number[];
}

/**
 * A class for handling dice rolls using the PRNG singleton
 */
export class Dice {
  /**
   * Rolls dice with the specified number of sides and quantity
   * @param sides The number of sides on each die
   * @param quantity The number of dice to roll (default: 1)
   * @returns An object containing the total and individual roll results
   * @throws Error if PRNG singleton hasn't been initialized
   */
  public static roll(sides: number, quantity: number = 1): DiceRollResult {
    const rng = PRNG.getInstance();

    if (sides < 1) throw new Error('Dice must have at least 1 side');
    if (quantity < 1) throw new Error('Must roll at least 1 die');

    const rolls: number[] = [];
    for (let i = 0; i < quantity; i++) {
      rolls.push(rng.nextInt(1, sides));
    }

    return {
      total: rolls.reduce((sum, roll) => sum + roll, 0),
      rolls,
    };
  }

  /**
   * Convenience function to roll a single die and get just the result
   * @param sides The number of sides on the die
   * @returns The result of the roll
   * @throws Error if PRNG singleton hasn't been initialized
   */
  public static d(sides: number): number {
    return this.roll(sides).total;
  }
}

// Example usage:
// Dice.roll(6, 2)    // Roll 2d6, returns { total: 7, rolls: [3, 4] }
// Dice.roll(20)      // Roll 1d20, returns { total: 15, rolls: [15] }
// Dice.d(6)          // Roll 1d6, returns just the number (e.g., 4)
