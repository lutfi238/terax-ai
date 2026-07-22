import { describe, expect, it } from "vitest";
import {
  buildCommitMessagePrompt,
  buildRepairCommitMessagePrompt,
  cleanCommitMessage,
  isValidCommitMessage,
} from "./commitMessage";

const entries = [{ statusCode: "M", path: "src/app.ts", originalPath: null }];

describe("commit message generation", () => {
  it("requests an Indonesian subject and detailed bullet body", () => {
    const prompt = buildCommitMessagePrompt(
      entries,
      "diff --git a/src/app.ts b/src/app.ts",
      false,
      "Bahasa Indonesia",
      [],
    );

    expect(prompt).toContain("Write the subject and body in Bahasa Indonesia");
    expect(prompt).toContain("2 to 5 bullet points");
  });

  it("provides recent subjects for automatic language matching", () => {
    const prompt = buildCommitMessagePrompt(entries, "diff", false, "Auto", [
      "fix(ai): perbaiki tampilan chat",
      "feat(git): tambah pemilih bahasa",
    ]);

    expect(prompt).toContain("Detect and follow the dominant natural language");
    expect(prompt).toContain("fix(ai): perbaiki tampilan chat");
  });

  it("preserves a valid multiline message", () => {
    const message = cleanCommitMessage(
      "fix(ai): perbaiki endpoint\n\n- teruskan API key endpoint\n- tampilkan batas konteks",
    );

    expect(message).toContain("\n\n- teruskan API key endpoint");
    expect(isValidCommitMessage(message)).toBe(true);
  });

  it("grounds repair output in the staged diff", () => {
    const prompt = buildRepairCommitMessagePrompt(
      "fix(ai): perbaiki endpoint",
      entries,
      "Bahasa Indonesia",
      [],
      "diff --git a/src/app.ts b/src/app.ts\n+forward endpoint API key",
      false,
    );

    expect(prompt).toContain("forward endpoint API key");
    expect(prompt).toContain("The full staged diff is included below.");
  });

  it("rejects a subject without a detailed bullet body", () => {
    expect(isValidCommitMessage("fix(ai): perbaiki endpoint")).toBe(false);
  });
});
