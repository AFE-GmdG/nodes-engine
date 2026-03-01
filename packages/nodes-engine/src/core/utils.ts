/**
 * Delays execution for a given number of milliseconds.
 * @param ms delay in milliseconds.
 * - If 0 or negative, delays until next animation frame.
 */
export function delay(ms: number = 0): Promise<void> {
  if (ms <= 0) {
    return new Promise<void>(
      (resolve) => window.requestAnimationFrame(() => resolve()),
    );
  }
  return new Promise<void>(
    (resolve) => window.setTimeout(() => resolve(), ms),
  );
}

/**
 * Converts an unknown object into an Error instance.
 * @param ex The unknown object to convert into an actual error
 * @param unknownMessage Message to use when the unknown object cannot provide any useful information
 */
export function unknownToError(ex: unknown, unknownMessage: string = "Unknown error"): Error {
  if (ex instanceof Error) {
    return ex;
  }
  if (ex == null) {
    return new Error(unknownMessage);
  }
  if (typeof ex === "string") {
    return new Error(ex);
  }
  if (typeof ex === "object") {
    if ("message" in ex) {
      return new Error((ex as any).message);
    }
    return new Error(ex.toString());
  }
  return new Error(unknownMessage);
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

/**
 * Konverts a byte size into a human-readable string with appropriate units.
 * @param bytes number of bytes
 */
export function humanReadableSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  let unitIndex = 0;
  while (bytes >= 1024 && unitIndex < units.length - 1) {
    // eslint-disable-next-line no-param-reassign
    bytes /= 1024;
    unitIndex++;
  }
  return `${bytes.toFixed(1)} ${units[unitIndex]}`;
}
