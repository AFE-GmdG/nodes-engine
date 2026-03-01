class NamedResourceMap<T> {
  #resources = new Map<string, T>();
  #destroy?: (resource: T) => void;

  constructor(destroy?: (resource: T) => void) {
    this.#destroy = destroy;
  }

  get(label: string): T | undefined {
    return this.#resources.get(label);
  }

  set(label: string, factory: (label: string) => T): T {
    const existing = this.#resources.get(label);
    if (existing) {
      this.#destroy?.(existing);
    }
    const resource = factory(label);
    this.#resources.set(label, resource);
    return resource;
  }

  getOrSet(label: string, factory: (label: string) => T): T {
    let resource = this.#resources.get(label);
    if (!resource) {
      resource = factory(label);
      this.#resources.set(label, resource);
    }
    return resource;
  }

  delete(label: string): void {
    const resource = this.#resources.get(label);
    if (resource) {
      this.#destroy?.(resource);
      this.#resources.delete(label);
    }
  }

  destroyAll(): void {
    for (const resource of this.#resources.values()) {
      this.#destroy?.(resource);
    }
    this.#resources.clear();
  }
}

export default NamedResourceMap;
