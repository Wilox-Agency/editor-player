import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Write<T, U> = Omit<T, keyof U> & U;
type ListenerCleanupFn = () => void;
type UnsubscribeFn = () => void;

/* -----------------------------------------------------------------------------
 * Subscribe with cleanup
 * -----------------------------------------------------------------------------*/

type PartialStoreSubscribeWithCleanup<T> = {
  subscribe: (
    // Include the cleanup function as a possible return value
    listener: (state: T, prevState: T) => ListenerCleanupFn | void
  ) => UnsubscribeFn;
};

// Create mutator that overrides a given store with the new store type
type StoreSubscribeWithCleanup<S> = S extends { getState: () => infer T }
  ? Write<S, PartialStoreSubscribeWithCleanup<T>>
  : never;

declare module 'zustand' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StoreMutators<S, A> {
    // Include the new mutator in the store mutators
    ['subscribeWithCleanup']: StoreSubscribeWithCleanup<S>;
  }
}

// Type used for the end result
type SubscribeWithCleanup = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, [...Mps, ['subscribeWithCleanup', never]], Mcs>
) => StateCreator<T, Mps, [['subscribeWithCleanup', never], ...Mcs]>;

// Type used for the implementation
type SubscribeWithCleanupImpl = <T>(
  f: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

const subscribeWithCleanupImpl: SubscribeWithCleanupImpl = (stateCreator) => {
  return (set, get, store) => {
    const subscribe = store.subscribe;
    store.subscribe = (originalListener) => {
      let cleanup: ListenerCleanupFn | void;

      const listener: typeof originalListener = (...args) => {
        /* Before calling the listener, execute the cleanup function that was
        returned by the listener on its previous call (if any) */
        if (typeof cleanup === 'function') cleanup();
        // Then call the listener and save the cleanup function returned by it
        cleanup = originalListener(...args);
      };

      const originalUnsubscribe = subscribe(listener);
      return () => {
        // Execute the cleanup when the listener is unsubscribed
        if (typeof cleanup === 'function') cleanup();
        originalUnsubscribe();
      };
    };

    return stateCreator(set, get, store);
  };
};

/**
 * Allows store listeners to return a cleanup function that will be called when
 * the same listener is called again and when the listener is unsubscribed,
 * similar to the `useEffect` hook.
 *
 * **Does not work with the `subscribeWithSelector` middleware**, for that, use
 * the `subscribeWithSelectorAndCleanup` middleware instead.
 */
export const subscribeWithCleanup =
  subscribeWithCleanupImpl as SubscribeWithCleanup;

/* -----------------------------------------------------------------------------
 * Subscribe with selector and cleanup
 *
 * Code adapted from zustand's `subscribeWithSelector` middleware.
 * The original code is licensed under the MIT license and can be found here:
 * https://github.com/pmndrs/zustand/blob/9d24d11e1e37c74f64e5c4ccd1c461d6c23522a7/src/middleware/subscribeWithSelector.ts
 *
 * -----------------------------------------------------------------------------*/

type PartialStoreSubscribeWithSelectorAndCleanup<T> = {
  subscribe: {
    (
      // Include the cleanup function as a possible return value
      listener: (state: T, prevState: T) => ListenerCleanupFn | void
    ): UnsubscribeFn;
    <U>(
      selector: (state: T) => U,
      listener: (
        selectedState: U,
        previousSelectedState: U
        // Include the cleanup function as a possible return value
      ) => ListenerCleanupFn | void,
      options?: {
        equalityFn?: (a: U, b: U) => boolean;
        fireImmediately?: boolean;
      }
    ): UnsubscribeFn;
  };
};

// Create mutator that overrides a given store with the new store type
type StoreSubscribeWithSelectorAndCleanup<S> = S extends {
  getState: () => infer T;
}
  ? Write<S, PartialStoreSubscribeWithSelectorAndCleanup<T>>
  : never;

declare module 'zustand' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StoreMutators<S, A> {
    // Include the new mutator in the store mutators
    ['subscribeWithSelectorAndCleanup']: StoreSubscribeWithSelectorAndCleanup<S>;
  }
}

// Type used for the end result
type SubscribeWithSelectorAndCleanup = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, [...Mps, ['subscribeWithSelectorAndCleanup', never]], Mcs>
) => StateCreator<T, Mps, [['subscribeWithSelectorAndCleanup', never], ...Mcs]>;

// Type used for the implementation
type SubscribeWithSelectorAndCleanupImpl = <T>(
  f: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

const subscribeWithSelectorAndCleanupImpl: SubscribeWithSelectorAndCleanupImpl =
  (stateCreator) => {
    return (set, get, store) => {
      type State = ReturnType<typeof stateCreator>;
      type Selector = (state: State) => unknown;
      type Listener<TSelectedState = unknown> = (
        state: TSelectedState,
        previousState: TSelectedState
      ) => ListenerCleanupFn | void;
      type Options = {
        equalityFn?: (a: unknown, b: unknown) => boolean;
        fireImmediately?: boolean;
      };

      const subscribe = store.subscribe;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.subscribe = ((
        ...args:
          | [selector: Selector, optListener?: Listener, options?: Options]
          | [listener: Listener<State>]
      ) => {
        const [selectorOrListener, optListener, options] = args;

        let cleanup: ListenerCleanupFn | void;

        let listener: Listener<State>;
        const selectorNotProvided = !optListener;
        if (selectorNotProvided) {
          listener = (...args) => {
            /* Before calling the listener, execute the cleanup function that
            was returned by the listener on its previous call (if any) */
            if (typeof cleanup === 'function') cleanup();
            /* Then call the listener and save the cleanup function returned by
            it */
            cleanup = (selectorOrListener as Listener<State>)(...args);
          };
        } else {
          const selector = selectorOrListener as Selector;

          const equalityFn = options?.equalityFn || Object.is;
          let currentSlice = selector(store.getState());
          listener = (state) => {
            const nextSlice = selector(state);
            if (!equalityFn(currentSlice, nextSlice)) {
              const previousSlice = currentSlice;
              currentSlice = nextSlice;

              /* Before calling the listener, execute the cleanup function that
              was returned by the listener on its previous call (if any) */
              if (typeof cleanup === 'function') cleanup();
              /* Then call the listener and save the cleanup function returned
              by it */
              cleanup = optListener(currentSlice, previousSlice);
            }
          };
          if (options?.fireImmediately) {
            cleanup = optListener(currentSlice, currentSlice);
          }
        }

        return subscribe(listener);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;

      return stateCreator(set, get, store);
    };
  };

/**
 * Middleware that allows store listeners:
 *  - to provide a selector to the listener, so that the listener can be called
 *    only when the selected state changes (according to the equality function
 *    provided in the `options`).
 *  - to return a cleanup function that will be called when the same listener is
 *    called again, and when the listener is unsubscribed from the store,
 *    similar to the `useEffect` hook.
 */
export const subscribeWithSelectorAndCleanup =
  subscribeWithSelectorAndCleanupImpl as SubscribeWithSelectorAndCleanup;
