import Quaternion from "./quaternion";
import Vector3 from "./vector3";

export type Matrix4Tuple = [
  n11: number,
  n12: number,
  n13: number,
  n14: number,
  n21: number,
  n22: number,
  n23: number,
  n24: number,
  n31: number,
  n32: number,
  n33: number,
  n34: number,
  n41: number,
  n42: number,
  n43: number,
  n44: number,
];

/**
 * Represents a 4x4 matrix.
 *
 * The most common use of a 4x4 matrix in 3D computer graphics is as a transformation matrix.
 * For an introduction to transformation matrices as used in WebGL, check out [this tutorial]{@link https://www.opengl-tutorial.org/beginners-tutorials/tutorial-3-matrices}
 *
 * This allows a 3D vector representing a point in 3D space to undergo
 * transformations such as translation, rotation, shear, scale, reflection,
 * orthogonal or perspective projection and so on, by being multiplied by the
 * matrix. This is known as `applying` the matrix to the vector.
 *
 * A Note on Row-Major and Column-Major Ordering:
 *
 * The constructor and {@link Matrix4#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix4#elements} array in column-major order.
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix4();
 * m.set( 11, 12, 13, 14,
 *        21, 22, 23, 24,
 *        31, 32, 33, 34,
 *        41, 42, 43, 44 );
 * ```
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21, 31, 41,
 *                12, 22, 32, 42,
 *                13, 23, 33, 43,
 *                14, 24, 34, 44 ];
 * ```
 * and internally all calculations are performed using column-major ordering.
 * However, as the actual ordering makes no difference mathematically and
 * most people are used to thinking about matrices in row-major order, the
 * three.js documentation shows matrices in row-major order. Just bear in
 * mind that if you are reading the source code, you'll have to take the
 * transpose of any matrices outlined here to make sense of the calculations.
 */
class Matrix4 {
  /**
   * Der Float32Array, der die Elemente der Matrix enthält.
   * Kann auch extern und mit Offset übergeben werden, um mehrere
   * Matrizen in einem großen Speicherbereich zu verwalten.
   */
  #data: Float32Array;
  get data() { return this.#data; }

  /** Ein optionales Label für Debugging-Zwecke, z.B. um die Matrix in GPU-Buffer-Logs zu identifizieren. */
  #label: string;
  get label() { return this.#label; }
  set label(value: string) { this.#label = value; }

  // Getter angepasst an Column-Major interne Speicherung
  get m11() { return this.#data[0]; }
  get m21() { return this.#data[1]; }
  get m31() { return this.#data[2]; }
  get m41() { return this.#data[3]; }

  get m12() { return this.#data[4]; }
  get m22() { return this.#data[5]; }
  get m32() { return this.#data[6]; }
  get m42() { return this.#data[7]; }

  get m13() { return this.#data[8]; }
  get m23() { return this.#data[9]; }
  get m33() { return this.#data[10]; }
  get m43() { return this.#data[11]; }

  get m14() { return this.#data[12]; }
  get m24() { return this.#data[13]; }
  get m34() { return this.#data[14]; }
  get m44() { return this.#data[15]; }

  // Setter angepasst an Column-Major interne Speicherung
  set m11(value: number) { this.#data[0] = value; }
  set m21(value: number) { this.#data[1] = value; }
  set m31(value: number) { this.#data[2] = value; }
  set m41(value: number) { this.#data[3] = value; }

  set m12(value: number) { this.#data[4] = value; }
  set m22(value: number) { this.#data[5] = value; }
  set m32(value: number) { this.#data[6] = value; }
  set m42(value: number) { this.#data[7] = value; }

  set m13(value: number) { this.#data[8] = value; }
  set m23(value: number) { this.#data[9] = value; }
  set m33(value: number) { this.#data[10] = value; }
  set m43(value: number) { this.#data[11] = value; }

  set m14(value: number) { this.#data[12] = value; }
  set m24(value: number) { this.#data[13] = value; }
  set m34(value: number) { this.#data[14] = value; }
  set m44(value: number) { this.#data[15] = value; }

  /**
   * Setzt alle Elemente der Matrix auf die angegebenen Werte. \
   * Die Werte werden in row-major Reihenfolge übergeben, um die Lesbarkeit zu verbessern. \
   * Intern werden sie jedoch in column-major Reihenfolge gespeichert, um mit WebGPU kompatibel zu sein.
   */
  set(
    n11: number, n12: number, n13: number, n14: number,
    n21: number, n22: number, n23: number, n24: number,
    n31: number, n32: number, n33: number, n34: number,
    n41: number, n42: number, n43: number, n44: number,
  ): Matrix4 {
    this.#data.set([
      n11, n21, n31, n41,
      n12, n22, n32, n42,
      n13, n23, n33, n43,
      n14, n24, n34, n44,
    ]);
    return this;
  }

  /**
   * Erstellt eine neue 4x4 Matrix.
   * Der Buffer muss mindestens Platz für 16 Float32 (64 Byte) ab dem Element-Offset bieten.
   * Wenn kein Buffer übergeben wird, wird ein eigener Float32Array mit 16 Elementen erstellt.
   * @param dataOrBuffer Entweder ein ArrayBuffer oder ein Float32Array, der die Matrixdaten enthält oder bereitstellt.
   * @param elementOffset Der Offset (in Float32-Elementen) im Buffer, an dem die Matrixdaten beginnen. Standard ist 0.
   * @param label Ein optionales Label für Fehler- und Diagnosezwecke.
   * @param withIdentity Wenn true, wird die Matrix mit der Einheitsmatrix initialisiert. \
   * Andernfalls werden die Werte aus dem übergebenen Buffer oder Array übernommen. \
   * Standard ist false.
   */
  constructor(
    dataOrBuffer: ArrayBuffer | Float32Array | Matrix4Tuple = new Float32Array(16),
    elementOffset: number = 0,
    label: string = "Matrix4",
    withIdentity: boolean = false,
  ) {
    const requiredElements = 16;

    if (elementOffset < 0) {
      throw new Error("Element offset must be a non-negative integer.");
    }
    if (elementOffset % requiredElements !== 0) {
      throw new Error("Element offset must be a multiple of 16 to ensure proper alignment for a 4x4 matrix.");
    }

    if (dataOrBuffer instanceof Float32Array) {
      if (dataOrBuffer.length < elementOffset + requiredElements) {
        throw new Error("The provided Float32Array is too small to hold a 4x4 matrix at the specified offset.");
      }
      this.#data = (elementOffset === 0)
        ? dataOrBuffer
        : dataOrBuffer.subarray(elementOffset, elementOffset + requiredElements);
    } else if (dataOrBuffer instanceof ArrayBuffer) {
      if (dataOrBuffer.byteLength < (elementOffset + requiredElements) << 2) {
        throw new Error("The provided ArrayBuffer is too small to hold a 4x4 matrix at the specified offset.");
      }
      this.#data = new Float32Array(dataOrBuffer, elementOffset << 2, requiredElements);
    } else {
      // Es wurde ein Tuple oder ein anderes Array-ähnliches Objekt übergeben. Versuche, es in ein Float32Array zu konvertieren.
      if (!(Array.isArray(dataOrBuffer)) || dataOrBuffer.length !== requiredElements || !dataOrBuffer.every(n => typeof n === "number")) {
        // eslint-disable-next-line max-len
        throw new Error("Invalid data provided to Matrix4 constructor.\nExpected an ArrayBuffer, Float32Array, or an array-like object with 16 numeric elements.");
      }
      this.#data = new Float32Array(dataOrBuffer);
    }
    this.#label = label;

    if (withIdentity) {
      this.#data.set([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]);
    }
  }

  /**
   * Tauscht den zu Grundeliegenden Buffer und den Element-Offset der Matrix aus.
   * **Achtung:** Es werden keine alten Daten übernommen!
   * @param dataOrBuffer Entweder ein ArrayBuffer oder ein Float32Array, der die Matrixdaten enthält oder bereitstellt.
   * @param elementOffset Der Offset (in Float32-Elementen) im Buffer, an dem die Matrixdaten beginnen. Standard ist 0.
   */
  setBuffer(dataOrBuffer: ArrayBuffer | Float32Array, elementOffset: number = 0) {
    const requiredElements = 16;

    if (elementOffset < 0) {
      throw new Error("Element offset must be a non-negative integer.");
    }
    if (elementOffset % requiredElements !== 0) {
      throw new Error("Element offset must be a multiple of 16 to ensure proper alignment for a 4x4 matrix.");
    }

    if (dataOrBuffer instanceof Float32Array) {
      if (dataOrBuffer.length < elementOffset + requiredElements) {
        throw new Error("The provided Float32Array is too small to hold a 4x4 matrix at the specified offset.");
      }
      this.#data = (elementOffset === 0)
        ? dataOrBuffer
        : dataOrBuffer.subarray(elementOffset, elementOffset + requiredElements);
      return this;
    }
    if (dataOrBuffer.byteLength < (elementOffset + requiredElements) << 2) {
      throw new Error("The provided ArrayBuffer is too small to hold a 4x4 matrix at the specified offset.");
    }
    this.#data = new Float32Array(dataOrBuffer, elementOffset << 2, requiredElements);
    return this;
  }
}

export default Matrix4;
