import BaseNode, { BaseNodeConfig } from "./baseNode";
import ViewportNode from "./viewport";

import TransformComponent from "../components/transform";

import Basis from "../math/basis";
import Matrix4 from "../math/matrix4";
import Vector3 from "../math/vector3";

export type CameraNodeConfig = BaseNodeConfig & {
  readonly type: "3D camera";
  position: Vector3;
  target?: Vector3;
  up?: Vector3;

  fovY?: number;
  near?: number;
  far?: number;
};

/**
 * CameraNode
 * Die Kamera repräsentiert die Sicht auf die Szene.
 * Sie ist ein direktes oder indirektes Kind eines Viewports und stellt
 * die View- und Projection-Matrix für die RenderPipeline bereit.
 *
 * In der aktuellen Implementierung gibt es noch kein ECS-System,
 * daher sind die Eigenschaften in der KameraNode selbst definiert.
 * Ob es jemals eine separate Transform-Komponente geben wird oder ob
 * es eher eine Basisklasse für 3D-Nodes geben wird muss sich noch zeigen.
 *
 * Dem Viewport kann eine Kamera als aktive zugewiesen werden.
 * Diese muss aber zwingend ein Kind oder Enkel des Viewports sein,
 * damit die Hierarchie der Nodes nicht verletzt wird.
 */
class CameraNode extends BaseNode {
  #viewport?: ViewportNode;

  #transform: TransformComponent;

  #fovY: number;
  #near: number;
  #far: number;

  #viewMatrix: Matrix4;
  #projectionMatrix: Matrix4;

  get viewport() { return this.#viewport; }
  get viewMatrix(): Readonly<Matrix4> { return this.#viewMatrix; }
  get projectionMatrix(): Readonly<Matrix4> { return this.#projectionMatrix; }

  constructor(config: CameraNodeConfig, parent?: BaseNode) {
    const {
      position,
      target = new Vector3(0, 0, 0),
      up = new Vector3(0, 1, 0),
      fovY = 75,
      near = 0.1,
      far = 4000,
      ...baseConfig
    } = config;

    super(baseConfig, parent);

    // Nutze Position, Target und Up Vector um eine Basis zu erstellen.
    const cameraForward = target.clone().sub(position).normalize();
    const cameraRight = cameraForward.clone().cross(up).normalize();
    const cameraUp = cameraRight.clone().cross(cameraForward).normalize();

    const basis = new Basis(cameraRight, cameraUp, cameraForward.multiplyScalar(-1));

    this.#transform = new TransformComponent({
      basis,
      origin: position,
    }, this);

    this.#fovY = fovY;
    this.#near = near;
    this.#far = far;

    this.#viewMatrix = new Matrix4();
    this.#projectionMatrix = new Matrix4();

    this.#viewMatrix.createCameraLookAtMatrix(this.#position, this.#target, this.#up);

    // TODO
    const left = -1;
    const right = 1;
    const top = 1;
    const bottom = -1;
    this.#projectionMatrix.createPerspective(left, right, top, bottom, this.#near, this.#far);
  }

  protected async onInitialize(): Promise<void> {
    await super.onInitialize();

    // Suche den nächsten übergeordneten ViewportNode in der Hierarchie.
    // onInitialize ist hierfür ok, da die Eltern bereits initialisiert sind.

    this.#viewport = this.findAncestorByTypes(
      "canvasViewport",
      // "offscreenViewport",
    ) as ViewportNode | undefined;
  }

  // protected onUpdate(_frameContext: FrameContext): boolean {
  // }
}

export default CameraNode;
