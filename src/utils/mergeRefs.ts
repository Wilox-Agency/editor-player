import type { ForwardedRef, MutableRefObject, RefCallback } from 'react';

export type AnyMutableRef<T> =
  | RefCallback<T>
  | MutableRefObject<T>
  | ForwardedRef<T>;

export function mergeRefs<T>(...refs: AnyMutableRef<T>[]) {
  const filteredRefs = refs.filter(Boolean) as NonNullable<AnyMutableRef<T>>[];
  if (!filteredRefs) return null;
  if (filteredRefs.length === 1) return filteredRefs[0];

  return (instance: T) => {
    for (const ref of filteredRefs) {
      if (typeof ref === 'function') ref(instance);
      else ref.current = instance;
    }
  };
}
