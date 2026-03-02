import FrameContext from "./frameContext";

import BaseNode from "../nodes/baseNode";
import createNodeFactory from "../nodes/factory";
import RootNode from "../nodes/rootNode";
import ViewportNode from "../nodes/viewport";
import { unknownToError } from "./utils";

// --- Applikations-Klasse ---
abstract class Application<
  TAppMap extends Record<string, new (config: any, parent?: BaseNode) => BaseNode> = {}
> {
  #rootNode: RootNode;
  get rootNode() { return this.#rootNode; }

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

  /**
   * Startet die Applikation, indem die `nodeFactory` initialisiert,
   * der Viewport-Node erstellt und der gesamte Node-Baum initialisiert wird.
   */
  async run() {
    try {
      const appNodeMap = this.getAppNodeMap();
      this.#nodeFactory = createNodeFactory(appNodeMap);

      const viewportNode = await this.initializeViewport();

      // Füge den Viewport-Node als Kind des Root-Nodes hinzu
      this.#rootNode.addChild(viewportNode);

      // Initialisiere den gesamten Node-Baum
      await this.#rootNode.initializeTree();
    } catch (ex) {
      this.#handleError(unknownToError(ex));
    }

    const { promise: gameLoopPromise, resolve, reject } = Promise.withResolvers<void>();

    // TODO: Game-Loop
    const last100DeltaTimes: number[] = [];
    let lastFrameTime = performance.now();
    let lastDeltaIndex = 0;
    let frame = 0;

    // Einmalig vor der Loop:
    const frameContext: FrameContext = {
      frame: 0,
      deltaTime: 16,
      now: 0,
      avgFps: 0,
      onePercentLowFps: 0,
    };

    const gameLoop = (time: DOMHighResTimeStamp) => {
      const deltaTime = time - lastFrameTime;
      if (last100DeltaTimes.length < 100) {
        last100DeltaTimes.push(deltaTime);
      } else {
        last100DeltaTimes[lastDeltaIndex++] = deltaTime;
        lastDeltaIndex %= 100;
      }

      const totalDeltaTime = last100DeltaTimes.reduce((a, b) => a + b, 0);

      // Wiederverwendung des FrameContext-Objekts, um unnötigen GC-Druck zu vermeiden
      frameContext.frame = frame;
      frameContext.deltaTime = deltaTime;
      frameContext.now = time;
      frameContext.avgFps = last100DeltaTimes.length * 1000 / totalDeltaTime;
      frameContext.onePercentLowFps = 1000 / Math.max(...last100DeltaTimes);

      lastFrameTime = time;
      frame++;

      try {
        // Rekursives Update des gesamten Node-Baums starten
        const shouldContinue = this.#rootNode.updateTree(frameContext);

        if (shouldContinue) {
          window.requestAnimationFrame(gameLoop);
          return;
        }
      } catch (ex) {
        reject(ex);
        return;
      }

      resolve();
    };

    window.requestAnimationFrame(gameLoop);

    try {
      await gameLoopPromise;
    } catch (ex) {
      this.#handleError(unknownToError(ex));
    } finally {
      // Aufräumen
      this.#rootNode.destroyTree();
    }
  }

  #handleError(error: Error) {
    // Erzeuge einen Dialog.
    // Hänge die Fehlermeldung an und biete die Möglichkeit, die Seite neu zu laden.
    console.error(error);

    const newStyles = document.createElement("style");
    newStyles.textContent = `
      dialog {
        padding: 2rem 4rem;
      }

      dialog > h2 {
        margin-block: 1rem;
      }

      dialog > p {
        margin-block: 0.25rem;
      }

      dialog > .actions {
        margin-block: 2rem 1rem;
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      dialog > .actions > button {
        padding: 0.5rem 1rem;
      }
    `;
    const dialog = document.createElement("dialog");
    const title = document.createElement("h2");
    const message1 = document.createElement("p");
    const message2 = document.createElement("p");
    const actionsDiv = document.createElement("div");
    const reloadButton = document.createElement("button");

    title.textContent = "A Critical Error Occurred";
    message1.textContent = "The application has encountered a critical error and needs to stop.";
    message2.textContent = `Error details: ${error.message}`;
    actionsDiv.className = "actions";
    reloadButton.textContent = "Reload Application";

    actionsDiv.appendChild(reloadButton);

    dialog.appendChild(title);
    dialog.appendChild(message1);
    dialog.appendChild(message2);
    dialog.appendChild(actionsDiv);

    reloadButton.onclick = () => {
      dialog.close();
      window.location.reload();
    };

    document.head.appendChild(newStyles);
    document.body.appendChild(dialog);

    dialog.showModal();
  }
}

export default Application;
