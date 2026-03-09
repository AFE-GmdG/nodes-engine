import type FrameContext from "../core/frameContext";
import ProcessMode from "../core/processMode";

import type BaseNode from "../nodes/baseNode";

export type ComponentConfig = {
  processMode?: ProcessMode;
};

abstract class Component {
  #owner!: BaseNode;
  get owner(): BaseNode { return this.#owner; }

  #processMode: ProcessMode;
  get processMode(): ProcessMode { return this.#processMode; }
  set processMode(value: ProcessMode) { this.#processMode = value; }

  #dirty: boolean;
  get dirty(): boolean { return this.#dirty; }

  constructor({ processMode = ProcessMode.Inherit }: ComponentConfig, owner: BaseNode) {
    this.#processMode = processMode;

    // Alle Komponente starten als "dirty".
    this.#dirty = true;

    // Versuche, mich bei parent zu registrieren.
    const success = owner.addComponent(this);
    if (!success) {
      throw new Error(`Failed to add component of type ${this.constructor.name} to node ${owner.path}.`);
    }

    this.#owner = owner;
  }

  // --- Methoden für Node Lifecycle ---

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  // --- Dirty-Flag-Management ---
  markDirty(): void {
  }

  clearDirty(): void {
    this.#dirty = false;
  }

  protected onUpdate(_frameContext: Readonly<FrameContext>): void {
  }

  update(frameContext: Readonly<FrameContext>): void {
    if (this.#processMode === ProcessMode.Disabled) {
      return;
    }

    this.onUpdate(frameContext);
  }

  destroy(): void {
    throw new Error("Not implemented: Component.destroy");
  }
}

export default Component;
