import { describe, expect, it } from "vitest";
import {
  compatModelIdForEndpoint,
  type CustomEndpoint,
} from "@/modules/ai/config";
import { resolveStoredDefaultModelId } from "./store";

const endpoint: CustomEndpoint = {
  id: "local-coder",
  name: "Local Coder",
  baseURL: "http://localhost:1234/v1",
  modelId: "coder-model",
  contextLimit: 400_000,
};

describe("resolveStoredDefaultModelId", () => {
  it("accepts a configured custom endpoint model", () => {
    const modelId = compatModelIdForEndpoint(endpoint.id);

    expect(resolveStoredDefaultModelId(modelId, [endpoint])).toBe(modelId);
  });

  it("resets a custom default when an endpoint edit makes it incomplete", () => {
    const modelId = compatModelIdForEndpoint(endpoint.id);

    expect(
      resolveStoredDefaultModelId(modelId, [{ ...endpoint, modelId: "  " }]),
    ).toBe("gpt-5.4-mini");
  });

  it("rejects a custom endpoint model whose endpoint no longer exists", () => {
    expect(resolveStoredDefaultModelId("compat-missing", [endpoint])).toBe(
      "gpt-5.4-mini",
    );
  });
});
