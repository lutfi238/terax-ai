import type { ToolExecutionOptions } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "./context";

const nativeMock = vi.hoisted(() => ({
  shellSessionOpen: vi.fn(async () => 17),
  shellSessionRun: vi.fn(async () => ({
    stdout: "completed output\n",
    stderr: "warning output\n",
    exit_code: 7,
    timed_out: false,
    truncated: true,
    cwd_after: "/workspace/packages/app",
  })),
}));

vi.mock("../lib/native", () => ({ native: nativeMock }));
vi.mock("@/modules/workspace", () => ({
  currentWorkspaceEnv: () => null,
  workspaceScopeKey: () => "workspace",
}));

import { buildShellTools } from "./shell";

const toolOptions: ToolExecutionOptions = {
  toolCallId: "tool-call",
  messages: [],
};

const context: ToolContext = {
  getCwd: () => "/workspace",
  getWorkspaceRoot: () => "/workspace",
  getTerminalContext: () => null,
  isActiveTerminalPrivate: () => false,
  injectIntoActivePty: () => false,
  openPreview: () => false,
  spawnAgent: () => null,
  readAgentOutput: () => null,
  readCache: new Map(),
  getSessionId: () => "shell-completion-session",
};

describe("foreground shell completion", () => {
  it("returns the complete native result after the command finishes", async () => {
    const execute = buildShellTools(context, false).bash_run.execute;
    if (!execute) throw new Error("bash_run tool execute missing");

    const result = await execute(
      { command: "echo completed", timeout_secs: 30 },
      toolOptions,
    );

    expect(nativeMock.shellSessionRun).toHaveBeenCalledWith(
      17,
      "echo completed",
      "/workspace",
      30,
    );
    expect(result).toEqual({
      command: "echo completed",
      stdout: "completed output\n",
      stderr: "warning output\n",
      exit_code: 7,
      timed_out: false,
      truncated: true,
      cwd_after: "/workspace/packages/app",
    });
  });
});
