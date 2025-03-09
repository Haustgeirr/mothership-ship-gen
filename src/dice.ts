import { PRNG } from './prng';

/**
 * Represents the result of a dice roll
 */
export interface DiceRollResult {
  total: number;
  rolls: number[];
}

/**
 * Represents a range of values and their associated outcome
 */
export interface OutcomeRange {
  min: number;
  max: number;
  outcome: string;
}

/**
 * Represents a table of outcomes for dice rolls
 * The keys are the roll values and the values are the outcomes
 * For example: { 1: "Critical failure", 10: "Success", 20: "Critical success" }
 * In this example, rolling 1-9 gives "Critical failure", 10-19 gives "Success", and 20 gives "Critical success"
 */
export interface OutcomeTable {
  sides: number;
  quantity: number;
  outcomes: Record<number, string>;
  defaultOutcome?: string;
}

/**
 * A class for handling dice rolls using the PRNG singleton
 * Example usage:
 * Dice.roll(6, 2)    // Roll 2d6, returns { total: 7, rolls: [3, 4] }
 * Dice.roll(20)      // Roll 1d20, returns { total: 15, rolls: [15] }
 * Dice.d(6)          // Roll 1d6, returns just the number (e.g., 4)
 */
export class Dice {
  /**
   * Rolls dice with the specified number of sides and quantity
   * @param sides The number of sides on each die
   * @param quantity The number of dice to roll (default: 1)
   * @param minValue The minimum value on each die (default: 1)
   * @returns An object containing the total and individual roll results
   * @throws Error if PRNG singleton hasn't been initialized
   */
  public static roll(sides: number, quantity: number = 1, minValue: number = 1): DiceRollResult {
    const rng = PRNG.getInstance();

    if (sides < 1) throw new Error('Dice must have at least 1 side');
    if (quantity < 1) throw new Error('Must roll at least 1 die');
    if (minValue < 0) throw new Error('Minimum value cannot be negative');
    if (minValue > sides) throw new Error('Minimum value cannot be greater than sides');

    const rolls: number[] = [];
    for (let i = 0; i < quantity; i++) {
      rolls.push(rng.nextInt(minValue, minValue + sides - 1));
    }

    return {
      total: rolls.reduce((sum, roll) => sum + roll, 0),
      rolls,
    };
  }

  /**
   * Convenience function to roll a single die and get just the result
   * @param sides The number of sides on the die
   * @param minValue The minimum value on the die (default: 1)
   * @returns The result of the roll
   * @throws Error if PRNG singleton hasn't been initialized
   */
  public static d(sides: number, minValue: number = 1): number {
    return this.roll(sides, 1, minValue).total;
  }

  /**
   * Rolls dice and returns an outcome based on the provided outcome table
   * @param table The outcome table to use for determining the result
   * @returns The outcome string corresponding to the roll result
   * @throws Error if PRNG singleton hasn't been initialized or if no matching outcome is found
   */
  public static rollWithOutcome(table: OutcomeTable): string {
    // Infer the minimum value from the outcomes
    const minValue = this.inferMinValue(table.outcomes);
    const result = this.roll(table.sides, table.quantity, minValue);
    return this.getOutcome(result.total, table);
  }

  /**
   * Infers the minimum value from the outcomes object
   * @param outcomes The outcomes object
   * @returns The inferred minimum value (0 or 1)
   */
  private static inferMinValue(outcomes: Record<number, string>): number {
    const keys = Object.keys(outcomes).map(Number);
    return keys.some(key => key === 0) ? 0 : 1;
  }

  /**
   * Looks up an outcome from a table based on a value
   * @param value The value to look up in the outcome table
   * @param table The outcome table to use for determining the result
   * @returns The outcome string corresponding to the value
   * @throws Error if no matching outcome is found and no default is provided
   */
  public static getOutcome(value: number, table: OutcomeTable): string {
    // Infer the minimum value from the outcomes
    const minValue = this.inferMinValue(table.outcomes);

    // Validate that the value is within the possible range for the dice configuration
    const minPossible = minValue * table.quantity;
    const maxPossible = (minValue + table.sides - 1) * table.quantity;

    if (value < minPossible || value > maxPossible) {
      throw new Error(`Value ${value} is outside the possible range (${minPossible}-${maxPossible}) for ${table.quantity}d${table.sides}`);
    }

    // Get all threshold values from the outcomes object
    const thresholds = Object.keys(table.outcomes)
      .map(Number)
      .sort((a, b) => a - b);

    // Find the appropriate threshold for the value
    let selectedThreshold: number | null = null;

    for (const threshold of thresholds) {
      if (value >= threshold) {
        selectedThreshold = threshold;
      } else {
        break;
      }
    }

    if (selectedThreshold !== null) {
      return table.outcomes[selectedThreshold];
    }

    if (table.defaultOutcome !== undefined) {
      return table.defaultOutcome;
    }

    throw new Error(`No outcome found for value ${value} in the provided table`);
  }

  /**
   * Creates an outcome table from a simple object mapping values to outcomes
   * @param sides The number of sides on each die
   * @param quantity The number of dice to roll (default: 1)
   * @param outcomes An object where keys are threshold values and values are outcomes
   *                 For example: { 1: "Critical failure", 10: "Success", 20: "Critical success" }
   *                 Or for 0-based dice: { 0: "Critical failure", 50: "Success", 99: "Critical success" }
   * @param defaultOutcome Optional default outcome if no threshold matches
   * @returns A properly formatted OutcomeTable
   */
  public static createOutcomeTable(
    sides: number,
    quantity: number = 1,
    outcomes: Record<number, string>,
    defaultOutcome?: string
  ): OutcomeTable {
    if (sides < 1) throw new Error('Dice must have at least 1 side');
    if (quantity < 1) throw new Error('Must have at least 1 die');

    // Infer the minimum value from the outcomes
    const minValue = this.inferMinValue(outcomes);

    const minPossible = minValue * quantity;
    const maxPossible = (minValue + sides - 1) * quantity;

    // Validate thresholds
    const thresholds = Object.keys(outcomes).map(Number);

    for (const threshold of thresholds) {
      if (isNaN(threshold)) {
        throw new Error(`Invalid threshold: ${threshold}. Must be a number.`);
      }

      if (threshold < minPossible || threshold > maxPossible) {
        throw new Error(`Threshold ${threshold} is outside the possible range (${minPossible}-${maxPossible}) for ${quantity}d${sides}`);
      }
    }

    return { sides, quantity, outcomes, defaultOutcome };
  }

  /**
   * Parses a string containing dice notation (e.g., "4D10 Containers of Ore") and replaces
   * the dice notation with actual rolled values.
   * 
   * @param text The string containing dice notation to parse and roll
   * @returns The string with dice notation replaced by actual rolled values
   * 
   * Examples:
   * "4D10 Containers of Ore" might return "27 Containers of Ore"
   * "You find 2D6 gold and 1D4 silver" might return "You find 8 gold and 3 silver"
   */
  public static parseAndRollDynamicString(text: string): string {
    // Regular expression to match dice notation: XdY or XDY where X and Y are numbers
    // Captures: group 1 = quantity (X), group 2 = sides (Y)
    const diceRegex = /(\d+)[dD](\d+)/g;

    // Replace all instances of dice notation with rolled values
    return text.replace(diceRegex, (match, quantity, sides) => {
      const quantityNum = parseInt(quantity, 10);
      const sidesNum = parseInt(sides, 10);

      // Roll the dice and return the total
      const result = this.roll(sidesNum, quantityNum);
      return result.total.toString();
    });
  }

  /**
   * Rolls with an outcome from a table and processes any dice notation in the outcome string
   * 
   * @param table The outcome table to use for determining the result
   * @returns The outcome string with any dice notation replaced by actual rolled values
   */
  public static rollWithDynamicOutcome(table: OutcomeTable): string {
    // First get the basic outcome string from the table
    const outcomeString = this.rollWithOutcome(table);

    // Then parse and roll any dice notation in the outcome string
    return this.parseAndRollDynamicString(outcomeString);
  }
}
