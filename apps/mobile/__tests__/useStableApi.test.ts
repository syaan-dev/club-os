import { renderHook } from "@testing-library/react-native";
import { useStableApi } from "../src/lib/useStableApi";

describe("useStableApi", () => {
  it("keeps the proxy object and each method referentially stable across renders", () => {
    const { result, rerender } = renderHook(
      ({ n }: { n: number }) => useStableApi({ getN: () => n }),
      { initialProps: { n: 1 } },
    );

    const firstProxy = result.current;
    const firstFn = result.current.getN;

    rerender({ n: 2 });

    expect(result.current).toBe(firstProxy);
    expect(result.current.getN).toBe(firstFn);
  });

  it("always invokes the latest closure, not the one captured at first render", () => {
    const { result, rerender } = renderHook(
      ({ n }: { n: number }) => useStableApi({ getN: () => n }),
      { initialProps: { n: 1 } },
    );

    expect(result.current.getN()).toBe(1);

    rerender({ n: 2 });

    expect(result.current.getN()).toBe(2);
  });

  it("forwards arguments and return values through the stable wrapper", () => {
    const { result } = renderHook(() =>
      useStableApi({ add: (a: number, b: number) => a + b }),
    );

    expect(result.current.add(2, 3)).toBe(5);
  });
});
