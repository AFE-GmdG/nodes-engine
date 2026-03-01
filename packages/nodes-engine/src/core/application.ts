import { ROOT_NODE_GUID } from "./guids";

import BaseNode from "../nodes/baseNode";
import createNodeFactory from "../nodes/factory";
import ViewportNode from "../nodes/viewport";

// --- Interner Root-Node ---

class RootNode extends BaseNode {
  constructor() {
    super({ type: "ROOT_NODE", id: ROOT_NODE_GUID, name: "ROOT_NODE" });
  }
}

// --- Applikations-Klasse ---
abstract class Application<
  TAppMap extends Record<string, new (config: any, parent?: BaseNode) => BaseNode> = {}
> {
  #rootNode: RootNode;

  #nodeFactory!: ReturnType<typeof createNodeFactory<TAppMap>>;
  get nodeFactory() {
    if (!this.#nodeFactory) {
      throw new Error("nodeFactory is not available before run() has been called.");
    }
    return this.#nodeFactory;
  }

  constructor() {
    this.#rootNode = new RootNode();
  }

  /**
   * Gibt die App-Node-Typen zurück, welche die Applikation bereitstellt.
   * Diese werden mit den Engine-Node-Typen zusammengeführt und stehen dann in der `nodeFactory` zur Verfügung.
   *
   * Die Default-Implementierung gibt eine leere Map zurück, d.h. es werden keine zusätzlichen App-Nodes bereitgestellt.
   */
  protected getAppNodeMap(): TAppMap {
    // Default implementation: keine Applikation-Nodes
    return {} as TAppMap;
  }

  abstract initializeViewport(): Promise<ViewportNode>;

  async run() {
    const appNodeMap = this.getAppNodeMap();
    this.#nodeFactory = createNodeFactory(appNodeMap);

    const viewportNode = await this.initializeViewport();
    console.log(`Viewport-Node ${viewportNode.name} created: (${viewportNode.width}x${viewportNode.height})`);

    // Füge den Viewport-Node als Kind des Root-Nodes hinzu
    this.#rootNode.addChild(viewportNode);

    // Initialisiere den gesamten Node-Baum
    await this.#rootNode.initializeTree();

    // TODO: Game-Loop
  }
}

export default Application;
