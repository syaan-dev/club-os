import { useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

// Returns a stable proxy of a function map. The returned object and every
// method keep a constant identity for the component's lifetime, while each call
// always invokes the latest closure passed on the most recent render.
//
// This lets the provider memoize each domain's context value on its own state
// alone: because the action functions never change identity, a change in one
// domain (e.g. typing a club name) does not produce a new value object for an
// unrelated domain (e.g. dues), so those consumers skip re-rendering.
export function useStableApi<T extends Record<string, AnyFn>>(api: T): T {
  const latest = useRef(api);
  latest.current = api;

  const stable = useRef<T | null>(null);
  if (stable.current === null) {
    const proxy = {} as T;
    for (const key of Object.keys(api) as (keyof T)[]) {
      proxy[key] = ((...args: unknown[]) =>
        latest.current[key](...args)) as T[keyof T];
    }
    stable.current = proxy;
  }
  return stable.current;
}
