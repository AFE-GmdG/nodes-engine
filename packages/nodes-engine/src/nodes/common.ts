import BaseNode from "./baseNode";

export type ConfigFor<
  TMap extends Record<string, abstract new (config: any, ...args: any[]) => BaseNode>,
> = {
  [K in keyof TMap & string]: ConstructorParameters<TMap[K]>[0] & { readonly type: K };
}[keyof TMap & string];

export type InstanceFor<
  TEngineMap extends Record<string, abstract new (...args: any[]) => any>,
  TAppMap extends Record<string, abstract new (...args: any[]) => any>,
  TConfig,
> = TConfig extends { type: infer K }
  ? K extends keyof TEngineMap
    ? InstanceType<TEngineMap[K]>   // Engine-Typ: konkret auflösbar, kein Generics-Problem
    : K extends keyof TAppMap
      ? InstanceType<TAppMap[K]>
      : never
  : never;
