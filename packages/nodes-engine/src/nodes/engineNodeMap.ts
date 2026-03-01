import Viewport from "./viewport";

export type EngineNodeMap = {
  viewport: typeof Viewport;
};

const engineNodeMap: EngineNodeMap = {
  viewport: Viewport,
};

export default engineNodeMap;
