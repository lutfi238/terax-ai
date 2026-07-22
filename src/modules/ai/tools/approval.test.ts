import { describe, expect, it } from "vitest";
import type { ToolContext } from "./context";
import { buildTools } from "./tools";

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
  it("requires approval by default", () => {
    const tools = buildTools(context);

    expect(tools.edit.needsApproval).toBe(true);
    expect(tools.multi_edit.needsApproval).toBe(true);
    expect(tools.write_file.needsApproval).toBe(true);
    expect(tools.create_directory.needsApproval).toBe(true);
    expect(tools.bash_run.needsApproval).toBe(true);
    expect(tools.bash_background.needsApproval).toBe(true);
    expect(tools.bash_kill.needsApproval).toBe(true);
    expect(tools.spawn_coding_agent.needsApproval).toBe(true);
    expect(tools.send_to_agent.needsApproval).toBe(true);
  });

  it("bypasses approval for autonomous agents", () => {
    const tools = buildTools(context, "autonomous");

    expect(tools.edit.needsApproval).toBe(false);
    expect(tools.multi_edit.needsApproval).toBe(false);
    expect(tools.write_file.needsApproval).toBe(false);
    expect(tools.create_directory.needsApproval).toBe(false);
    expect(tools.bash_run.needsApproval).toBe(false);
    expect(tools.bash_background.needsApproval).toBe(false);
    expect(tools.spawn_coding_agent.needsApproval).toBe(false);
    expect(tools.bash_kill.needsApproval).toBe(false);
    expect(tools.suggest_command.needsApproval).toBeUndefined();
    expect(tools.todo_write.needsApproval).toBeUndefined();
    expect(tools.open_preview.needsApproval).toBeUndefined();

    expect(tools.bash_run.description).toContain(
      "Runs automatically in autonomous mode.",
    );
    expect(tools.bash_run.description).not.toContain("Asks for user approval");
    expect(tools.send_to_agent.needsApproval).toBe(false);
  });
});
