import type { UIMessage } from "@ai-sdk/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RunAgentOptions } from "./agent";
import { EMPTY_PROVIDER_KEYS, type ProviderKeys } from "./keyring";

const runAgentStreamMock = vi.hoisted(() =>
  vi.fn(async (_options: RunAgentOptions) => ({
    toUIMessageStream: () => new ReadableStream(),
  })),
);

const nativeMock = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock("./native", () => ({ native: nativeMock }));

vi.mock("./agent", () => ({ runAgentStream: runAgentStreamMock }));

import type { ToolContext } from "../tools/context";
import {
  type AgentRunSnapshot,
  createContextAwareTransport,
  resolveAgentRunSnapshot,
} from "./transport";

const persona = (id: string) => ({ id, name: id, instructions: "Act." });
const userMessage = (id: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text: "work" }],
});
const assistantMessage = (id: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "text", text: "continuing" }],
});

function snapshotMap(snapshot: AgentRunSnapshot) {
  if (!snapshot.userMessageId)
    throw new Error("expected valid user message ID");
  return new Map([[snapshot.userMessageId, snapshot]]);
}

describe("agent run privilege snapshot", () => {
  it("does not escalate a review run when the UI switches to YOLO", () => {
    const initial = resolveAgentRunSnapshot(
      [userMessage("user-1")],
      persona("builtin:coder"),
      false,
      new Map(),
    );
    const snapshots = snapshotMap(initial);
    const continuation = resolveAgentRunSnapshot(
      [userMessage("user-1"), assistantMessage("assistant-1")],
      persona("builtin:yolo"),
      false,
      snapshots,
    );

    expect(initial.approvalPolicy).toBe("review");
    expect(continuation).toBe(initial);
    expect(continuation.persona.id).toBe("builtin:coder");
  });

  it("takes the newly selected agent only for a new user message", () => {
    const initial = resolveAgentRunSnapshot(
      [userMessage("user-1")],
      persona("builtin:coder"),
      false,
      new Map(),
    );
    const snapshots = snapshotMap(initial);
    const next = resolveAgentRunSnapshot(
      [
        userMessage("user-1"),
        assistantMessage("assistant-1"),
        userMessage("user-2"),
      ],
      persona("builtin:yolo"),
      false,
      snapshots,
    );

    expect(next).not.toBe(initial);
    expect(next.userMessageId).toBe("user-2");
    expect(next.persona.id).toBe("builtin:yolo");
    expect(next.approvalPolicy).toBe("autonomous");
  });

  it("fails closed when restored turns reuse or omit user IDs", () => {
    const duplicateIdTurn = resolveAgentRunSnapshot(
      [
        userMessage("user-1"),
        assistantMessage("assistant-1"),
        userMessage("user-1"),
      ],
      persona("builtin:yolo"),
      false,
      new Map(),
    );
    const missingIdTurn = resolveAgentRunSnapshot(
      [userMessage("")],
      persona("builtin:yolo"),
      false,
      new Map(),
    );

    expect(duplicateIdTurn.userMessageId).toBeNull();
    expect(duplicateIdTurn.approvalPolicy).toBe("review");
    expect(missingIdTurn.userMessageId).toBeNull();
    expect(missingIdTurn.approvalPolicy).toBe("review");
  });

  it("does not change plan mode during the same user turn", () => {
    const initial = resolveAgentRunSnapshot(
      [userMessage("user-1")],
      persona("builtin:yolo"),
      false,
      new Map(),
    );
    const snapshots = snapshotMap(initial);
    const continuation = resolveAgentRunSnapshot(
      [userMessage("user-1"), assistantMessage("assistant-1")],
      persona("builtin:yolo"),
      true,
      snapshots,
    );

    expect(continuation).toBe(initial);
    expect(continuation.approvalPolicy).toBe("autonomous");
    expect(continuation.planMode).toBe(false);
  });

  it("snapshots plan mode as review for a YOLO run", () => {
    const snapshot = resolveAgentRunSnapshot(
      [userMessage("user-1")],
      persona("builtin:yolo"),
      true,
      new Map(),
    );

    expect(snapshot.approvalPolicy).toBe("review");
    expect(snapshot.planMode).toBe(true);
  });
});

describe("agent run transport continuation", () => {
  beforeEach(() => {
    runAgentStreamMock.mockClear();
    nativeMock.readFile.mockReset();
  });

  it("keeps the sent persona and policy for an actual continuation request", async () => {
    let selectedPersona = persona("builtin:coder");
    const toolContext: ToolContext = {
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
    const transport = createContextAwareTransport({
      getKeys: (): ProviderKeys => EMPTY_PROVIDER_KEYS,
      toolContext,
      getModelId: () => "openai:gpt-5.2",
      getCustomInstructions: () => "",
      getAgentPersona: () => selectedPersona,
      getLive: () => ({
        cwd: "/workspace",
        terminalPrivate: false,
        workspaceRoot: null,
        activeFile: null,
      }),
      getPlanMode: () => false,
    });

    const firstRequest = transport.sendMessages({
      messages: [userMessage("user-1")],
    });
    selectedPersona = persona("builtin:yolo");
    await firstRequest;
    await transport.sendMessages({
      messages: [userMessage("user-1"), assistantMessage("assistant-1")],
    });

    expect(runAgentStreamMock).toHaveBeenCalledTimes(2);
    expect(runAgentStreamMock.mock.calls[0]?.[0]).toMatchObject({
      agentPersona: { id: "builtin:coder" },
      approvalPolicy: "review",
    });
    expect(runAgentStreamMock.mock.calls[1]?.[0]).toMatchObject({
      agentPersona: { id: "builtin:coder" },
      approvalPolicy: "review",
    });
  });

  it("keeps A cached after B and a later continuation of A", async () => {
    let releaseMemoryRead:
      | ((value: { kind: "text"; content: string; size: number }) => void)
      | undefined;
    const memoryRead = new Promise<{
      kind: "text";
      content: string;
      size: number;
    }>((resolve) => {
      releaseMemoryRead = resolve;
    });
    nativeMock.readFile.mockReturnValueOnce(memoryRead);
    let selectedPersona = persona("builtin:coder");
    let workspaceRoot: string | null = "/overlap-workspace";
    const toolContext: ToolContext = {
      getCwd: () => "/workspace",
      getWorkspaceRoot: () => workspaceRoot,
      getTerminalContext: () => null,
      isActiveTerminalPrivate: () => false,
      injectIntoActivePty: () => false,
      openPreview: () => false,
      spawnAgent: () => null,
      readAgentOutput: () => null,
      readCache: new Map(),
      getSessionId: () => "session",
    };
    const transport = createContextAwareTransport({
      getKeys: (): ProviderKeys => EMPTY_PROVIDER_KEYS,
      toolContext,
      getModelId: () => "openai:gpt-5.2",
      getCustomInstructions: () => "",
      getAgentPersona: () => selectedPersona,
      getLive: () => ({
        cwd: "/workspace",
        terminalPrivate: false,
        workspaceRoot,
        activeFile: null,
      }),
      getPlanMode: () => false,
    });

    const reviewRequest = transport.sendMessages({
      messages: [userMessage("user-review")],
    });
    selectedPersona = persona("builtin:yolo");
    workspaceRoot = null;
    await transport.sendMessages({
      messages: [userMessage("user-review"), userMessage("user-yolo")],
    });
    releaseMemoryRead?.({ kind: "text", content: "memory", size: 6 });
    await reviewRequest;

    selectedPersona = persona("builtin:yolo");
    await transport.sendMessages({
      messages: [
        userMessage("user-review"),
        assistantMessage("assistant-review"),
      ],
    });

    const reviewCalls = runAgentStreamMock.mock.calls
      .map(([options]) => options)
      .filter((options) => options.uiMessages[0]?.id === "user-review")
      .filter(
        (options) =>
          options.uiMessages[options.uiMessages.length - 1]?.id !== "user-yolo",
      );
    expect(reviewCalls).toHaveLength(2);
    expect(reviewCalls[0]).toMatchObject({
      agentPersona: { id: "builtin:coder" },
      approvalPolicy: "review",
    });
    expect(reviewCalls[1]).toMatchObject({
      agentPersona: { id: "builtin:coder" },
      approvalPolicy: "review",
    });
  });
});
