// import type ist hier nötig, um zirkuläre Abhängigkeiten zwischen BaseNode und RootNode zu vermeiden.
import type RootNode from "./rootNode";

import type Component from "../components/component";

import type FrameContext from "../core/frameContext";
import Guid from "../core/guid";

export type BaseNodeConfig = {
  readonly type: string; // Diskriminator für die Node-Klasse
  id?: Guid;
  name?: string;
};

/**
 * Die Basisklasse für alle Nodes im Engine- und Application-Bereich.
 *
 * Jeder Node benötigt einen Typ, eine ID und einen Namen.
 * Zusätzlich kann jeder Node genau einen Parent und beliebig viele Kinder haben,
 * wodurch eine Hierarchie von Nodes entsteht.
 *
 * Lebenszyklus: Ein Node wird meist indirekt über die NodeFactory erstellt,
 * wobei bei vorhandenem Parent der Node automatisch als Kind dieses Parents
 * registriert wird.
 * Anschließend muss die `initializeTree`-Methode aufgerufen werden, um den Node
 * und alle seine Nachkommen zu initialisieren.
 */
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

  #components: Component[];
  get components(): Component[] { return this.#components; }

  get path(): string {
    return this.parent
      ? this.parent.path === "/"
        ? `/${this.name}`
        : `${this.parent.path}/${this.name}`
      : `/${this.name}`;
  }

  get root(): RootNode | undefined {
    let current: BaseNode | undefined = this;
    while (current) {
      // Ich kann hier nicht `instanceof RootNode` verwenden,
      // da dies mit einem type import nicht möglich ist und zu zirkulären Abhängigkeiten führen würde.
      // Die Type-Eigenschaft ist daher der pragmatische Weg, um den RootNode zu identifizieren.
      if (current.type === "ROOT_NODE") {
        return current as RootNode;
      }
      current = current.parent;
    }
    return undefined;
  }

  constructor({ type, id, name }: BaseNodeConfig, parent?: BaseNode) {
    this.#type = type;

    this.#id = id ?? new Guid();
    this.#baseName = name ?? "Node";
    this.#nameId = undefined;
    this.#parent = undefined;
    this.#children = [];

    this.#components = [];

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
   *
   * Namen dürfen die folgenden Zeichen nicht enthalten:
   * - . (Punkt): Wird für relative Pfade in der Node-Hierarchie verwendet. (./ und ../)
   * - / (Slash): Wird als Trenner für Pfadsegmente und als Root-Indicator (/) in der Node-Hierarchie verwendet.
   * @param name Der Basisname für diesen Node.
   */
  setName(name: string) {
    if (name.includes(".") || name.includes("/")) {
      throw new Error("Node names cannot contain '.' or '/' characters.");
    }

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

  // --- Methoden zum finden von Nodes ---

  /**
   * Sucht in den Vorfahren dieses Nodes nach einem Node mit dem übergebenen Typ und gibt diesen zurück.
   * Die Suche beginnt beim direkten Elternteil und setzt sich dann weiter nach oben fort,
   * bis ein passender Node gefunden wird oder die Wurzel des Baums erreicht ist.
   * @param type Der gesuchte Node-Typ
   */
  findAncestorByType(type: string) {
    let current = this.#parent;
    while (current) {
      if (current.type === type) {
        return current;
      }
      current = current.#parent;
    }
    return undefined;
  }

  /**
   * Sucht in den Vorfahren dieses Nodes nach einem Node mit einem der übergebenen Typen und gibt diesen zurück.
   * Die Suche beginnt beim direkten Elternteil und setzt sich dann weiter nach oben fort,
   * bis ein passender Node gefunden wird oder die Wurzel des Baums erreicht ist.
   * @param types Die gesuchten Node-Typen. Es wird der erste Vorfahre zurückgegeben, dessen Typ mit einem der übergebenen Typen übereinstimmt.
   */
  findAncestorByTypes(...types: string[]) {
    let current = this.#parent;
    while (current) {
      if (types.includes(current.type)) {
        return current;
      }
      current = current.#parent;
    }
    return undefined;
  }

  /**
   * Sucht in den direkten Kindern dieses Nodes nach allen Nodes mit dem übergebenen Typ.
   * @param type Der gesuchte Node-Typ
   * @param recursive Wenn true, werden auch alle Nachkommen durchsucht
   * @returns Ein Array mit allen gefundenen Nodes, die den übergebenen Typ haben.
   * Wird kein passender Node gefunden, wird ein leeres Array zurückgegeben.
   */
  findAllChildrenByType(type: string, recursive: boolean = false): BaseNode[] {
    const result: BaseNode[] = [];
    for (const child of this.#children) {
      if (child.type === type) {
        result.push(child);
      }
      if (recursive) {
        result.push(...child.findAllChildrenByType(type, true));
      }
    }
    return result;
  }

  /**
   * Sucht in der Hierarchie dieses Nodes nach einem Node mit dem übergebenen Pfad und gibt diesen zurück.
   * - Der Pfad kann absolut (/Path/to/Node) oder relativ sein (./Path/to/Node oder ../SiblingNode).
   * - Der Pfad darf . und .. Segmente an beliebigen Stellen im Pfad enthalten.
   * - Es können leere Segmente (//) im Pfad enthalten sein, diese werden ignoriert.
   * @param path Absoluter oder relativer Pfad zu einem Node in der Hierarchie.
   * @returns Der Node, der dem übergebenen Pfad entspricht, oder undefined, wenn kein solcher Node gefunden wurde. (kein throw)
   */
  findNodeByPath(path: string): BaseNode | undefined {
    // 1. Prüfen, ob der Pfad absolut ist
    const isAbsolutePath = path.startsWith("/");

    // 2. Startpunkt bestimmen: Absolute Pfade beginnen immer bei der Wurzel, relative Pfade beginnen bei diesem Node
    const currentNode: BaseNode | undefined = isAbsolutePath ? this.root : this;

    if (!currentNode) {
      return undefined; // Kein Startpunkt gefunden (z.B. this ist nicht im Baum und der Pfad ist absolut)
    }

    // 3. In Segmente zerlegen und leere Teile (z.B. durch // oder führende/folgende Slashes) entfernen
    const segments = path.split("/").filter(s => s.length > 0);

    // Wenn der Pfad nur "/" war, ist die Liste leer und wir geben direkt den Root zurück
    if (isAbsolutePath && segments.length === 0) {
      return currentNode;
    }

    return this.#resolvePath(currentNode, segments);
  }

  /**
   * Traversiert den Baum basierend auf einer Liste von Pfad-Segmenten.
   */
  #resolvePath(startNode: BaseNode, segments: string[]) {
    let currentNode: BaseNode | undefined = startNode;

    for (const segment of segments) {
      if (!currentNode) {
        // Wenn currentNode zu irgendeinem Zeitpunkt undefined wird, bedeutet dies,
        // dass der Pfad ungültig ist (z.B. weil ein Segment nicht gefunden wurde oder ein Root-Break aufgetreten ist).
        return undefined;
      }

      if (segment === ".") {
        continue; // Bleibe beim aktuellen Node
      }

      if (segment === "..") {
        currentNode = currentNode.parent; // Navigiere zum Elternknoten
        continue;
      }

      // Suche das Kind, dessen Name dem Segment entspricht
      // Achtung: #nameId muss korrekt berücksichtigt werden, es wird immer nach dem vollen Namen gesucht.
      currentNode = currentNode.children.find(child => child.name === segment);
    }

    return currentNode;
  }

  // --- Methoden zum Verwalten von Komponenten ---

  /**
   * Fügt die übergebene Komponente zu diesem Node hinzu.
   *
   * Je nach Komponententyp kann es Einschränkungen geben,
   * ob mehrere Instanzen derselben Komponente erlaubt sind.
   *
   * Dazu muss die Komponente eine statische Eigenschaft `allowMultiple`
   * definieren und auf true setzen. Standardmäßig ist `allowMultiple`
   * false, d.h. es ist nur eine Instanz einer Komponente pro Node erlaubt.
   * @param component Die hinzuzufügende Komponente
   */
  addComponent(component: Component): boolean {
    // Validierung:
    // Komponentenklassen können optionale statische Eigenschaften und Funktionen definieren,
    // um die Validierung der Komponente zu ermöglichen:
    // - isValidNodeType(node: BaseNode): boolean
    //   Diese Funktion bestimmt, ob eine Komponente auf einen bestimmten Node-Typ angewendet werden darf.
    //   Ist die Funktion nicht definiert, wird die Komponente auf allen Node-Typen erlaubt.
    // - allowMultiple: boolean
    //   Diese Eigenschaft bestimmt, ob mehrere Instanzen einer Komponente auf demselben Node erlaubt sind.
    //   Ist die Eigenschaft nicht definiert, ist standardmäßig nur eine Instanz pro Node erlaubt.
    const componentType = component.constructor as typeof Component & {
      isValidNodeType?: (node: BaseNode) => boolean;
      allowMultiple?: boolean;
    };

    // Darf die Komponente auf diesem Node-Typ verwendet werden?
    if (componentType.isValidNodeType?.(this) === false) {
      console.warn(`Component of type ${componentType.name} cannot be added to node of type ${this.type}.\nSkipping addition of component.`);
      return false; // Komponente ist für diesen Node-Typ nicht gültig, füge sie nicht hinzu
    }

    // Darf die Komponente mehrfach vorhanden sein?
    if (!componentType.allowMultiple) {
      const alreadyExists = this.#components.some(
        (component) => component.constructor === componentType,
      );
      if (alreadyExists) {
        console.warn(`Component of type ${componentType.name} already exists on node ${this.path}.\nSkipping addition of duplicate component.`);
        return false; // Komponente dieses Typs ist bereits vorhanden, füge sie nicht hinzu
      }
    }

    this.#components.push(component);
    return true;
  }

  // --- Methoden für Node Lifecycle ---

  /**
   * Wird aufgerufen, wenn dieser Node initialisiert wird.
   * Diese Methode ist ein leerer Stub und kann von Unterklassen überschrieben werden.
   *
   * `onInitialize` wird als erster Schritt im Initialisierungsprozess eines Nodes aufgerufen,
   * bevor die Komponenten und Kinder initialisiert werden.
   */
  protected onInitialize(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Wird aufgerufen, nachdem dieser Node und alle seine Nachkommen initialisiert wurden.
   * Diese Methode ist ein leerer Stub und kann von Unterklassen überschrieben werden.
   *
   * `onInitialized` wird als letzter Schritt im Initialisierungsprozess eines Nodes aufgerufen,
   * nachdem alle Komponenten und Kinder initialisiert wurden.
   * Diese Methode hat zugriff auf alle initialisierten Kinder und Komponenten dieses Nodes.
   * Eltern sind zu diesem Zeitpunkt noch nicht garantiert initialisiert.
   */
  protected onInitialized(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Wird in jedem Frame aufgerufen, um diesen Node zu aktualisieren.
   * Diese Methode ist ein leerer Stub und kann von Unterklassen überschrieben werden.
   * @param frameContext  Der aktuelle Frame-Kontext
   * @returns false, wenn die Game-Loop beendet werden soll, andernfalls true.
   */
  protected onUpdate(_frameContext: Readonly<FrameContext>): boolean {
    return true;
  }

  /**
   * Wird aufgerufen, wenn dieser Node zerstört wird.
   * Diese Methode ist ein leerer Stub und kann von Unterklassen überschrieben werden.
   */
  protected onDestroy(): void {
  }

  /**
   * Initialisiert diesen Node und alle seine Nachkommen rekursiv.
   */
  async initializeTree() {
    // Initialisiere diesen Node
    await this.onInitialize();

    // ECS initialization
    for (const component of this.#components) {
      await component.initialize();
    }

    // Initialisiere alle Kinder rekursiv
    for (const child of this.#children) {
      await child.initializeTree();
    }

    // Rufe onInitialized auf, nachdem alle Kinder initialisiert wurden
    await this.onInitialized();
  }

  /**
   * Aktualisiert diesen Node und alle seine Nachkommen rekursiv.
   * @param frameContext Der aktuelle Frame-Kontext
   * @returns false, wenn die Game-Loop beendet werden soll, andernfalls true.
   */
  updateTree(frameContext: Readonly<FrameContext>): boolean {
    const shouldContinue = this.onUpdate(frameContext);

    // Alle Kinder updaten – auch wenn eines false zurückgibt
    let childrenContinue = true;
    for (const child of this.#children) {
      if (!child.updateTree(frameContext)) {
        childrenContinue = false;
      }
    }

    return shouldContinue && childrenContinue;
  }

  /**
   * Zerstört diesen Node und alle seine Nachkommen rekursiv.
   */
  destroyTree() {
    // Zerstöre alle Kinder rekursiv
    for (const child of this.#children) {
      child.destroyTree();
      // Trenne das Kind von diesem Node
      child.#parent = undefined;
    }
    // Leere die Kinderliste.
    // Damit werden alle Referenzen zu den Kindern entfernt, der GC kann sie nun aufräumen.
    this.#children.length = 0;

    // ECS destruction
    for (const component of this.#components) {
      component.destroy();
    }

    // Zerstöre diesen Node
    this.onDestroy();
  }

  // --- Hilfs- und Debugmethoden ---

  /**
   * Gibt die Hierarchie dieses Nodes und aller seiner Nachkommen auf der Konsole aus.
   * @example
   * ```
   * Root
   * ├── Child1
   * │   ├── Grandchild1
   * │   └── Grandchild2
   * └── Child2
   * ```
   */
  printTree(): void {
    console.log(this.name);
    this.#printChildren("");
  }

  /**
   * Hilfsfunktion zum rekursiven Ausgeben der Kindknoten mit korrekter Formatierung.
   * @param prefix Das Präfix für die aktuelle Einrückungsebene.
   */
  #printChildren(prefix: string): void {
    const components = this.#components;
    const hasChildren = this.#children.length > 0;
    for (let i = 0; i < components.length; ++i) {
      const component = components[i];
      const isLast = i === components.length - 1 && !hasChildren;
      const connector = isLast ? "└─ *" : "├── *";
      console.log(prefix + connector + component.constructor.name);
    }

    const children = this.#children;
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      const isLast = i === children.length - 1;

      // Bestimme die Linienzeichen für den aktuellen Knoten
      const connector = isLast ? "└── " : "├── ";
      // Bestimme das Präfix für die nächste Ebene
      const extension = isLast ? "    " : "│   ";

      // Gib den Kind-Node aus
      console.log(prefix + connector + child.name);
      // Rekursiv die Nachkommen ausgeben
      child.#printChildren(prefix + extension);
    }
  }

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
