import { getVersion } from "@tauri-apps/api/app";
import { useCallback, useEffect, useState } from "react";

const LAST_CHECK_KEY = "terax:updater:last-check";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const GITHUB_LATEST_RELEASE =
  "https://api.github.com/repos/crynta/terax-ai/releases/latest";

export interface OfficialReleaseInfo {
  version: string;
  currentVersion: string;
  body: string;
  releaseUrl: string;
}

export type UpdaterStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; info: OfficialReleaseInfo }
  | { kind: "error"; message: string };

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split("-")[0]
    .split(".")
    .map((p) => Number.parseInt(p, 10) || 0);
}

function isNewer(remote: string, current: string): boolean {
  const a = parseVersion(remote);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

type FetchRelease = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function checkOfficialRelease(
  currentVersion: string,
  fetchRelease: FetchRelease = fetch,
): Promise<OfficialReleaseInfo | null> {
  const res = await fetchRelease(GITHUB_LATEST_RELEASE, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as {
    tag_name: string;
    body?: string;
    html_url: string;
  };
  const version = data.tag_name.replace(/^v/, "");
  if (!isNewer(version, currentVersion)) return null;
  return {
    version,
    currentVersion,
    body: data.body ?? "",
    releaseUrl: data.html_url,
  };
}

interface Options {
  /** Skip the time-based throttle on automatic startup checks. */
  manual?: boolean;
}

interface HookOptions {
  /** When false, the hook does not run an automatic check on mount. */
  autoCheck?: boolean;
}

export function useUpdater({ autoCheck = true }: HookOptions = {}) {
  const [status, setStatus] = useState<UpdaterStatus>({ kind: "idle" });

  const runCheck = useCallback(async ({ manual }: Options = {}) => {
    if (!manual) {
      const last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
      if (Date.now() - last < CHECK_INTERVAL_MS) return;
    }
    setStatus({ kind: "checking" });
    try {
      const info = await checkOfficialRelease(await getVersion());
      if (info) {
        setStatus({ kind: "available", info });
      } else {
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        setStatus({ kind: "uptodate" });
      }
    } catch (err) {
      setStatus({ kind: "error", message: String(err) });
    }
  }, []);

  const dismiss = useCallback(() => {
    setStatus({ kind: "idle" });
  }, []);

  useEffect(() => {
    if (!autoCheck) return;
    void runCheck();
  }, [autoCheck, runCheck]);

  return { status, check: runCheck, dismiss };
}
