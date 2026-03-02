import BaseNode from "./baseNode";

import RendererApi from "../renderer/api";

abstract class ViewportNode extends BaseNode {
  #rendererApi!: RendererApi;
  get rendererApi() { return this.#rendererApi; }

  abstract get width(): number;
  abstract get height(): number;
  abstract get primaryColorTexture(): GPUTexture;

  protected async onInitialize(): Promise<void> {
    await super.onInitialize();

    // Die RendererApi steht im Root Node zur Verfügung.
    // Damit aber nicht jeder ViewportNode immer den gesamten Baum traversieren
    // muss, um die RendererApi zu finden, wird sie hier als referenz gecached.
    if (!this.root) {
      throw new Error("ViewportNode must be part of a node tree with a RootNode.");
    }
    this.#rendererApi = this.root.rendererApi;
    return Promise.resolve();
  }
}

export default ViewportNode;
