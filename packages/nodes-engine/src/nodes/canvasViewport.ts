import BaseNode from "./baseNode";
import ViewportNode, { ViewportNodeConfig } from "./viewport";

export type CanvasViewportNodeConfig = ViewportNodeConfig & {
  readonly type: "canvasViewport";
  canvas: HTMLCanvasElement;

  primaryColorFormat: GPUTextureFormat;
  primaryDepthStencilFormat?: GPUTextureFormat;
};

/**
 * CanvasViewportNode
 * Der CanvasViewportNode repräsentiert ein HTMLCanvasElement als Render-Zielfläche.
 *
 * Zur Vereinheitlichung aller ViewportNodes wird nicht direkt auf das CanvasElement
 * gerendert, sondern es wird eine separate GPUTexture als primäre Color Texture
 * erstellt, die dann auf das CanvasElement kopiert wird.
 * Dadurch können PostProcessing Effekte nahtlos in die RenderPipeline integriert
 * werden, ohne dass ich Fallunterscheidungen zwischen direkten Canvas-Texturen und
 * Offscreen-Texturen machen muss.
 *
 * Eine DepthStencil Textur wird nur erstellt, wenn in der Konfiguration explizit
 * ein DepthStencil Format angegeben wird. Andernfalls werden nur Pipelines ohne
 * DepthStencil State unterstützt.
 *
 * Wird kein PostProcessing Effekt verwendet, kommt der Standard CopyToCanvas Effekt
 * zum Einsatz, der die primäre Color Texture direkt auf das CanvasElement kopiert.
 * (Dieses Verhalten kann sich im Laufe der Entwicklung noch ändern.)
 *
 * Es wird noch nichts gerendert. Alle Methoden zum Sammeln der Renderbefehle,
 * alle Postprocessing Effekte, sind noch in Entwicklung.
 * Aktuell sollte der Viewport den Canvas eigentlich nur "schwarz" machen.
 */
class CanvasViewportNode extends ViewportNode {
  #canvas!: HTMLCanvasElement;
  #canvasContext: GPUCanvasContext | null;
  #resizeObserver: ResizeObserver;
  #debouncedResizeTimeout: number | null;

  #width: number;
  #height: number;

  readonly #colorResourceName: string;
  readonly #depthStencilResourceName: string;
  #primaryColorFormat: GPUTextureFormat;
  #primaryDepthStencilFormat?: GPUTextureFormat;
  #primaryColorTexture!: GPUTexture;
  #primaryDepthStencilTexture?: GPUTexture;

  get width() { return this.#width; }
  get height() { return this.#height; }

  get primaryColorTexture(): GPUTexture { return this.#primaryColorTexture; }
  get primaryDepthStencilTexture(): GPUTexture | undefined { return this.#primaryDepthStencilTexture; }

  constructor(config: CanvasViewportNodeConfig, parent?: BaseNode) {
    const { canvas, primaryColorFormat, primaryDepthStencilFormat, ...baseConfig } = config;
    super(baseConfig, parent);

    this.#canvas = canvas;
    this.#canvasContext = null;
    this.#resizeObserver = null!; // Wird im onInitialized gesetzt.
    this.#debouncedResizeTimeout = null;

    // Width und Height stehen erst nach dem initialem ResizeObserver Callback zu Verfügung.
    this.#width = 0;
    this.#height = 0;

    this.#colorResourceName = `primary color texture: ${this.id}`;
    this.#depthStencilResourceName = `primary depth stencil texture: ${this.id}`;

    this.#primaryColorFormat = primaryColorFormat;
    this.#primaryDepthStencilFormat = primaryDepthStencilFormat;
  }

  protected async onInitialized(): Promise<void> {
    await super.onInitialized();

    // Initiale Sanity Checks
    if (!(this.#canvas instanceof HTMLCanvasElement)) {
      throw new Error("Canvas element must be an instance of HTMLCanvasElement.");
    }
    if (!this.#canvas.isConnected) {
      throw new Error("Canvas element must be connected to the DOM.");
    }

    const { promise, resolve, reject } = Promise.withResolvers<void>();

    let initialResizeHandled = false;
    this.#resizeObserver = new ResizeObserver((entries) => {
      if (!initialResizeHandled) {
        const width = entries[0].devicePixelContentBoxSize[0].inlineSize;
        const height = entries[0].devicePixelContentBoxSize[0].blockSize;

        if (width <= 0 || height <= 0) {
          // Vermutlich ist der Browser minimiert.
          // Warte, mit der Initialisierung, bis eine gültige Größe initial vorliegt.
          return;
        }

        try {
          this.#handleCanvasResize(entries[0]);
          initialResizeHandled = true;
          resolve();
        } catch (ex) {
          // Fehler bei der initialen Canvas-Konfiguration sind kritisch,
          // da der Viewport ohne gültige Canvas-Konfiguration nicht funktionsfähig ist.
          reject(ex);
        }
        return;
      }

      if (this.#debouncedResizeTimeout !== null) {
        window.clearTimeout(this.#debouncedResizeTimeout);
      }

      // Debounce Resize Events, um Performance Probleme bei schnellen Resizes zu vermeiden.
      this.#debouncedResizeTimeout = window.setTimeout(this.#handleCanvasResize, 25, entries[0]);
    });
    this.#resizeObserver.observe(this.#canvas);

    return promise;
  }

  protected onDestroy() {
    if (this.#debouncedResizeTimeout !== null) {
      window.clearTimeout(this.#debouncedResizeTimeout);
    }
    this.#resizeObserver.disconnect();

    if (this.#primaryColorTexture) {
      this.rendererApi.textures.delete(this.#colorResourceName);
    }
    if (this.#primaryDepthStencilTexture) {
      this.rendererApi.textures.delete(this.#depthStencilResourceName);
    }

    super.onDestroy();
  }

  #handleCanvasResize = (entry: ResizeObserverEntry) => {
    this.#debouncedResizeTimeout = null;

    // width und height des Canvas Elements aktualisieren.
    const width = entry.devicePixelContentBoxSize[0].inlineSize;
    const height = entry.devicePixelContentBoxSize[0].blockSize;

    if (width === this.#width && height === this.#height) {
      // Keine Änderung der Größe, daher kein Update notwendig.
      return;
    }

    if (this.#canvasContext) {
      this.#canvasContext.unconfigure();
      this.#canvasContext = null;
      // Die Color- und DepthStencil Texturen müssen hier nicht explizit zerstört werden,
      // da sie in der RendererApi verwaltet werden.
      // Falls noch "alte" Color- und DepthStencil Texturen existieren,
      // leben diese einfach weiter, bis sie durch neue überschrieben werden.
    }

    if (width <= 0 || height <= 0) {
      // Vermutlich ist der Browser minimiert.
      // Warte auf das nächste Resize Event mit gültigen Größen, bevor die CanvasContext
      // Konfiguration aktualisiert wird.
      return;
    }

    this.#canvas.width = width;
    this.#canvas.height = height;
    console.log(`${this.name} Canvas resized: ${width}x${height}`);

    this.#canvasContext = this.#canvas.getContext("webgpu");
    if (!this.#canvasContext) {
      throw new Error("Failed to get WebGPU context from canvas.");
    }
    this.#canvasContext.configure({
      device: this.rendererApi.gpuDevice,
      format: navigator.gpu.getPreferredCanvasFormat(),
      colorSpace: "srgb",
      alphaMode: "opaque",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.#primaryColorTexture = this.rendererApi.textures.set(
      this.#colorResourceName,
      (label) => this.rendererApi.gpuDevice.createTexture({
        label,
        size: [width, height],
        format: this.#primaryColorFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      }),
    );

    if (this.#primaryDepthStencilFormat) {
      this.#primaryDepthStencilTexture = this.rendererApi.textures.set(
        this.#depthStencilResourceName,
        (label) => this.rendererApi.gpuDevice.createTexture({
          label,
          size: [width, height],
          format: this.#primaryDepthStencilFormat!,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        }),
      );
    }
  };
}

export default CanvasViewportNode;
