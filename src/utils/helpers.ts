export function mapValues<T extends Record<string, any>, VO>(
  obj: T,
  mapping: <K extends keyof T>(value: T[K], key: K) => VO
): Record<keyof T, VO> {
  return Object.keys(obj).reduce((acc, key: keyof T): Record<keyof T, VO> => {
    acc[key] = mapping(obj[key], key);
    return acc;
  }, {} as Record<keyof T, VO>);
}

export function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}