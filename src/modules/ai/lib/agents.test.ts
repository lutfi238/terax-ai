import { describe, expect, it } from "vitest";
import { type Agent, approvalPolicyForRun, BUILTIN_AGENTS, findAgent } from "./agents";

const custom: Agent = {
  id: "a-1",
  name: "Mine",
  description: "",
  instructions: "",
  icon: "spark",
  builtIn: false,
};

const all = [...BUILTIN_AGENTS, custom];

describe("BUILTIN_AGENTS", () => {
  it("all carry unique ids and the builtIn flag", () => {
    const ids = BUILTIN_AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BUILTIN_AGENTS.every((a) => a.builtIn)).toBe(true);
  });
});

describe("findAgent", () => {
  it("returns the agent whose id matches", () => {
    expect(findAgent(all, "a-1")).toBe(custom);
  });

  it("falls back to the first builtin for a missing id", () => {
    expect(findAgent(all, "does-not-exist")).toBe(BUILTIN_AGENTS[0]);
  });

  it("falls back to the first builtin for null, undefined, or empty id", () => {
    expect(findAgent(all, null)).toBe(BUILTIN_AGENTS[0]);
    expect(findAgent(all, undefined)).toBe(BUILTIN_AGENTS[0]);
    expect(findAgent(all, "")).toBe(BUILTIN_AGENTS[0]);
  });
});

describe("built-in agents", () => {
  it("registers the trusted YOLO built-in", () => {
    expect(BUILTIN_AGENTS).toContainEqual(
      expect.objectContaining({
        id: "builtin:yolo",
        name: "YOLO",
        builtIn: true,
      }),
    );
    expect(approvalPolicyForRun("builtin:yolo", false)).toBe("autonomous");
  });

  it("keeps every other agent review-gated, including forged persisted data", () => {
    const forgedCustom = {
      id: "custom",
      name: "Custom",
      description: "",
      instructions: "",
      icon: "spark" as const,
      builtIn: false,
      approvalPolicy: "autonomous",
    };
    const selected = findAgent([...BUILTIN_AGENTS, forgedCustom], "custom");

    expect(approvalPolicyForRun(selected.id, false)).toBe("review");
    expect(approvalPolicyForRun("missing", false)).toBe("review");
  });

  it("keeps plan mode review-gated even for YOLO", () => {
    expect(approvalPolicyForRun("builtin:yolo", true)).toBe("review");
  });
});
