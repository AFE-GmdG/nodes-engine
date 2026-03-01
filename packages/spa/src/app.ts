import Application from "@afegmdg/nodes-engine/core/application";

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

    const viewportNode = this.nodeFactory({ type: "viewport", canvasOrTexture: canvas });
    this.nodeFactory({ type: "player", health: 100 }, viewportNode);

    return viewportNode;
  }
}();

await app.run();
