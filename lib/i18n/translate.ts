// Tipli kalitlar: "start.title" kabi nuqtali yo'l; {name} ko'rinishidagi parametrlar.

type Leaf = string;
export type Widen<T> = T extends string ? Leaf : { [K in keyof T]: Widen<T[K]> };

type Join<K extends string, P extends string> = `${K}.${P}`;
export type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T & string];

export type Params = Record<string, string | number>;

export function lookup(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in cur) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export function makeT<D>(dict: D) {
  return (key: Paths<D>, params?: Params): string => interpolate(lookup(dict, key) ?? key, params);
}
