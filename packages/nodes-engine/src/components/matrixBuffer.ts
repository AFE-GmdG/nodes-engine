import Component, { ComponentConfig } from "./component";

import Matrix4 from "../math/matrix4";

import type BaseNode from "../nodes/baseNode";
import ViewportNode from "../nodes/viewport";

/**
 * Konfiguration für die MatrixBufferComponent.
 */
export type MatrixBufferComponentConfig = ComponentConfig & {
  /**
   * @property elementCount:
   * Anzahl der Matrizen, die der Buffer mindestens bereitstellen soll.
   * Der Buffer wird immer ein Vielfaches von 16 Matrizen bereitstellen,
   * um den Speicher optimal auszurichten und Reallocations zu vermeiden.
   * Default: 16 Matrizen (1KB)
   */
  elementCount?: number;
};

/**
 * Information zu einer einzelnen Matrix im Buffer.
 */
export type MatrixConfig = {
  /** Die Node, die die Matrix erstellt hat. */
  owner: BaseNode;
  /** Der Name der Matrix. Sollte je Owner eindeutig sein */
  name: string;
};

/**
 * Information zu einer einzelnen Matrix im Buffer, inklusive der Matrix selbst.
 */
export type MatrixInfo = Prettify<MatrixConfig & {
  /** Die Matrix selbst. */
  matrix: Matrix4;
}>;

/**
 * Die MatrixBufferComponent ist eine obligatorische Komponente eines ViewportNodes
 * und kann von diesem auch nicht entfernt werden.
 *
 * Der MatrixBuffer ist ein spezieller Buffer (readonly Storage Buffer) zum Speichern
 * von Matrizen, welche von Child-Nodes (z.B. Camera und Mesh Nodes) verwendet
 * werden, um sie gemeinsam an die GPU zu senden.
 *
 * Shader mönnen über eine Id auf den readonly StorageBuffer zugreifen,
 * um an die nötigen Matrizen zu kommen.
 *
 * **Speicherbedarf und Memory-Alignment:** \
 * Ein GPU Buffer sollte möglichst auf 256 Byte ausgerichtet sein.
 * Eine 4x4 Matrix aus 32-bit floats benötigt 64 Byte, d.h. es sollten immer
 * Vielfache von 4 Matrizen erlaubt sein. Eine Erhöhung auf ein Vielfaches von 16
 * Matrizen (1KB) verringert den Bedarf Reallocations.
 * Der Buffer wird also immer ein vielfaches von 1KB für je 16 Matrizen bereitstellen.
 *
 * TODO:
 * - MatrixBufferComponent muss von Component erben.
 *   Dazu muss der Constructor angepasst werden.
 * - Es müssen die Statischen Validierungseigenschaften und Methoden
 *   implementiert werden - Siehe {@link BaseNode.addComponent}.
 */
class MatrixBufferComponent extends Component {
  // --- Validierungseigenschaften und -methoden ---
  static readonly allowMultiple = false;
  static readonly isValidNodeType = (node: BaseNode) => {
    // MatrixBufferComponent darf nur in ViewportNodes existieren
    return node instanceof ViewportNode;
  };

  get viewport(): ViewportNode {
    if (!(this.owner instanceof ViewportNode)) {
      throw new Error("MatrixBufferComponent can only be used in ViewportNodes.");
    }
    return this.owner;
  }

  readonly #bufferName: string;

  #elementCapacity: number;
  get elementCapacity() { return this.#elementCapacity; }

  get elementCount() { return this.#map.size; }

  #freeIndices: Set<number>;

  #map: Map<number, MatrixInfo>;
  #data: Float32Array;
  #buffer: GPUBuffer | null;

  constructor(config: MatrixBufferComponentConfig, owner: BaseNode) {
    const { elementCount = 16, ...baseConfig } = config;
    super(baseConfig, owner);

    // Die Id eines Nodes ist stabil und eindeutig.
    this.#bufferName = `matrix-buffer (${this.viewport.id})`;

    this.#elementCapacity = Math.ceil(elementCount / 16) * 16;
    this.#freeIndices = new Set(Array.from({ length: this.#elementCapacity }, (_, i) => i));

    this.#map = new Map();
    this.#data = new Float32Array(this.#elementCapacity * 16);
    this.#buffer = null;
  }

  /**
   * Erstellt eine neue Matrix im Buffer und gibt die Id zurück, unter der sie erreichbar ist.
   */
  createMatrix({ owner, name }: MatrixConfig): number {
    if (this.#freeIndices.size === 0) {
      // Vergrößere den Buffer um weitere 16 Matrizen (1KB)
      const newData = new Float32Array((this.#elementCapacity + 16) * 16);
      // Kopiere die alten Daten in den neuen Buffer
      newData.set(this.#data);
      this.#elementCapacity += 16;
      this.#freeIndices = new Set(Array.from({ length: 16 }, (_, i) => this.#elementCapacity - 16 + i));
      this.#data = newData;

      // Lösche den alten GPU Buffer. Er wird beim nächsten Update neu erstellt.
      if (this.#buffer) {
        const { rendererApi } = this.viewport;
        rendererApi.buffers.delete(this.#bufferName);
      }

      // Weise den vorhandenen Matrizen den neuen Buffer zu
      for (const [id, matrixInfo] of this.#map.entries()) {
        matrixInfo.matrix.setBuffer(newData, id * 16);
      }
    }

    const id = this.#freeIndices.values().next().value!;
    this.#freeIndices.delete(id);

    const matrix = new Matrix4(this.#data, id * 16, name);
    this.#map.set(id, { matrix, owner, name });

    return id;
  }

  /**
   * Entfernt eine Matrix aus dem Buffer.
   * Aus Sicherheitsgründen muss der Owner für die Id mitgegeben werden,
   * damit nicht versehentlich die Matrix eines anderen Nodes gelöscht wird.
   * @param owner Der Node, welche die Matrix erstellt hat.
   * Muss mit der Node übereinstimmen, welche die Matrix tatsächlich erstellt hat.
   * @param id Die Id der zu entfernenden Matrix.
   * Die Id muss gültig sein und darf nicht bereits frei sein.
   * @returns true, wenn die Matrix erfolgreich entfernt wurde, andernfalls false
   * (z.B. die Id ungültig ist, die Matrix bereits frei ist oder der Owner nicht übereinstimmt).
   */
  removeMatrix(owner: BaseNode, id: number): boolean {
    const matrixInfo = this.#map.get(id);
    if (!matrixInfo || matrixInfo.owner !== owner) {
      // Ungültige Id oder Owner stimmt nicht überein
      console.warn(`Failed to remove matrix with id ${id}: Invalid id or owner mismatch.`);
      return false;
    }

    this.#map.delete(id);
    this.#freeIndices.add(id);
    return true;
  }

  /**
   * Benennt eine Matrix im Buffer um.
   * Der Name ist für den Owner gedacht, damit er die Matrizen besser unterscheiden kann.
   * Außerdem können so bessere Fehler und Diagnosemeldungen erstellt werden.
   * @param owner Der Node, welche die Matrix erstellt hat.
   * @param id Die Id der zu benennenden Matrix.
   * @param newName Der neue Name der Matrix. Sollte je Owner eindeutig sein.
   * @returns true, wenn die Matrix erfolgreich umbenannt wurde, andernfalls false
   * (z.B. die Id ungültig ist, die Matrix bereits frei ist oder der Owner nicht übereinstimmt).
   */
  renameMatrix(owner: BaseNode, id: number, newName: string): boolean {
    const matrixInfo = this.#map.get(id);
    if (!matrixInfo || matrixInfo.owner !== owner) {
      // Ungültige Id oder Owner stimmt nicht überein
      console.warn(`Failed to rename matrix with id ${id}: Invalid id or owner mismatch.`);
      return false;
    }

    matrixInfo.name = newName;
    return true;
  }

  /**
   * Gibt die MatrixInfo für die gegebene Id zurück. Gibt undefined zurück, wenn die Id ungültig ist oder frei ist.
   * @param id Die Id der Matrix.
   */
  getById(id: number): MatrixInfo | undefined {
    return this.#map.get(id);
  }
}

export default MatrixBufferComponent;
