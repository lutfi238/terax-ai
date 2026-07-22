import { describe, expect, it } from "vitest";
import { approvalPolicyForRun, BUILTIN_AGENTS, findAgent } from "./agents";

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
