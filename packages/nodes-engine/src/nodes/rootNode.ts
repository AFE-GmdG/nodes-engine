import BaseNode from "./baseNode";

import { ROOT_NODE_GUID } from "../core/guids";
import ProcessMode from "../core/processMode";

import RendererApi from "../renderer/api";

/**
 * Der RootNode ist der Wurzelknoten des gesamten Node-Baums. Er hat keine Eltern.
 *
 * Er stellt verschiedene System-APIs bereit:
 * - rendererApi: Zugriff auf die Renderer-API, um GPU-Ressourcen zu erstellen und zu verwalten.
 * - audioApi: (TODO) Zugriff auf die Audio-API, um Audio-Ressourcen zu erstellen und zu verwalten.
 * - inputApi: (TODO) Zugriff auf die Input-API, um Eingabegeräte zu verwalten und Eingabeereignisse zu abonnieren.
 * - networkApi: (TODO) Zugriff auf die Netzwerk-API, um Netzwerkverbindungen zu verwalten und Daten zu senden/empfangen.
 */
class RootNode extends BaseNode {
  #rendererApi: RendererApi;
  get rendererApi() { return this.#rendererApi; }

  get parent() { return undefined; } // RootNode hat keinen Elternknoten, daher immer undefined zurückgeben

  get path() { return "/"; } // Der Pfad des RootNode ist immer "/"

  #paused: boolean;
  get paused() { return this.#paused; }
  set paused(value: boolean) { this.#paused = value; }

  // RootNode wird immer aktualisiert
  get effectiveProcessMode() { return ProcessMode.Always; }

  constructor() {
    super({ type: "ROOT_NODE", id: ROOT_NODE_GUID, name: "ROOT_NODE" });
    this.#rendererApi = new RendererApi();
    this.#paused = false;
  }

  protected async onInitialize() {
    await this.#rendererApi.initialize();
  }
}

export default RootNode;
