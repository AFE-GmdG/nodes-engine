import BaseNode from "./baseNode";
import { ConfigFor, InstanceFor } from "./common";
import engineNodeMap, { EngineNodeMap } from "./engineNodeMap";

/**
 * Diese Funktion erstellt die NodeFactory, welche für die Erstellung von Nodes verwendet wird.
 *
 * **Warum so kompliziert und zweifach abstrahiert?**
 *
 * Es gibt Engine-Interne Nodes und Nodes, welche erst durch eine Applikation bereitgestellt werden.
 * Beide Arten von Nodes sollen über die gleiche Factory erstellt werden.
 * Damit das funktioniert, muss die Factory durch die Applikation erstellt werden, nur diese kennt die
 * zusätzlichen Applikation-Node-Klassen.
 * Gleichzeitig muss die Factory aber auch von der Engine benutzt werden, um Engine-Interne Nodes zu erstellen.
 *
 * Daher wird diese Funktion von der Engine bereitgestellt, muss aber von der Applikation verwendet werden, um die Factory zu erstellen.
 * Im Initialisierungsprozess der Engine wird diese Funktion der Applikation als Argument übergeben.
 * Die Applikation muss das Engine-Initialisierung-Objekt erzeugen, welches einerseits den Root-Viewport bereitstellt
 * und andererseits die NodeFactory erstellt. Die Engine kann daraufhin alle nötigen Nodes der Engine und der Applikation
 * über die Factory erstellen, ohne die Applikation oder deren Node-Klassen kennen zu müssen.
 *
 * @example
 * **Nutzung in der Applikation:**
 * ```ts
 * class PlayerNode extends BaseNode {
 *   #health: number;
 *
 *   constructor(config: BaseNodeConfig & { health: number }, parent?: BaseNode) {
 *     super(config, parent);
 *     // ...
 *     this.#health = config.health;
 *   }
 * }
 *
 * class MyApp extends Application {
 *   async initialize(factoryFactory: typeof createNodeFactory) {
 *     const factory = factoryFactory({
 *       player: PlayerNode,
 *     });
 *
 *     // Typesicher:
 *     const viewport = factory({ type: "viewport", canvasOrTexture: someCanvas }); // Engine-Node
 *     const player = factory({ type: "player", health: 100 }); // Applikation-Node
 *     // Compile-Error:
 *     const player2 = factory({ type: "player", damage: 10 });
 *
 *     return {
 *       viewport,
 *       player,
 *     };
 *   }
 * }
 * ```
 */
function createNodeFactory<
  const TAppMap extends Record<string, new (config: any, parent?: BaseNode) => BaseNode>
>(appNodeTypes: TAppMap) {
  // Engine und Application-Nodes zusammenführen
  const allNodeTypes: EngineNodeMap & TAppMap = {
    ...engineNodeMap,
    ...appNodeTypes,
  };

  function factory<
    TConfig extends ConfigFor<EngineNodeMap & TAppMap>,
  >(
    nodeConfig: TConfig,
    parent?: BaseNode,
  ): InstanceFor<EngineNodeMap, TAppMap, TConfig> {
    const ctor = allNodeTypes[nodeConfig.type as keyof typeof allNodeTypes];
    if (!ctor) {
      throw new Error(`No constructor found for node type: ${nodeConfig.type}`);
    }

    return new ctor(nodeConfig, parent) as InstanceFor<EngineNodeMap, TAppMap, TConfig>;
  }

  return factory;
}

export default createNodeFactory;
