/**
 * A simple implementation of the xoshiro128** algorithm for pseudo-random number generation
 */
export class PRNG {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number = Date.now()) {
    // Initialize the state with the seed
    this.a = seed >>> 0;
    this.b = (seed * 31) >>> 0;
    this.c = (seed * 37) >>> 0;
    this.d = (seed * 41) >>> 0;
  }

  /**
   * Generates a random number between 0 and 1
   */
  next(): number {
    const t = this.b << 9;
    const r = this.a * 5;
    const result = ((r << 7) | (r >>> 25)) * 9;
    const t2 = this.c << 11;

    this.a = this.b ^ t;
    this.b = this.c ^ t2;
    this.c = this.d ^ (this.d >>> 19);
    this.d = t ^ t2 ^ (this.a << 4);

    return (result >>> 0) / 4294967296;
  }

  /**
   * Generates a random integer between min (inclusive) and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Create a singleton instance of PRNG
export const prng = new PRNG();

/**
 * Gets the current timestamp, useful for storing seeds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Represents the result of a dice roll
 */
interface DiceRollResult {
  total: number;
  rolls: number[];
}

/**
 * Rolls dice with the specified number of sides and quantity
 * @param sides The number of sides on each die
 * @param quantity The number of dice to roll (default: 1)
 * @returns An object containing the total and individual roll results
 */
export function roll(sides: number, quantity: number = 1): DiceRollResult {
  if (sides < 1) throw new Error('Dice must have at least 1 side');
  if (quantity < 1) throw new Error('Must roll at least 1 die');

  const rolls: number[] = [];
  for (let i = 0; i < quantity; i++) {
    rolls.push(prng.nextInt(1, sides));
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
 */
export function d(sides: number): number {
  return roll(sides).total;
}

// Example usage:
// roll(6, 2)    // Roll 2d6, returns { total: 7, rolls: [3, 4] }
// roll(20)      // Roll 1d20, returns { total: 15, rolls: [15] }
// d(6)          // Roll 1d6, returns just the number (e.g., 4)
