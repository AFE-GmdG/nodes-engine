/**
 * Die EulerOrder-Enumeration definiert die möglichen Reihenfolgen der Rotationen für
 * die Euler-Winkel. Sie wird verwendet, um anzugeben, in welcher Reihenfolge die
 * Rotationen um die X-, Y- und Z-Achse angewendet werden sollen.
 */
enum EulerOrder {
  XYZ,
  XZY,
  YXZ,
  YZX,
  ZXY,
  ZYX,
}

export default EulerOrder;
