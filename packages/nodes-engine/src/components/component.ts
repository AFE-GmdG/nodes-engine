import type FrameContext from "../core/frameContext";
import ProcessMode from "../core/processMode";

import type BaseNode from "../nodes/baseNode";

export type ComponentConfig = {
  readonly type: string; // Diskriminator für die Komponententypen
  processMode?: ProcessMode;
};

abstract class Component {
  #node!: BaseNode;
  get node(): BaseNode { return this.#node; }

  #processMode: ProcessMode;
  get processMode(): ProcessMode { return this.#processMode; }
  set processMode(value: ProcessMode) { this.#processMode = value; }

  constructor({ processMode = ProcessMode.Inherit }: ComponentConfig, parent: BaseNode) {
    this.#processMode = processMode;

    // Versuche, mich bei parent zu registrieren.
    const success = parent.addComponent(this);
    if (!success) {
      throw new Error(`Failed to add component of type ${this.constructor.name} to node ${parent.path}.`);
    }

    this.#node = parent;
  }

  // --- Methoden für Node Lifecycle ---

  initialize(node: BaseNode): Promise<void> {
    this.#node = node;
    return Promise.resolve();
  }

  protected onUpdate(_frameContext: Readonly<FrameContext>): void {
  }

  update(frameContext: Readonly<FrameContext>): void {
    if (this.#processMode === ProcessMode.Disabled) {
      return;
    }

    this.onUpdate(frameContext);
  }

  destroy(_node: BaseNode): void {
    throw new Error("Not implemented: Component.destroy");
  }
}

export default Component;
