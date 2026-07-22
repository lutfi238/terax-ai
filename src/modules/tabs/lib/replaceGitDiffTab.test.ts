import { describe, expect, it } from "vitest";
import { replaceGitDiffTab, type Tab } from "./useTabs";

describe("replaceGitDiffTab", () => {
  it("switches mode in place while preserving the tab id", () => {
    const tabs: Tab[] = [
      {
        id: 42,
        kind: "git-diff",
        spaceId: "default",
        title: "PROGRESS.md (-)",
        path: "PROGRESS.md",
        repoRoot: "C:/fixture",
        mode: "-",
        originalPath: null,
      },
    ];

    const result = replaceGitDiffTab(tabs, {
      path: "PROGRESS.md",
      repoRoot: "C:/fixture",
      mode: "+",
      originalPath: "OLD_PROGRESS.md",
    });

    expect(result?.id).toBe(42);
    expect(result?.tabs).toHaveLength(1);
    expect(result?.tabs[0]).toMatchObject({
      id: 42,
      kind: "git-diff",
      title: "PROGRESS.md (+)",
      mode: "+",
      originalPath: "OLD_PROGRESS.md",
    });
  });

  it("does not replace commit diff tabs for the same path", () => {
    const tabs: Tab[] = [
      {
        id: 7,
        kind: "git-commit-file",
        spaceId: "default",
        title: "PROGRESS.md",
        repoRoot: "C:/fixture",
        sha: "abc123",
        shortSha: "abc123",
        subject: "test",
        path: "PROGRESS.md",
        originalPath: null,
      },
    ];

    expect(
      replaceGitDiffTab(tabs, {
        path: "PROGRESS.md",
        repoRoot: "C:/fixture",
        mode: "+",
      }),
    ).toBeNull();
  });
});
