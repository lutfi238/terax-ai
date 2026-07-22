import { describe, expect, it, vi } from "vitest";
import {
  checkboxChangeStages,
  runOptimisticMutation,
} from "./useSourceControlPanel";

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
} {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("checkboxChangeStages", () => {
  it("stages only when the controlled checkbox requests checked", () => {
    expect(checkboxChangeStages(true)).toBe(true);
    expect(checkboxChangeStages(false)).toBe(false);
    expect(checkboxChangeStages("indeterminate")).toBe(false);
  });
});

describe("runOptimisticMutation", () => {
  it("reapplies optimistic state after an asynchronous Git mutation", async () => {
    const gitMutation = deferred();
    const applyOptimistic = vi.fn();
    const mutation = runOptimisticMutation(
      applyOptimistic,
      () => gitMutation.promise,
    );

    expect(applyOptimistic).toHaveBeenCalledTimes(1);

    gitMutation.resolve();
    await mutation;

    expect(applyOptimistic).toHaveBeenCalledTimes(2);
  });

  it("leaves reconciliation to the error path when Git fails", async () => {
    const gitMutation = deferred();
    const applyOptimistic = vi.fn();
    const mutation = runOptimisticMutation(
      applyOptimistic,
      () => gitMutation.promise,
    );

    gitMutation.reject(new Error("git add failed"));

    await expect(mutation).rejects.toThrow("git add failed");
    expect(applyOptimistic).toHaveBeenCalledTimes(1);
  });
});
