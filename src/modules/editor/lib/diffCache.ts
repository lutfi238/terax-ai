import { type GitDiffContentResult, native } from "@/modules/ai/lib/native";
import { currentWorkspaceScopeKey } from "@/modules/workspace";

const DIFF_CACHE_LIMIT = 6;
type InflightDiff = {
  generation: number;
  promise: Promise<GitDiffContentResult>;
};
const inflight = new Map<string, InflightDiff>();
const cache = new Map<string, GitDiffContentResult>();
const generations = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

function touch(key: string, value: GitDiffContentResult) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > DIFF_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function getCachedDiff(key: string): GitDiffContentResult | undefined {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

export function getDiffGeneration(key: string): number {
  return generations.get(key) ?? 0;
}

export function subscribeDiff(key: string, listener: () => void): () => void {
  const current = listeners.get(key) ?? new Set<() => void>();
  current.add(listener);
  listeners.set(key, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) listeners.delete(key);
  };
}
export function subscribeDiffGeneration(
  key: string,
  listener: (generation: number) => void,
): () => void {
  listener(getDiffGeneration(key));
  return subscribeDiff(key, () => listener(getDiffGeneration(key)));
}

function invalidateKey(key: string): void {
  cache.delete(key);
  generations.set(key, getDiffGeneration(key) + 1);
  listeners.get(key)?.forEach((listener) => {
    listener();
  });
}

export function invalidateDiff(key: string): void {
  invalidateKey(key);
}

export function invalidateRepoDiffs(repoRoot: string): void {
  const prefix = `${currentWorkspaceScopeKey()}|${repoRoot}|`;
  const keys = new Set([
    ...cache.keys(),
    ...inflight.keys(),
    ...generations.keys(),
    ...listeners.keys(),
  ]);
  for (const key of keys) {
    if (key.startsWith(prefix)) invalidateKey(key);
  }
}

export function workingDiffKey(
  repoRoot: string,
  path: string,
  mode: "-" | "+",
): string {
  return `${currentWorkspaceScopeKey()}|${repoRoot}|w|${mode}|${path}`;
}

export function commitDiffKey(
  repoRoot: string,
  sha: string,
  path: string,
): string {
  return `${currentWorkspaceScopeKey()}|${repoRoot}|c|${sha}|${path}`;
}

export async function fetchWorkingDiff(
  repoRoot: string,
  path: string,
  mode: "-" | "+",
  originalPath: string | null,
): Promise<GitDiffContentResult> {
  const key = workingDiffKey(repoRoot, path, mode);
  const cached = getCachedDiff(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  const generation = getDiffGeneration(key);
  if (pending?.generation === generation) return pending.promise;
  const promise = native
    .gitDiffContent(repoRoot, path, mode === "+", originalPath)
    .then((res) => {
      if (getDiffGeneration(key) === generation) touch(key, res);
      return res;
    })
    .finally(() => {
      if (inflight.get(key)?.promise === promise) inflight.delete(key);
    });
  inflight.set(key, { generation, promise });
  return promise;
}

export async function fetchCommitDiff(
  repoRoot: string,
  sha: string,
  path: string,
  originalPath: string | null,
): Promise<GitDiffContentResult> {
  const key = commitDiffKey(repoRoot, sha, path);
  const cached = getCachedDiff(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  const generation = getDiffGeneration(key);
  if (pending?.generation === generation) return pending.promise;
  const promise = native
    .gitCommitFileDiff(repoRoot, sha, path, originalPath)
    .then((res) => {
      if (getDiffGeneration(key) === generation) touch(key, res);
      return res;
    })
    .finally(() => {
      if (inflight.get(key)?.promise === promise) inflight.delete(key);
    });
  inflight.set(key, { generation, promise });
  return promise;
}
