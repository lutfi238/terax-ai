import { describe, expect, it, vi } from "vitest";
import { checkOfficialRelease } from "./useUpdater";

describe("official release notifier", () => {
  it("returns the official release page instead of an installable update", async () => {
    const fetchRelease = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            tag_name: "v0.8.6",
            body: "Official release notes",
            html_url: "https://github.com/crynta/terax-ai/releases/tag/v0.8.6",
          }),
          { status: 200 },
        ),
    );

    await expect(checkOfficialRelease("0.8.5", fetchRelease)).resolves.toEqual({
      version: "0.8.6",
      currentVersion: "0.8.5",
      body: "Official release notes",
      releaseUrl: "https://github.com/crynta/terax-ai/releases/tag/v0.8.6",
    });
  });

  it("does not notify when the official release is not newer", async () => {
    const fetchRelease = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            tag_name: "v0.8.5",
            html_url: "https://github.com/crynta/terax-ai/releases/tag/v0.8.5",
          }),
          { status: 200 },
        ),
    );

    await expect(
      checkOfficialRelease("0.8.5", fetchRelease),
    ).resolves.toBeNull();
  });
});
