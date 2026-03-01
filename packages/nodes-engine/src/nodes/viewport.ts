import BaseNode, { BaseNodeConfig } from "./baseNode";

export type ViewportNodeConfig = BaseNodeConfig & {
  readonly type: "viewport";
  canvasOrTexture: HTMLCanvasElement | GPUTexture;
};

/**
 * ViewportNode: WIP
 * Der ViewportNode repräsentiert die Render-Zielfläche der Applikation, also typischerweise ein HTMLCanvasElement oder eine GPUTexture.
 * Aktuell funktioniert der ViewportNode noch nicht, da mir beim Entwurf der API noch nicht alle Details klar waren.
 * Zukünftig wird es daher 3 spezialisierte Viewport Nodes geben:
 * - CanvasViewportNode: Repräsentiert ein HTMLCanvasElement als Render-Zielfläche.
 *   Dieser Node kümmert sich auch selbstständig um Größenänderungen des Canvas-Elements via ResizeObserver.
 * - TextureViewportNode: Repräsentiert eine GPUTexture als Render-Zielfläche.
 *   Dieser Node ist vor allem für Offscreen-Rendering, zum Beispiel für Spiegel, Portale oder Shadow Maps, gedacht.
 *   Eine Größenänderung der Render-Zielfläche muss hier fundamental anders gehandhabt werden als bei einem Canvas-Element.
 * - XRViewportNode: Repräsentiert die Viewport- und Render-Zielfläche für XR-Anwendungen.
 *   Dieser Node ist für die Darstellung von XR-Inhalten zuständig und kümmert sich um die speziellen Anforderungen von XR-Rendering,
 *   wie zum Beispiel die Unterstützung von Stereoskopischem Rendering, die Handhabung von XR-Session-Events
 *   und die Integration mit der WebXR API.
 * Zudem wird dieser ViewportNode als abstrakte Basisklasse für die drei spezialisierteren Viewport Nodes dienen,
 * indem er die gemeinsamen Funktionalitäten bereitstellt.
 *
 * Weitere geplante Features:
 * - Bereitstellung der RendererApi. Diese wird bereits im RootNode bereitgestellt, aber ein Zugriff über den ViewportNode
 *   ist deutlich performanter, da der RootNode nicht bei jedem Zugriff rekursiv ermittelt werden muss.
 *   Während `onInitialize` wird die RendererApi einmal am RootNode ermittelt und dann hier als lokale Referenz gespeichert.
 * - Bereitstellung einer Schnittstelle für PostProcessing-Effekte wie Bloom, Tone Mapping oder Blur.
 *   Ohne PostProcessing wäre das TexturFormat der primären Render-Zielfläche vom Device abhängig,
 *   üblicherweise rgba8unorm oder bgra8unorm. Mit PostProcessing kann ich das Format auf rgba16float oder sogar rgba32float
 *   festlegen, um eine höhere Farbgenauigkeit und einen größeren Dynamikumfang zu ermöglichen.
 *   Erst der finale PostProcessing-Schritt schreibt dann das Ergebnis in die eigentliche primäre Render-Zielfläche,
 *   also das Canvas-Element oder die GPUTexture.
 */
class ViewportNode extends BaseNode {
  #canvasOrTexture: HTMLCanvasElement | GPUTexture;

  #resizeObserver: ResizeObserver | null;

  #primaryColorTexture!: GPUTexture;
  #primaryDepthTexture!: GPUTexture;

  get width() { return this.#canvasOrTexture.width; }
  get height() { return this.#canvasOrTexture.height; }
  get primaryColorTexture() { return this.#primaryColorTexture; }
  get primaryDepthTexture() { return this.#primaryDepthTexture; }

  // TODO: Der Viewport benötigt Zugriff auf die GPUDevice
  // Am besten wird dies über die RendererApi gelöst, allerdings muss diese dann
  // auch in die ViewportNodeConfig aufgenommen werden. Dazu wiederum muss die RendererApi
  // in der App verfügbar sein, was bedeutet, dass `Application.initializeViewport`
  // die RendererApi als Parameter bekommen muss.
  // Dies wird so oder so nötig sein, da auch die App zugriff auf diese API benötigt.
  constructor(config: ViewportNodeConfig, parent?: BaseNode) {
    super(config, parent);
    this.#canvasOrTexture = config.canvasOrTexture;

    this.#resizeObserver = null;
  }

  protected onInitialize(): Promise<void> {
    if (this.#canvasOrTexture instanceof HTMLCanvasElement) {
      // Im Fall eines Canvas-Elements wird ein ResizeObserver eingerichtet,
      // um die Größe des Viewports automatisch anzupassen, wenn sich die Größe des Canvas-Elements ändert.
      // Zudem muss auf das erste Resize-Event gewartet werden, bevor onInitialize abgeschlossen wird,
      // damit width und height des Viewports korrekt abgefragt werden können.
      const { promise, resolve } = Promise.withResolvers<void>();
      const canvas = this.#canvasOrTexture;
      let debounceResizeTimeout: number | null = null;
      let initialResizeHandled = false;
      this.#resizeObserver = new ResizeObserver((entries) => {
        if (entries.length !== 1 || entries[0].target !== canvas) {
          throw new Error("Expected exactly one canvas entry in ResizeObserver callback.");
        }
        if (!initialResizeHandled) {
          this.#handleCanvasResize(entries[0]);
          initialResizeHandled = true;
          resolve();
          return;
        }

        if (debounceResizeTimeout !== null) {
          window.clearTimeout(debounceResizeTimeout);
        }
        debounceResizeTimeout = window.setTimeout(this.#handleCanvasResize, 25, entries[0]);
      });

      this.#resizeObserver.observe(canvas);

      return promise;
    }

    // canvasOrTexture is GPUTexture
    this.#primaryColorTexture = this.#canvasOrTexture; // ???

    return Promise.resolve();
  }

  protected onDestroy(): void {
    // Wenn ein ResizeObserver eingerichtet wurde, muss dieser beim Zerstören des ViewportNodes wieder entfernt werden.
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }

    // TODO: GPUTexture(s) zerstören
  }

  // Als Arrow-Function definiert, damit `this` korrekt gebunden ist, wenn die Methode als Callback verwendet wird.
  #handleCanvasResize = (_entry: ResizeObserverEntry) => {
  };
}

export default ViewportNode;
