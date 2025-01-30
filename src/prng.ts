/**
 * A singleton implementation of the xoshiro128** algorithm for pseudo-random number generation
 */
export class PRNG {
  private static instance: PRNG;

  private a: number = 0;
  private b: number = 0;
  private c: number = 0;
  private d: number = 0;

  constructor(seed: number = Date.now()) {
    this.seed(seed);
    PRNG.instance = this;
  }

  /**
   * Get the singleton instance of PRNG
   * @param seed Optional seed value to initialize or reseed the generator
   */
  public static getInstance(): PRNG {
    if (!PRNG.instance) {
      throw new Error(
        'PRNG instance not initialized. Create instance with seed first.'
      );
    }
    return PRNG.instance;
  }

  /**
   * Seed the random number generator
   * @param seed The seed value to use
   */
  public seed(seed: number): void {
    this.a = seed >>> 0;
    this.b = (seed * 31) >>> 0;
    this.c = (seed * 37) >>> 0;
    this.d = (seed * 41) >>> 0;
  }

  /**
   * Generates a random number between 0 and 1
   */
  public next(): number {
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
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
