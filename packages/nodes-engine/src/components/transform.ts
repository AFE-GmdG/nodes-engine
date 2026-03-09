import Component, { ComponentConfig } from "./component";

import FrameContext from "../core/frameContext";

import Basis, { ReadonlyBasis } from "../math/basis";
import Matrix4 from "../math/matrix4";
import Vector3, { ReadonlyVector3 } from "../math/vector3";

import type BaseNode from "../nodes/baseNode";
import type ViewportNode from "../nodes/viewport";

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

  // --- Local und Welt-Transformationen ---
  #viewportNode?: ViewportNode;
  #localTransformMatrixId?: number;
  #worldTransformMatrixId?: number;

  get localTransformMatrix(): Matrix4 | undefined {
    if (!this.#viewportNode || this.#localTransformMatrixId === undefined) {
      return undefined;
    }
    const matrixInfo = this.#viewportNode.matrixBuffer.getById(this.#localTransformMatrixId);
    return matrixInfo?.matrix;
  }

  get worldTransformMatrix(): Matrix4 | undefined {
    if (!this.#viewportNode || this.#worldTransformMatrixId === undefined) {
      return undefined;
    }
    const matrixInfo = this.#viewportNode.matrixBuffer.getById(this.#worldTransformMatrixId);
    return matrixInfo?.matrix;
  }

  constructor(config: TransformComponentConfig, owner: BaseNode) {
    const { basis, origin, ...componentConfig } = config;
    super(componentConfig, owner);

    this.#basis = basis ?? new Basis();
    this.#origin = origin ?? new Vector3();
  }

  initialize(): Promise<void> {
    // Erstellt die lokalen und Welt-Transformationsmatrizen.
    // Diese müssen im MatrixBuffer registriert werden.
    // - Suche den Viewport-Node:
    this.#viewportNode = this.owner.findAncestorByTypes("canvasViewport") as ViewportNode | undefined;
    if (!this.#viewportNode) {
      // Kein Viewport-Node gefunden.
      // Die Komponente ist an einem Node, welcher noch nicht in einer Szene ist.
      // Matrizen müssen erst berechnet werden, wenn dies der Fall ist - so ignoriere die Initialisierung vorerst.
      return Promise.resolve();
    }

    this.#localTransformMatrixId = this.#viewportNode.matrixBuffer.createMatrix({ owner: this.owner, name: "localTransform" });
    this.#worldTransformMatrixId = this.#viewportNode.matrixBuffer.createMatrix({ owner: this.owner, name: "worldTransform" });

    return Promise.resolve();
  }

  protected onUpdate(_frameContext: Readonly<FrameContext>): void {
    // Wenn die Transformkomponente "dirty" ist, berechne die lokalen und Welt-Transformationen neu.
    // Technisch gesehen, könnte die lokale Transformation auch sauber sein, wenn die Welt-Transformation schmutzig ist.
    // (Nämlich dann, wenn ein Vorfahre schmutzig ist, aber diese Komponente selbst nicht verändert wurde.)
    // Aber das würde ein weiteres Flag erfordern, was wiederum Rekursive Updates und Suchen nach sich zieht.
    // Daher bleibe ich bei einem DirtyFlag für die gesamte Komponente.
    if (!this.dirty) {
      return;
    }

    // Berechne die lokale Transformationsmatrix aus Basis und Origin.
    console.log(`${this.owner.name}: Berechne die lokale Transformationsmatrix aus Basis und Origin.`);
    const localMatrix = this.localTransformMatrix;
    if (!localMatrix) {
      // Lokale Transformationsmatrix ist nicht verfügbar.
      // TODO: Das sollte eigentlich nicht passieren, da die Matrix in initialize() erstellt wird.
      // Wird aber der Node mit der TransformComponent erstellt, bevor er in einen Viewport-Node eingefügt wird
      // oder der Node wird verschoben, besteht die Lücke aktuell.
      return;
    }
    localMatrix.createFromBasisAndOrigin(this.#basis, this.#origin);

    // Berechne die Welt-Transformationsmatrix mit Hilfe der Welt-Transformationsmatrix des Elternteils
    // und der lokalen Transformationsmatrix.
    console.log(`${this.owner.name}: Berechne die Welt-Transformationsmatrix.`);
    const worldMatrix = this.worldTransformMatrix;
    if (!worldMatrix) {
      // Welt-Transformationsmatrix ist nicht verfügbar.
      return;
    }

    const ancestorWithTransform = this.owner.findAncestorByComponent(TransformComponent);
    const parentWorldMatrix = ancestorWithTransform?.getComponent(TransformComponent)?.worldTransformMatrix;
    // Wenn keine World-Transformationsmatrix eines Vorfahren gefunden wurde,
    // behandle die lokale Matrix als Welt-Matrix (z.B. wenn der Node direkt unter dem Viewport-Node liegt).
    if (!parentWorldMatrix) {
      worldMatrix.copy(localMatrix);
    } else {
      worldMatrix.multiplyMatrices(parentWorldMatrix, localMatrix);
    }

    // Nachdem die Transformationsmatrizen aktualisiert wurden, ist die Komponente nicht mehr "dirty".
    this.clearDirty();
  }
}

export default TransformComponent;
