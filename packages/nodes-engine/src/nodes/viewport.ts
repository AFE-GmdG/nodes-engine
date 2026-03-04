import BaseNode, { BaseNodeConfig } from "./baseNode";

import MatrixBufferComponent from "../components/matrixBuffer";

import RendererApi from "../renderer/api";

export type ViewportNodeConfig = BaseNodeConfig & {

  /**
   * @property matrixBufferElementCount:
   * Anzahl der gewünschten Matrizen im MatrixBufferArray.
   *
   * Der Wert wird auf die nächste durch 16 teilbare Zahl aufgerundet,
   * damit der Buffer optimal ausgerichtet ist.
   */
  matrixBufferElementCount?: number;
};

abstract class ViewportNode extends BaseNode {
  #rendererApi!: RendererApi;
  get rendererApi() { return this.#rendererApi; }

  #matrixBuffer: MatrixBufferComponent;
  get matrixBuffer() { return this.#matrixBuffer; }

  abstract get width(): number;
  abstract get height(): number;
  abstract get primaryColorTexture(): GPUTexture;

  constructor(config: ViewportNodeConfig, parent?: BaseNode) {
    const { matrixBufferElementCount = 16, ...baseConfig } = config;
    super(baseConfig, parent);

    this.#matrixBuffer = new MatrixBufferComponent({
      elementCount: matrixBufferElementCount,
    }, this);
  }

  protected async onInitialize(): Promise<void> {
    await super.onInitialize();

    // Die RendererApi steht im Root Node zur Verfügung.
    // Damit aber nicht jeder ViewportNode immer den gesamten Baum traversieren
    // muss, um die RendererApi zu finden, wird sie hier als referenz gecached.
    if (!this.root) {
      throw new Error("ViewportNode must be part of a node tree with a RootNode.");
    }
    this.#rendererApi = this.root.rendererApi;
  }

  protected async onInitialized(): Promise<void> {
    await super.onInitialized();

    // Jetzt sind alle Children initialisiert, d.h. alle Matrizen sollten
    // registriert sein.
  }
}

export default ViewportNode;
