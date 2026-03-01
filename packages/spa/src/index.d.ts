type Prettify<T> = {
  [K in keyof T]: T[K];
} & {
};

/**
 * Readonly Typed Arrays
 * - ReadonlyInt8Array
 * - ReadonlyUint8Array
 * - ReadonlyUint8ClampedArray
 * - ReadonlyInt16Array
 * - ReadonlyUint16Array
 * - ReadonlyInt32Array
 * - ReadonlyUint32Array
 * - ReadonlyFloat32Array
 * - ReadonlyFloat64Array
 * - ReadonlyBigInt64Array
 * - ReadonlyBigUint64Array
 */

type ReadonlyTypedArrayProperties =
  // Instance Properties
  | "BYTES_PER_ELEMENT"
  | "length"
  | "buffer"
  | "byteLength"
  | "byteOffset"
  // Iteration and query methods
  | "entries"
  | "every"
  | "filter"
  | "find"
  | "findIndex"
  | "forEach"
  | "includes"
  | "indexOf"
  | "join"
  | "keys"
  | "lastIndexOf"
  | "map"
  | "reduce"
  | "reduceRight"
  | "slice"
  | "some"
  | "subarray"
  | "toLocaleString"
  | "toString"
  | "values";

type ReadonlyTypedArraySymbols =
  // Symbols, necessary for iterations (for...of)
  | typeof Symbol.iterator
  | typeof Symbol.toStringTag;

interface ReadonlyInt8Array extends Pick<Int8Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyUint8Array extends Pick<Uint8Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyUint8ClampedArray extends Pick<Uint8ClampedArray, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyInt16Array extends Pick<Int16Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyUint16Array extends Pick<Uint16Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyInt32Array extends Pick<Int32Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyUint32Array extends Pick<Uint32Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyFloat32Array extends Pick<Float32Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyFloat64Array extends Pick<Float64Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: number;
}

interface ReadonlyBigInt64Array extends Pick<BigInt64Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: bigint;
}

interface ReadonlyBigUint64Array extends Pick<BigUint64Array, ReadonlyTypedArrayProperties | ReadonlyTypedArraySymbols> {
  readonly [index: number]: bigint;
}

declare const process: {
  env: {
    NODE_ENV: "development" | "production" | "test";
    VERSION: string;
  };
};
