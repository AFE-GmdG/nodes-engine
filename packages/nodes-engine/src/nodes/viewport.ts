import BaseNode, { BaseNodeConfig } from "./baseNode";

export type ViewportNodeConfig = BaseNodeConfig & {
  readonly type: "viewport";
  canvasOrTexture: HTMLCanvasElement | GPUTexture;
};

class ViewportNode extends BaseNode {
  #canvasOrTexture: HTMLCanvasElement | GPUTexture;

  get width(): number { return this.#canvasOrTexture.width; }
  get height(): number { return this.#canvasOrTexture.height; }

  constructor(config: ViewportNodeConfig, parent?: BaseNode) {
    super(config, parent);
    this.#canvasOrTexture = config.canvasOrTexture;
  }
}

export default ViewportNode;
