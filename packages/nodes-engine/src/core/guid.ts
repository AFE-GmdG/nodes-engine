/**
 * Implements a 128-bit globally unique identifier (GUID). \
 * This implementation is not RFC 4122 compliant as it does not follow the version and variant bits. \
 * It is designed for internal use where uniqueness is required without strict adherence to the RFC.
 */
class Guid {

  /**
   * A GUID with all bits set to zero. \
   * **00000000-0000-0000-0000-000000000000**
   */
  static readonly Empty = new Guid(0n);

  /**
   * A GUID with all bits set to one. \
   * **FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF**
   */
  static readonly Invalid = new Guid(0xFFFF_FFFF_FFFF_FFFF_FFFF_FFFF_FFFF_FFFFn);

  #value: bigint;

  /**
   * The bigint representation of the GUID.
   */
  get value(): bigint {
    return this.#value;
  }

  /**
   * Creates a new, random GUID
   */
  constructor();
  /**
   * Creates a GUID from the given bigint value.
   * @param guid The bigint value representing the GUID.
   */
  constructor(guid: bigint);
  /**
   * Creates a copy of the given GUID.
   * @param other The GUID to copy.
   */
  constructor(other: Guid);
  constructor(param?: bigint | Guid) {
    if (typeof param === "bigint") {
      this.#value = BigInt.asUintN(128, param);
    } else if (param instanceof Guid) {
      this.#value = param.value;
    } else {
      // Do not use F11 while debugging here! The Debugger does not step out of the
      // generator functions at `yield`.
      // Simply step over the generator with F10.
      this.#value = Guid.#guidGenerator.next().value;
    }
  }

  static #guidGenerator = Guid.#createGuid();
  static *#createGuid(): Generator<bigint, never, undefined> {
    // Length of pool must be even!
    const pool = new BigUint64Array(100);
    let poolIndex = 0;
    while (true) {
      if (poolIndex === 0) {
        crypto.getRandomValues(pool);
      }

      // Combine two 64-bit values to form a 128-bit GUID
      const low = pool[poolIndex++];
      // I always can assume poolIndex < pool.length here,
      // because pool.length is even.
      const high = pool[poolIndex++];
      yield BigInt.asUintN(128, (high << 64n) | low);
      poolIndex %= pool.length;
    }
  }

  /**
   * Checks if this GUID is equal to another GUID.
   * @param other The other GUID to compare with.
   */
  equals(other: Guid): boolean {
    return this.#value === other.value;
  }

  /**
   * Returns the string representation of the GUID in the format \
   * **xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx**
   */
  toString(): string {
    const str = this.#value.toString(16).padStart(32, "0");
    return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20)}`;
  }

  /**
   * Returns the JSON representation of the GUID.
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * Parses a GUID from the given string.
   * @param guidString The GUID string to parse
   */
  static parseGuid(guidString: string): Guid {
    const isValidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guidString);
    if (!isValidFormat) {
      throw new Error(`Invalid GUID format: ${guidString}`);
    }
    const hexString = guidString.replace(/-/g, "");
    const value = BigInt(`0x${hexString}`);
    return new Guid(value);
  }
}

export default Guid;
