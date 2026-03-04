/**
 * Jeder Node und jede Komponente hat einen Prozessmodus, der angibt,
 * wie sie aktualisiert werden soll.
 */
enum ProcessMode {
  /**
   * Dieser Node oder diese Komponente erbt den Prozessmodus von seinem Eltern-Node.
   */
  Inherit,
  /**
   * Dieser Node oder diese Komponente wird nur aktualisiert,
   * wenn das Spiel nicht pausiert ist.
   */
  Pausable,
  /**
   * Dieser Node oder diese Komponente wird ausschließlich aktualisiert,
   * wenn das Spiel pausiert ist.
   */
  WhenPaused,
  /**
   * Dieser Node oder diese Komponente wird immer aktualisiert,
   * unabhängig davon, ob das Spiel pausiert ist oder nicht.
   */
  Always,
  /**
   * Dieser Node oder diese Komponente wird niemals aktualisiert.
   */
  Disabled,
}

export default ProcessMode;
