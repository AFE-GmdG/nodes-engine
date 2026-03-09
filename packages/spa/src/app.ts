import Application from "@afegmdg/nodes-engine/core/application";

import Vector3 from "@afegmdg/nodes-engine/math/vector3";

import BaseNode, { type BaseNodeConfig } from "@afegmdg/nodes-engine/nodes/baseNode";
import ViewportNode from "@afegmdg/nodes-engine/nodes/viewport";

console.clear();

type PlayerNodeConfig = BaseNodeConfig & {
  health: number;
};

class PlayerNode extends BaseNode {
  #health: number;
  get health(): number { return this.#health; }

  constructor(config: PlayerNodeConfig, parent?: BaseNode) {
    super(config, parent);
    this.#health = config.health;
  }
}

const appNodeMap = {
  player: PlayerNode,
};

const app = new class extends Application<typeof appNodeMap> {
  protected getAppNodeMap() {
    return appNodeMap;
  }

  async initializeViewport(): Promise<ViewportNode> {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    const viewportNode = this.nodeFactory({
      type: "canvasViewport",
      name: "MainViewport",
      canvas,
      primaryColorFormat: "rgba32float",
      primaryDepthStencilFormat: "depth16unorm",
    });

    this.nodeFactory({
      type: "player",
      name: "Dummy-Node: Player",
      health: 100,
    }, viewportNode);

    const cameraRig = this.nodeFactory({
      type: "node",
      name: "Camera-Rig",
    }, viewportNode);

    this.nodeFactory({
      type: "3D camera",
      name: "MainCamera",
      position: new Vector3(1.5, 0, 15),
    }, cameraRig);

    return viewportNode;
  }

  protected onInitialized(): Promise<void> {
    console.log("App initialized. Node tree:");
    this.rootNode.printTree();
    return Promise.resolve();
  }
}();

await app.run();
