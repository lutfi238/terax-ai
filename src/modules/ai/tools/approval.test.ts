import { describe, expect, it } from "vitest";
import type { ToolContext } from "./context";
import { buildEditTools } from "./edit";
import { buildFsTools } from "./fs";
import { buildShellTools } from "./shell";

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
  getSessionId: () => "session",
};

describe("mutating AI tool approval policy", () => {
  it("always requires approval for file mutations and shell commands", () => {
    const edit = buildEditTools(context);
    const fs = buildFsTools(context);
    const shell = buildShellTools(context);

    expect(edit.edit.needsApproval).toBe(true);
    expect(edit.multi_edit.needsApproval).toBe(true);
    expect(fs.write_file.needsApproval).toBe(true);
    expect(fs.create_directory.needsApproval).toBe(true);
    expect(shell.bash_run.needsApproval).toBe(true);
    expect(shell.bash_background.needsApproval).toBe(true);
  });
});
