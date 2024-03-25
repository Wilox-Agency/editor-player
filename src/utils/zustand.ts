export function cleanListener<
  TArgs extends unknown[],
  TFunc extends (...args: TArgs) => (() => void) | void
>(listener: TFunc) {
  let cleanup: (() => void) | void;
  return (...args: TArgs) => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
    cleanup = listener(...args);
  };
}
