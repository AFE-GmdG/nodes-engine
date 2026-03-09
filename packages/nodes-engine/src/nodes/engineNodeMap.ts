import BaseNode from "./baseNode";
import Camera from "./camera";
import CanvasViewport from "./canvasViewport";

// Der RootNode als Wurzel aller Nodes ist kein Node-Type, welcher in dieser Map
// definiert werden darf, da von diesem Typ keine Instanzen abseits des
// Root-Nodes in der Applikation erstellt werden dürfen.

// Abstrakte Basisklassen wie BaseNode oder ViewportNode dürfen ebenfalls nicht
// in dieser Map definiert werden, da von diesen Klassen keine Instanzen erstellt
// werden können. Konkrete Implementierungen wie CanvasViewport hingegen müssen
// ganz normal in dieser Map definiert werden, damit sie von der Factory erstellt
// werden können.

export type EngineNodeMap = {
  node: typeof BaseNode;
  canvasViewport: typeof CanvasViewport;
  "3D camera": typeof Camera;
};

const engineNodeMap: EngineNodeMap = {
  node: BaseNode,
  canvasViewport: CanvasViewport,
  "3D camera": Camera,
};

export default engineNodeMap;
