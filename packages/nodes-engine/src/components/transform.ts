import Component, { ComponentConfig } from "./component";

import Basis, { ReadonlyBasis } from "../math/basis";
import Vector3, { ReadonlyVector3 } from "../math/vector3";

import type BaseNode from "../nodes/baseNode";

/**
 * Konfiguration für die TransformComponent.
 */
export type TransformComponentConfig = ComponentConfig & {
  basis?: Basis;
  origin?: Vector3;
};

class TransformComponent extends Component {
  // --- Validierungseigenschaften und -methoden ---
  static readonly allowMultiple = false;

  #basis: Basis;
  get basis(): ReadonlyBasis { return this.#basis; }
  #origin: Vector3;
  get origin(): ReadonlyVector3 { return this.#origin; }

  constructor(config: TransformComponentConfig, owner: BaseNode) {
    const { basis, origin, ...componentConfig } = config;
    super(componentConfig, owner);

    this.#basis = basis ?? new Basis();
    this.#origin = origin ?? new Vector3();
  }
}

export default TransformComponent;
