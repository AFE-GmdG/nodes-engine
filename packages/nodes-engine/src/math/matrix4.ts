import Quaternion from "./quaternion";
import Vector3 from "./vector3";

/**
 * Ein Tuple, das die 16 Elemente einer 4x4-Matrix in row-major Reihenfolge repräsentiert.
 */
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
 * Repräsentiert eine 4x4-Matrix, optimiert für WebGPU-Anwendungen.
 *
 * In der 3D-Grafik dienen 4x4-Matrizen primär als Transformationsmatrizen. Sie ermöglichen
 * die Manipulation von 3D-Vektoren durch Translation, Rotation, Skalierung sowie
 * orthogonale oder perspektivische Projektionen.
 *
 * ### Speicherlayout & WebGPU-Konventionen:
 * Diese Klasse ist strikt auf die Anforderungen von WebGPU (und WGSL) ausgelegt:
 * 1. **Column-Major Storage:** Intern werden die Daten im {@link Matrix4#data} Array
 *    spaltenweise (column-major) gespeichert. \
 *    Dies entspricht dem Standard-Layout von `mat4x4<f32>` in WGSL.
 * 2. **Row-Major Input:** Der Konstruktor und die {@link Matrix4#set}-Methode nehmen
 *    Argumente in zeilenweiser (row-major) Reihenfolge entgegen. \
 *    Dies dient der besseren Lesbarkeit im Code, da es der mathematischen Schreibweise entspricht.
 *
 * @example
 * **Beispiel für das Mapping:**
 * ```ts
 *   matrix.set(
 *     11, 12, 13, 14,  // Zeile 1
 *     21, 22, 23, 24,  // Zeile 2
 *     31, 32, 33, 34,  // Zeile 3
 *     41, 42, 43, 44,  // Zeile 4
 *   );
 * ```
 * Resultiert in folgendem internen Speicher-Layout:
 * ```ts
 *   matrix.data = [
 *     11, 21, 31, 41,  // Spalte 1
 *     12, 22, 32, 42,  // Spalte 2
 *     13, 23, 33, 43,  // Spalte 3
 *     14, 24, 34, 44,  // Spalte 4
 *  ];
 * ```
 *
 * ### Performance & ECS-Integration:
 * Die Klasse unterstützt das Mapping auf externe Buffer.
 * Durch die Übergabe eines Offsets im Konstruktor kann eine Matrix-Instanz als "View"
 * auf einen Teilbereich eines großen `Float32Array` (z.B. innerhalb eines ECS-Speichers)
 * agieren. Dies minimiert Garbage Collection und ermöglicht hocheffiziente GPU-Transfers
 * mittels `device.queue.writeBuffer`.
 *
 * ### TODO: Fehlende Funktionen für Matrix4
 * 1. Rotationen
 *    - Rotation um X-Achse: \
 *      Erzeugt eine Matrix, die um einen gegebenen Winkel um die X-Achse rotiert.
 *    - Rotation um Y-Achse: \
 *      Erzeugt eine Matrix, die um einen gegebenen Winkel um die Y-Achse rotiert.
 *    - Rotation um Z-Achse: \
 *      Erzeugt eine Matrix, die um einen gegebenen Winkel um die Z-Achse rotiert.
 *    - Rotation aus Euler-Winkeln: \
 *      Erzeugt eine Matrix aus Euler-Winkeln und einer gegebenen Reihenfolge (EulerOrder), z.B. "XYZ", "YXZ" etc.
 * 2. Matrix-Invertierung
 *    - Invertierung: \
 *      Berechnet die Inverse der Matrix (wichtig für Transformationen und Kameras).
 * 3. Orthogonale Matrizen
 *    - Erstellen einer orthogonalen Matrix: \
 *      Erzeugt eine Matrix, die nur Rotation und Translation enthält (keine Skalierung oder Scherung).
 *    - Prüfung auf Orthogonalität: \
 *      Prüft, ob die Matrix orthogonal ist (z.B. für reine Rotationsmatrizen).
 * 4. Weitere Transformationen
 *    - Translation: \
 *      Setzt die Matrix auf eine reine Translation.
 *    - Skalierung: \
 *      Setzt die Matrix auf eine reine Skalierung.
 *    - Shear (Scherung): \
 *      Erzeugt eine Matrix für Schertransformationen.
 * 5. Matrix-Operationen
 *    - Matrix-Inversion (schnell für affine Matrizen): \
 *      Optimierte Invertierung für Matrizen, die nur Rotation, Skalierung und Translation enthalten.
 *    - Matrix-Decomposition: \
 *      Zerlegt die Matrix in Position, Rotation (Quaternion/Euler) und Skalierung.
 * 6. Spezielle Matrizen
 *    - Erstellen einer orthogonalen Basis aus drei Vektoren: \
 *      Z.B. für LookAt oder Basiswechsel.
 *    - Erstellen einer Spiegelungsmatrix: \
 *      Für Spiegelungen an Ebenen.
 * 7. Interpolation
 *    - Matrix-Lerp (Lineare Interpolation): \
 *      Interpoliert zwischen zwei Matrizen.
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

  /**
   * Setzt die Elemente der Matrix auf die Werte der Einheitsmatrix zurück.
   */
  identity(): Matrix4 {
    this.#data.set([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
    return this;
  }

  /**
   * Kopiert die Werte der übergebenen Matrix in diese Matrix.
   * @param source Die Matrix, deren Werte kopiert werden sollen.
   */
  copy(source: Matrix4): Matrix4 {
    this.#data.set(source.#data);
    return this;
  }

  /**
   * Kopiert nur die Position (die Elemente in der letzten Spalte) von der
   * übergebenen Matrix in diese Matrix.
   * @param source Die Matrix, von denen die Position übernommen wird.
   */
  copyPosition(source: Matrix4): Matrix4 {
    this.#data[12] = source.#data[12];
    this.#data[13] = source.#data[13];
    this.#data[14] = source.#data[14];
    return this;
  }

  /**
   * Multipliziert diese Matrix mit der übergebenen Matrix. \
   * Die Multiplikation erfolgt in der Reihenfolge: `this = this * m`. \
   * Das bedeutet, dass die Transformationen von `m` **nach** den Transformationen von `this` angewendet werden.
   * @param m Die Matrix, mit der multipliziert werden soll.
   */
  multiply(m: Matrix4): Matrix4 {
    return this.multiplyMatrices(this, m);
  }

  /**
   * Multipliziert diese Matrix mit der übergebenen Matrix. \
   * Die Multiplikation erfolgt in der Reihenfolge: `this = m * this`. \
   * Das bedeutet, dass die Transformationen von `m` **vor** den Transformationen von `this` angewendet werden.
   * @param m Die Matrix, mit der multipliziert werden soll.
   */
  premultiply(m: Matrix4): Matrix4 {
    return this.multiplyMatrices(m, this);
  }

  /**
   * Multipliziert zwei Matrizen und speichert das Ergebnis in dieser Matrix. \
   * Die Ausgangsmatrizen werden nicht modifiziert,
   * es sei denn, sie sind identisch mit dieser Matrix. (Selbstreferenz)
   * @param a Die erste Matrix.
   * @param b Die zweite Matrix.
   */
  multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    const a11 = a.#data[0], a12 = a.#data[4], a13 = a.#data[8], a14 = a.#data[12];
    const a21 = a.#data[1], a22 = a.#data[5], a23 = a.#data[9], a24 = a.#data[13];
    const a31 = a.#data[2], a32 = a.#data[6], a33 = a.#data[10], a34 = a.#data[14];
    const a41 = a.#data[3], a42 = a.#data[7], a43 = a.#data[11], a44 = a.#data[15];

    const b11 = b.#data[0], b12 = b.#data[4], b13 = b.#data[8], b14 = b.#data[12];
    const b21 = b.#data[1], b22 = b.#data[5], b23 = b.#data[9], b24 = b.#data[13];
    const b31 = b.#data[2], b32 = b.#data[6], b33 = b.#data[10], b34 = b.#data[14];
    const b41 = b.#data[3], b42 = b.#data[7], b43 = b.#data[11], b44 = b.#data[15];

    this.#data[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    this.#data[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    this.#data[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    this.#data[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    this.#data[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    this.#data[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    this.#data[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    this.#data[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    this.#data[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    this.#data[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    this.#data[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    this.#data[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    this.#data[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    this.#data[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    this.#data[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    this.#data[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    return this;
  }

  /**
   * Multipliziert jede Komponente dieser Matrix mit dem übergebenen Skalar.
   * @param s Der Skalar, mit dem multipliziert werden soll.
   */
  multiplyScalar(s: number): Matrix4 {
    this.#data[0] *= s; this.#data[4] *= s; this.#data[8] *= s; this.#data[12] *= s;
    this.#data[1] *= s; this.#data[5] *= s; this.#data[9] *= s; this.#data[13] *= s;
    this.#data[2] *= s; this.#data[6] *= s; this.#data[10] *= s; this.#data[14] *= s;
    this.#data[3] *= s; this.#data[7] *= s; this.#data[11] *= s; this.#data[15] *= s;

    return this;
  }

  /**
   * Berechnet die Determinante dieser Matrix.
   */
  determinant(): number {
    const n11 = this.#data[0], n12 = this.#data[4], n13 = this.#data[8], n14 = this.#data[12];
    const n21 = this.#data[1], n22 = this.#data[5], n23 = this.#data[9], n24 = this.#data[13];
    const n31 = this.#data[2], n32 = this.#data[6], n33 = this.#data[10], n34 = this.#data[14];
    const n41 = this.#data[3], n42 = this.#data[7], n43 = this.#data[11], n44 = this.#data[15];

    return (
      n41 * (
        n14 * n23 * n32
        - n13 * n24 * n32
        - n14 * n22 * n33
        + n12 * n24 * n33
        + n13 * n22 * n34
        - n12 * n23 * n34
      ) +
      n42 * (
        n11 * n23 * n34
        - n11 * n24 * n33
        + n14 * n21 * n33
        - n13 * n21 * n34
        + n13 * n24 * n31
        - n14 * n23 * n31
      ) +
      n43 * (
        n11 * n24 * n32
        - n11 * n22 * n34
        - n14 * n21 * n32
        + n12 * n21 * n34
        + n14 * n22 * n31
        - n12 * n24 * n31
      ) +
      n44 * (
        -n13 * n22 * n31
        - n11 * n23 * n32
        + n11 * n22 * n33
        + n13 * n21 * n32
        - n12 * n21 * n33
        + n12 * n23 * n31
      )
    );
  }

  /**
   * Transponiert diese Matrix.
   */
  transpose(): Matrix4 {
    let tmp: number;
    tmp = this.#data[1]; this.#data[1] = this.#data[4]; this.#data[4] = tmp;
    tmp = this.#data[2]; this.#data[2] = this.#data[8]; this.#data[8] = tmp;
    tmp = this.#data[6]; this.#data[6] = this.#data[9]; this.#data[9] = tmp;

    tmp = this.#data[3]; this.#data[3] = this.#data[12]; this.#data[12] = tmp;
    tmp = this.#data[7]; this.#data[7] = this.#data[13]; this.#data[13] = tmp;
    tmp = this.#data[11]; this.#data[11] = this.#data[14]; this.#data[14] = tmp;

    return this;
  }

  /**
   * Setzt diese Matrix auf die Transformation, die durch die übergebenen
   * Position, Quaternion und Skalierung beschrieben wird.
   * @param position Die Position der Transformation.
   * @param quaternion Die Rotation der Transformation als Quaternion.
   * @param scale Die Skalierung der Transformation.
   */
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): Matrix4 {
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const sx = scale.x, sy = scale.y, sz = scale.z;

    this.#data[0] = (1 - (yy + zz)) * sx;
    this.#data[1] = (xy + wz) * sx;
    this.#data[2] = (xz - wy) * sx;
    this.#data[3] = 0;

    this.#data[4] = (xy - wz) * sy;
    this.#data[5] = (1 - (xx + zz)) * sy;
    this.#data[6] = (yz + wx) * sy;
    this.#data[7] = 0;

    this.#data[8] = (xz + wy) * sz;
    this.#data[9] = (yz - wx) * sz;
    this.#data[10] = (1 - (xx + yy)) * sz;
    this.#data[11] = 0;

    this.#data[12] = position.x;
    this.#data[13] = position.y;
    this.#data[14] = position.z;
    this.#data[15] = 1;

    return this;
  }

  // - internal vectors for re-use
  static #v1 = new Vector3();
  static #v2 = new Vector3();
  static #v3 = new Vector3();

  /**
   * Setzt diese Matrix auf die Kamera-LookAt-Transformation, die durch die übergebenen
   * Augen, Ziel und Up-Vektoren beschrieben wird.
   * @param eye Die Position der Kamera.
   * @param target Das Ziel, auf das die Kamera schaut.
   * @param up Der Up-Vektor der Kamera.
   */
  createCameraLookAtMatrix(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    Matrix4.#v1.subVectors(eye, target).normalize();       // Forward (RH: eye - target)
    Matrix4.#v2.crossVectors(up, Matrix4.#v1).normalize(); // Right   (RH: cross(up, forward))
    Matrix4.#v3.crossVectors(Matrix4.#v1, Matrix4.#v2);    // Up      (RH: cross(forward, right))

    this.#data.set([
      Matrix4.#v2.x, Matrix4.#v3.x, Matrix4.#v1.x, 0,
      Matrix4.#v2.y, Matrix4.#v3.y, Matrix4.#v1.y, 0,
      Matrix4.#v2.z, Matrix4.#v3.z, Matrix4.#v1.z, 0,
      -Matrix4.#v2.dot(eye), -Matrix4.#v3.dot(eye), -Matrix4.#v1.dot(eye), 1,
    ]);

    return this;
  }

  /**
   * Setzt diese Matrix auf die Perspektiv-Projektions-Transformation, die durch die übergebenen
   * Frustum-Parameter beschrieben wird.
   * @param left Die linke Seite des Sichtvolumens.
   * @param right Die rechte Seite des Sichtvolumens.
   * @param top Die obere Seite des Sichtvolumens.
   * @param bottom Die untere Seite des Sichtvolumens.
   * @param near Die nahe Ebene des Sichtvolumens.
   * @param far Die ferne Ebene des Sichtvolumens.
   */
  createPerspective(left: number, right: number, top: number, bottom: number, near: number, far: number): Matrix4 {
    const x = 2 * near / (right - left);
    const y = 2 * near / (top - bottom);

    const a = (right + left) / (right - left);
    const b = (top + bottom) / (top - bottom);

    const c = -far / (far - near);
    const d = (-far * near) / (far - near);

    this.#data.set([
      x, 0, 0, 0,
      0, y, 0, 0,
      a, b, c, -1,
      0, 0, d, 0,
    ]);

    return this;
  }

  /**
   * Setzt diese Matrix auf die Perspektiv-Projektions-Transformation, die durch die übergebenen
   * Frustum-Parameter beschrieben wird, wobei die Frustum-Parameter aus einem vertikalen Sichtwinkel (FoV)
   * und einem Seitenverhältnis abgeleitet werden.
   * @param fovY Der vertikale Sichtwinkel in Radiant.
   * @param aspect Das Seitenverhältnis (Breite / Höhe) des Sichtvolumens.
   * @param near Die nahe Ebene des Sichtvolumens.
   * @param far Die ferne Ebene des Sichtvolumens.
   */
  createPerspectiveFoV(fovY: number, aspect: number, near: number, far: number): Matrix4 {
    const f = 1.0 / Math.tan(fovY / 2);
    const rangeInv = 1.0 / (near - far);

    this.#data.set([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, far * rangeInv, -1,
      0, 0, near * far * rangeInv, 0,
    ]);

    return this;
  }

  /**
   * Vergleicht diese Matrix mit einer anderen Matrix und prüft, ob sie innerhalb einer bestimmten Toleranz gleich sind.
   * @param matrix Die zu vergleichende Matrix.
   * @param tolerance Die Toleranz für den Vergleich.
   */
  equals(matrix: Matrix4, tolerance: number = 1e-6): boolean {
    // Unrolled loop für bessere Performance
    return (this === matrix) || (
      Math.abs(this.#data[0] - matrix.#data[0]) <= tolerance
      && Math.abs(this.#data[1] - matrix.#data[1]) <= tolerance
      && Math.abs(this.#data[2] - matrix.#data[2]) <= tolerance
      && Math.abs(this.#data[3] - matrix.#data[3]) <= tolerance
      && Math.abs(this.#data[4] - matrix.#data[4]) <= tolerance
      && Math.abs(this.#data[5] - matrix.#data[5]) <= tolerance
      && Math.abs(this.#data[6] - matrix.#data[6]) <= tolerance
      && Math.abs(this.#data[7] - matrix.#data[7]) <= tolerance
      && Math.abs(this.#data[8] - matrix.#data[8]) <= tolerance
      && Math.abs(this.#data[9] - matrix.#data[9]) <= tolerance
      && Math.abs(this.#data[10] - matrix.#data[10]) <= tolerance
      && Math.abs(this.#data[11] - matrix.#data[11]) <= tolerance
      && Math.abs(this.#data[12] - matrix.#data[12]) <= tolerance
      && Math.abs(this.#data[13] - matrix.#data[13]) <= tolerance
      && Math.abs(this.#data[14] - matrix.#data[14]) <= tolerance
      && Math.abs(this.#data[15] - matrix.#data[15]) <= tolerance
    );
  }

  /**
   * Vergleicht diese Matrix mit einer anderen Matrix und prüft, ob sie exakt gleich sind (keine Toleranz).
   * @param matrix Die zu vergleichende Matrix.
   */
  equalsStrict(matrix: Matrix4): boolean {
    // Unrolled loop für bessere Performance
    return (this === matrix) || (
      this.#data[0] === matrix.#data[0]
      && this.#data[1] === matrix.#data[1]
      && this.#data[2] === matrix.#data[2]
      && this.#data[3] === matrix.#data[3]
      && this.#data[4] === matrix.#data[4]
      && this.#data[5] === matrix.#data[5]
      && this.#data[6] === matrix.#data[6]
      && this.#data[7] === matrix.#data[7]
      && this.#data[8] === matrix.#data[8]
      && this.#data[9] === matrix.#data[9]
      && this.#data[10] === matrix.#data[10]
      && this.#data[11] === matrix.#data[11]
      && this.#data[12] === matrix.#data[12]
      && this.#data[13] === matrix.#data[13]
      && this.#data[14] === matrix.#data[14]
      && this.#data[15] === matrix.#data[15]
    );
  }

  /**
   * Setzt die Werte dieser Matrix direkt aus einem Array.
   *
   * **ACHTUNG:** Im Gegensatz zur {@link Matrix4#set}-Methode erwartet diese Funktion
   * die Daten in **Column-Major-Reihenfolge** (spaltenweise). \
   * Dies dient dem hocheffizienten Laden von direktem GPU-Speicher oder binären Daten.
   * @param array Ein Array oder Array-ähnliches Objekt mit mindestens 16 Werten.
   * @param offset Der Startindex im Quell-Array. Standard ist 0.
   */
  fromArray(array: ArrayLike<number> | Float32Array, offset = 0): Matrix4 {
    if (offset < 0) {
      throw new Error("Offset must be a non-negative integer.");
    }
    if (array.length < offset + 16) {
      throw new Error("The provided array does not have enough elements to fill a 4x4 matrix starting from the specified offset.");
    }

    if (array instanceof Float32Array) {
      this.#data.set(array.subarray(offset, offset + 16));

      return this;
    }

    for (let i = 0; i < 16; i++) {
      this.#data[i] = array[i + offset];
    }

    return this;
  }

  /**
   * Kopiert die internen Daten der Matrix in ein Array.
   *
   * Die Daten werden in **Column-Major-Reihenfolge** (spaltenweise) exportiert.
   * Dies entspricht exakt dem internen Layout, wie es von WebGPU/WGSL erwartet wird.
   * @param array Das Ziel-Array. Wenn nicht angegeben, wird ein neues Standard-Array [] erstellt.
   * @param offset Der Startindex im Ziel-Array. Standard ist 0.
   * @returns Das Array mit den Matrixdaten.
   */
  toArray<T extends number[] | Float32Array>(array?: T, offset = 0): T {
    if (!array) {
      // eslint-disable-next-line no-param-reassign
      array = Array.from({ length: offset + 16 }) as T;
    }

    if (array instanceof Float32Array) {
      if (array.length < offset + 16) {
        throw new Error("The provided Float32Array is too small to hold a 4x4 matrix at the specified offset.");
      }

      array.set(this.#data, offset);
      return array;
    }

    // Vergrößere das ZielArray, falls es nicht genug Platz bietet
    // Achtung: Könnte zu leeren (undefined) Elementen führen.
    array.length = Math.max(array.length, offset + 16);

    array[offset] = this.#data[0];
    array[offset + 1] = this.#data[1];
    array[offset + 2] = this.#data[2];
    array[offset + 3] = this.#data[3];

    array[offset + 4] = this.#data[4];
    array[offset + 5] = this.#data[5];
    array[offset + 6] = this.#data[6];
    array[offset + 7] = this.#data[7];

    array[offset + 8] = this.#data[8];
    array[offset + 9] = this.#data[9];
    array[offset + 10] = this.#data[10];
    array[offset + 11] = this.#data[11];

    array[offset + 12] = this.#data[12];
    array[offset + 13] = this.#data[13];
    array[offset + 14] = this.#data[14];
    array[offset + 15] = this.#data[15];

    return array;
  }

  /**
   * Kopiert die internen Daten der Matrix in ein Matrix4Tuple.
   */
  toTuple(): Matrix4Tuple {
    return [
      this.#data[0], this.#data[4], this.#data[8], this.#data[12],  // Zeile 1
      this.#data[1], this.#data[5], this.#data[9], this.#data[13],  // Zeile 2
      this.#data[2], this.#data[6], this.#data[10], this.#data[14], // Zeile 3
      this.#data[3], this.#data[7], this.#data[11], this.#data[15], // Zeile 4
    ];
  }

  /**
   * Ermöglicht die Iteration über die Elemente der Matrix mit for...of
   * oder anderen Iterationstechniken, die Symbol.iterator verwenden.
   */
  *[Symbol.iterator]() {
    console.log("Matrix4: Symbol.iterator was called.");
    yield* this.#data;
  }

  /**
   * Gibt eine lesbare Darstellung der Matrix in der Konsole aus,
   * mit optionaler Präzision und Formatierung.
   * @param precision Die Anzahl der Dezimalstellen, die für die Anzeige der Werte
   * verwendet werden soll. Standard ist 3.
   * @param asColumnMajor Gibt an, ob die Matrix in Spaltenmajor- oder Zeilenmajor-Format
   * angezeigt werden soll. Standard ist false (Zeilenmajor).
   */
  prettyPrint(
    precision: number = 3,
    asColumnMajor: boolean = false,
  ) {
    const [
      xx, yx, zx, wx,
      xy, yy, zy, wy,
      xz, yz, zz, wz,
      xw, yw, zw, ww,
    ] = this.#data;

    const sxx = Math.abs(xx).toFixed(precision);
    const sxy = Math.abs(xy).toFixed(precision);
    const sxz = Math.abs(xz).toFixed(precision);
    const sxw = Math.abs(xw).toFixed(precision);

    const syx = Math.abs(yx).toFixed(precision);
    const syy = Math.abs(yy).toFixed(precision);
    const syz = Math.abs(yz).toFixed(precision);
    const syw = Math.abs(yw).toFixed(precision);

    const szx = Math.abs(zx).toFixed(precision);
    const szy = Math.abs(zy).toFixed(precision);
    const szz = Math.abs(zz).toFixed(precision);
    const szw = Math.abs(zw).toFixed(precision);

    const swx = Math.abs(wx).toFixed(precision);
    const swy = Math.abs(wy).toFixed(precision);
    const swz = Math.abs(wz).toFixed(precision);
    const sww = Math.abs(ww).toFixed(precision);

    const maxLength = 1 + Math.max(
      sxx.length, sxy.length, sxz.length, sxw.length,
      syx.length, syy.length, syz.length, syw.length,
      szx.length, szy.length, szz.length, szw.length,
      swx.length, swy.length, swz.length, sww.length,
    );

    if (asColumnMajor) {
      console.log(
        `${this.#label} - Matrix 4x4 (Column Major):\n` +
        `| ${sxx.padStart(maxLength)} ${syx.padStart(maxLength)} ${szx.padStart(maxLength)} ${swx.padStart(maxLength)} |\n` +
        `| ${sxy.padStart(maxLength)} ${syy.padStart(maxLength)} ${szy.padStart(maxLength)} ${swy.padStart(maxLength)} |\n` +
        `| ${sxz.padStart(maxLength)} ${syz.padStart(maxLength)} ${szz.padStart(maxLength)} ${swz.padStart(maxLength)} |\n` +
        `| ${sxw.padStart(maxLength)} ${syw.padStart(maxLength)} ${szw.padStart(maxLength)} ${sww.padStart(maxLength)} |`,
      );
    } else {
      console.log(
        `${this.#label} - Matrix 4x4 (Row Major):\n` +
        `| ${sxx.padStart(maxLength)} ${sxy.padStart(maxLength)} ${sxz.padStart(maxLength)} ${sxw.padStart(maxLength)} |\n` +
        `| ${syx.padStart(maxLength)} ${syy.padStart(maxLength)} ${syz.padStart(maxLength)} ${syw.padStart(maxLength)} |\n` +
        `| ${szx.padStart(maxLength)} ${szy.padStart(maxLength)} ${szz.padStart(maxLength)} ${szw.padStart(maxLength)} |\n` +
        `| ${swx.padStart(maxLength)} ${swy.padStart(maxLength)} ${swz.padStart(maxLength)} ${sww.padStart(maxLength)} |`,
      );
    }
  }
}

export default Matrix4;
