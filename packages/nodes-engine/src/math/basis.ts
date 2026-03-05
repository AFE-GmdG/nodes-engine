import {
  ReadonlyQuaternion,
  QuaternionTuple,
  isReadonlyQuaternion,
  isQuaternionTuple,
} from "./quaternion";
import Vector3, {
  ReadonlyVector3,
  Vector3Tuple,
  isReadonlyVector3,
  isVector3Tuple,
} from "./vector3";

// import EulerOrder from "../core/eulerOrder";

export interface ReadonlyBasis {
  readonly xAxis: ReadonlyVector3;
  readonly yAxis: ReadonlyVector3;
  readonly zAxis: ReadonlyVector3;
}

export function isReadonlyBasis(value: any): value is ReadonlyBasis {
  return (value instanceof Basis || (
    value
    && typeof value === "object"
    && isReadonlyVector3(value.xAxis)
    && isReadonlyVector3(value.yAxis)
    && isReadonlyVector3(value.zAxis)
  ));
}

class Basis implements ReadonlyBasis {
  #xAxis: Vector3;
  #yAxis: Vector3;
  #zAxis: Vector3;

  get xAxis(): ReadonlyVector3 { return this.#xAxis; }
  get yAxis(): ReadonlyVector3 { return this.#yAxis; }
  get zAxis(): ReadonlyVector3 { return this.#zAxis; }

  constructor();
  constructor(basis: ReadonlyBasis);
  constructor(axis: ReadonlyVector3 | Vector3Tuple, angle: number);
  constructor(quaternion: ReadonlyQuaternion | QuaternionTuple);
  constructor(xAxis: ReadonlyVector3 | Vector3Tuple, yAxis: ReadonlyVector3 | Vector3Tuple, zAxis: ReadonlyVector3 | Vector3Tuple);
  constructor(
    arg1?: ReadonlyBasis | ReadonlyVector3 | Vector3Tuple | ReadonlyQuaternion | QuaternionTuple,
    arg2?: number | ReadonlyVector3 | Vector3Tuple,
    arg3?: ReadonlyVector3 | Vector3Tuple,
  ) {
    // Ermittle, welche Parameterkombination übergeben wurde,
    // und initialisiere die Achsen entsprechend.

    // Keine Argumente: Identitätsbasis
    if (!arg1) {
      this.#xAxis = new Vector3(1, 0, 0);
      this.#yAxis = new Vector3(0, 1, 0);
      this.#zAxis = new Vector3(0, 0, 1);
      return;
    }

    // Ein Argument vom Typ ReadonlyBasis: Kopiere die Achsen
    if (isReadonlyBasis(arg1)) {
      this.#xAxis = arg1.xAxis.clone();
      this.#yAxis = arg1.yAxis.clone();
      this.#zAxis = arg1.zAxis.clone();
      return;
    }

    // Ein Argument vom Typ Quaternion
    const arg1IsReadonlyQuaternion = isReadonlyQuaternion(arg1);
    const arg1IsQuaternionTuple = isQuaternionTuple(arg1);
    if (arg1IsReadonlyQuaternion || arg1IsQuaternionTuple) {
      this.#xAxis = new Vector3(1, 0, 0);
      this.#yAxis = new Vector3(0, 1, 0);
      this.#zAxis = new Vector3(0, 0, 1);
      this.setFromQuaternion(arg1);
      return;
    }

    // arg1 ist hier in jedem Fall ein ReadonlyVector3 oder Vector3Tuple.
    // Zwei Argumente: Achse und Winkel
    if (typeof arg2 === "number") {
      this.#xAxis = new Vector3(1, 0, 0);
      this.#yAxis = new Vector3(0, 1, 0);
      this.#zAxis = new Vector3(0, 0, 1);

      const angle = arg2;
      const halfAngle = angle / 2;
      const s = Math.sin(halfAngle);

      if (isReadonlyVector3(arg1)) {
        this.#setFromQuaternionTuple([
          arg1.x * s,
          arg1.y * s,
          arg1.z * s,
          Math.cos(halfAngle),
        ]);
        return;
      }
      this.#setFromQuaternionTuple([
        arg1[0] * s,
        arg1[1] * s,
        arg1[2] * s,
        Math.cos(halfAngle),
      ]);
      return;
    }

    // Falls arg2 oder arg3 undefiniert ist, wurde kein korrekter Parametersatz übergeben.
    if (!arg2 || !arg3) {
      throw new Error("Ungültige Argumente für Basis-Konstruktor.");
    }

    // Wandle alle 3 Argumente in Tuples um, falls sie ReadonlyVector3-Objekte sind.
    const xAxisTuple = isVector3Tuple(arg1) ? arg1 : [arg1.x, arg1.y, arg1.z];
    const yAxisTuple = isVector3Tuple(arg2) ? arg2 : [arg2.x, arg2.y, arg2.z];
    const zAxisTuple = isVector3Tuple(arg3) ? arg3 : [arg3.x, arg3.y, arg3.z];

    this.#xAxis = new Vector3(xAxisTuple[0], xAxisTuple[1], xAxisTuple[2]);
    this.#yAxis = new Vector3(yAxisTuple[0], yAxisTuple[1], yAxisTuple[2]);
    this.#zAxis = new Vector3(zAxisTuple[0], zAxisTuple[1], zAxisTuple[2]);
  }

  #setFromQuaternionTuple([x, y, z, w]: QuaternionTuple): Basis {
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    this.#xAxis.set(1 - (yy + zz), xy + wz, xz - wy);
    this.#yAxis.set(xy - wz, 1 - (xx + zz), yz + wx);
    this.#zAxis.set(xz + wy, yz - wx, 1 - (xx + yy));

    return this;
  }

  setFromQuaternion(quaternion: ReadonlyQuaternion | QuaternionTuple): Basis {
    if (isReadonlyQuaternion(quaternion)) {
      return this.#setFromQuaternionTuple([
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w,
      ]);
    }
    return this.#setFromQuaternionTuple(quaternion);
  }
}

export default Basis;
