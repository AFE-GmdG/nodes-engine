import Guid from "../core/guid";

export type BaseNodeConfig = {
  readonly type: string; // Diskriminator für die Node-Klasse
  id?: Guid;
  name?: string;
};

abstract class BaseNode {
  readonly #type: string;
  get type(): string { return this.#type; }

  readonly #id: Guid;
  get id(): Guid { return this.#id; }

  #baseName: string;
  #nameId?: number;

  get baseName(): string { return this.#baseName; }
  get name(): string {
    if (this.#nameId) {
      return `${this.#baseName} (${this.#nameId})`;
    }
    return this.#baseName;
  }

  #parent?: BaseNode;
  get parent(): BaseNode | undefined { return this.#parent; }

  #children: BaseNode[];
  get children(): BaseNode[] { return this.#children; }

  constructor({ type, id, name }: BaseNodeConfig, parent?: BaseNode) {
    this.#type = type;

    this.#id = id ?? new Guid();
    this.#baseName = name ?? "Node";
    this.#nameId = undefined;
    this.#parent = undefined;
    this.#children = [];

    if (parent) {
      parent.addChild(this);
    }
  }

  // --- Methoden zum Verwalten von Namen und Namens-IDs ---

  /**
   * Setzt den Namen dieses Nodes.
   * Falls Geschwister mit demselben Basisnamen existieren, wird eine Nummer angehängt, um den Namen eindeutig zu machen.
   *
   * Gezählt wird ab 2: Ein zweiter Node mit dem selben Basisnamen erhält die Namens-ID 2, ein dritter die Namens-ID 3 usw.
   * Der erste Node mit einem bestimmten Basisnamen erhält keine Namens-ID.
   * - Node
   * - Node (2)
   * - Node (3)
   * - ...
   * @param name Der Basisname für diesen Node.
   */
  setName(name: string) {
    this.#baseName = name;
    const siblingsWithSameName = this.parent?.children.filter(
      (sibling) => sibling !== this && sibling.#baseName === name,
    ) ?? [];
    this.#nameId = siblingsWithSameName.length > 0
      ? 1 + siblingsWithSameName.reduce(
        (maxId, sibling) => Math.max(maxId, sibling.#nameId ?? 1),
        1,
      )
      : undefined;
  }

  // --- Methoden zum Verwalten der Node-Hierarchie ---

  /**
   * Fügt das übergebene Kind am Ende der Kinderliste dieses Nodes hinzu.
   * Ist das Kind bereits ein Kind dieses Nodes, wird es an das Ende der Liste verschoben.
   * @param child Das anzufügende Kind-Node.
   * @throws Error, wenn eine zirkuläre Abhängigkeit entsteht.
   */
  addChild(child: BaseNode) {
    // Validiere zirkuläre Abhängigkeiten
    if (child.#isSameOrAncestorOf(this)) {
      throw new Error("Cannot add child: Circular dependency detected.");
    }

    // Behandle einen bereits vorhandenen Elternteil
    if (child.#parent) {
      // Vergleiche das Elternteil mit diesem Node (this).
      // Bei Identität muss das Kind an das Ende der Kinderliste verschoben werden,
      // andernfalls wird es von seinem aktuellen Elternteil entfernt und diesem Node hinzugefügt.
      if (child.#parent === this) {
        const currentIndex = this.#children.indexOf(child);
        if (currentIndex === this.#children.length - 1) {
          // Das Kind ist bereits am Ende der Liste, keine Aktion erforderlich.
          return;
        }
        // Ausschneiden und neu Einfügen am Ende der Liste
        this.#children.splice(currentIndex, 1);
        this.#children.push(child);
        return;
      }

      // Entferne das Kind von seinem aktuellen Elternteil
      child.#parent.removeChild(child);
    }

    // Füge das Kind zu diesem Node hinzu
    child.#parent = this;
    this.#children.push(child);

    // Nutze setName, um die Namens-ID des Kindes zu aktualisieren, falls erforderlich
    child.setName(child.#baseName);
  }

  /**
   * Fügt das übergebene Kind vor einem anderen Kind ein.
   * Das Kind wird an der Position von `before` eingefügt und `before` sowie alle folgenden Kinder rücken um eine Position nach hinten.
   * @param child Das einzufügende Kind-Node
   * @param before Das Kind-Node, vor dem `child` eingefügt werden soll
   * @throws Error, wenn `before` kein Kind dieses Nodes ist oder wenn eine zirkuläre Abhängigkeit entsteht
   */
  insertChild(child: BaseNode, before: BaseNode) {
    // Validiere zirkuläre Abhängigkeiten
    if (child.#isSameOrAncestorOf(this)) {
      throw new Error("Cannot insert child: Circular dependency detected.");
    }

    // Finde die Position von `before` in der Kinderliste
    const beforeIndex = this.#children.indexOf(before);
    if (beforeIndex === -1) {
      throw new Error("Cannot insert child: The 'before' node is not a child of this node.");
    }

    // Wenn das Kind bereits ein Kind dieses Nodes ist, verschiebe es an die neue Position
    if (child.#parent === this) {
      const currentIndex = this.#children.indexOf(child);
      if (currentIndex === beforeIndex) {
        // Das Kind ist bereits an der gewünschten Position, keine Aktion erforderlich.
        return;
      }

      // Repositioniere das Kind in der Kinderliste
      this.#children.splice(currentIndex, 1);
      // Korrigiere den Index von `before`, wenn das Kind vor `before` entfernt wurde
      const newIndex = beforeIndex > currentIndex ? beforeIndex - 1 : beforeIndex;
      this.#children.splice(newIndex, 0, child);
      return;
    }

    // Entferne das Kind von seinem aktuellen Elternteil, falls vorhanden
    if (child.#parent) {
      child.#parent.removeChild(child);
    }

    // Füge das Kind an der gewünschten Position ein
    child.#parent = this;
    this.#children.splice(beforeIndex, 0, child);

    // Nutze setName, um die Namens-ID des Kindes zu aktualisieren, falls erforderlich
    child.setName(child.#baseName);
  }

  /**
   * Entfernt das übergebene Kind von diesem Node.
   * Das Kind wird dabei auch von diesem Node getrennt, d.h. sein Parent wird auf null gesetzt
   * und eine eventuell vorhandene NameId wird entfernt.
   * @param child Der zu entfernende Kind-Node
   * @throws Error, wenn das übergebene Kind kein Kind dieses Nodes ist.
   */
  removeChild(child: BaseNode) {
    const index = this.#children.indexOf(child);
    if (index === -1) {
      throw new Error("Child is not a child of this node.");
    }

    child.#parent = undefined;
    child.#nameId = undefined;
    this.#children.splice(index, 1);
  }

  // --- Methoden für Node Lifecycle ---

  /**
   * Initialisiert diesen Node und alle seine Nachkommen rekursiv.
   */
  async initializeTree() {
    // TODO: ECS initialization
    // for (const component of this.#components) {
    //   await component.initialize(this);
    // }

    // Initialisiere alle Kinder rekursiv
    for (const child of this.#children) {
      await child.initializeTree();
    }
  }

  // --- Hilfs- und Debugmethoden ---

  /**
   * Prüft, ob dieser Node ein Vorfahre des übergebenen Nodes ist.
   * Diese Methode wird verwendet, um zirkuläre Abhängigkeiten zu verhindern, wenn ein Node als Kind eines seiner Nachkommen hinzugefügt werden soll.
   * @param node Der zu testende Node
   * @returns true, wenn dieser Node ein Vorfahre des übergebenen Nodes ist, andernfalls false.
   */
  #isSameOrAncestorOf(node: BaseNode): boolean {
    let current: BaseNode | undefined = node;
    while (current) {
      if (current === this) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}

export default BaseNode;
