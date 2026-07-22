import type { GitDiffContentResult } from "@/modules/ai/lib/native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gitDiffContent = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/lib/native", () => ({
  native: { gitDiffContent, gitCommitFileDiff: vi.fn() },
}));
vi.mock("@/modules/workspace", () => ({
  currentWorkspaceScopeKey: () => "local",
}));

import {
  fetchWorkingDiff,
  getCachedDiff,
  invalidateDiff,
  subscribeDiff,
  subscribeDiffGeneration,
  workingDiffKey,
} from "./diffCache";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function result(content: string): GitDiffContentResult {
  return {
    originalContent: "",
    modifiedContent: content,
    isBinary: false,
    fallbackPatch: content,
    truncated: false,
  };
}

describe("diff cache invalidation", () => {
  beforeEach(() => {
    gitDiffContent.mockReset();
  });

  it("switches keys and rejects the old mode request", async () => {
    const repoRoot = "C:/fixture";
    const path = "MODE-SWITCH.md";
    const unstagedKey = workingDiffKey(repoRoot, path, "-");
    const stagedKey = workingDiffKey(repoRoot, path, "+");
    const unstaged = deferred<GitDiffContentResult>();
    const staged = deferred<GitDiffContentResult>();
    gitDiffContent
      .mockReturnValueOnce(unstaged.promise)
      .mockReturnValueOnce(staged.promise);

    const oldFetch = fetchWorkingDiff(repoRoot, path, "-", null);
    invalidateDiff(unstagedKey);
    invalidateDiff(stagedKey);
    const generations: number[] = [];
    const unsubscribe = subscribeDiffGeneration(stagedKey, (generation) => {
      generations.push(generation);
    });
    expect(generations).toEqual([1]);

    const stagedFetch = fetchWorkingDiff(repoRoot, path, "+", null);
    staged.resolve(result("staged"));
    await expect(stagedFetch).resolves.toMatchObject({
      modifiedContent: "staged",
    });

    unstaged.resolve(result("unstaged stale"));
    await oldFetch;
    expect(getCachedDiff(unstagedKey)).toBeUndefined();
    expect(getCachedDiff(stagedKey)?.modifiedContent).toBe("staged");
    unsubscribe();
  });

  it("notifies the active pane and rejects stale inflight cache writes", async () => {
    const repoRoot = "C:/fixture";
    const path = "INFLIGHT.md";
    const key = workingDiffKey(repoRoot, path, "+");
    const stale = deferred<GitDiffContentResult>();
    const fresh = deferred<GitDiffContentResult>();
    gitDiffContent
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise);
    const listener = vi.fn();
    const unsubscribe = subscribeDiff(key, listener);

    const staleFetch = fetchWorkingDiff(repoRoot, path, "+", null);
    invalidateDiff(key);
    expect(listener).toHaveBeenCalledTimes(1);

    stale.resolve(result("stale"));
    await staleFetch;
    expect(getCachedDiff(key)).toBeUndefined();

    const freshFetch = fetchWorkingDiff(repoRoot, path, "+", null);
    fresh.resolve(result("fresh"));
    await expect(freshFetch).resolves.toMatchObject({
      modifiedContent: "fresh",
    });
    expect(getCachedDiff(key)?.modifiedContent).toBe("fresh");

    unsubscribe();
  });
});
