import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compatModelIdForEndpoint,
  type CustomEndpoint,
} from "@/modules/ai/config";
import { buildConfiguredLanguageModel } from "@/modules/ai/lib/agent";
import { EMPTY_PROVIDER_KEYS } from "@/modules/ai/lib/keyring";
import { buildCommitModelConfig } from "./commitModelConfig";
const providerOptions = vi.hoisted(() => ({
  baseURL: "",
  apiKey: undefined as string | undefined,
  modelId: "",
}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: (options: { baseURL: string; apiKey?: string }) => {
    providerOptions.baseURL = options.baseURL;
    providerOptions.apiKey = options.apiKey;
    return (modelId: string) => {
      providerOptions.modelId = modelId;
      return {};
    };
  },
}));

const endpoint: CustomEndpoint = {
  id: "b618a762",
  name: "Local AI",
  baseURL: "http://127.0.0.1:1234/v1",
  modelId: "local-model",
  contextLimit: 400_000,
};

describe("buildCommitModelConfig", () => {
  beforeEach(() => {
    providerOptions.baseURL = "";
    providerOptions.apiKey = undefined;
    providerOptions.modelId = "";
  });

  it("resolves a compat model with its endpoint-specific API key", async () => {
    const config = buildCommitModelConfig(
      {
        lmstudioBaseURL: "http://127.0.0.1:1234/v1",
        lmstudioModelId: "",
        mlxBaseURL: "http://127.0.0.1:8080/v1",
        mlxModelId: "",
        ollamaBaseURL: "http://127.0.0.1:11434/api",
        ollamaModelId: "",
        openaiCompatibleBaseURL: "http://127.0.0.1:1234/v1",
        openaiCompatibleModelId: "",
        openrouterModelId: "",
        customEndpoints: [endpoint],
      },
      { [endpoint.id]: "secret" },
    );

    await buildConfiguredLanguageModel(
      compatModelIdForEndpoint(endpoint.id),
      EMPTY_PROVIDER_KEYS,
      config,
    );

    expect(providerOptions).toEqual({
      baseURL: endpoint.baseURL,
      apiKey: "secret",
      modelId: endpoint.modelId,
    });
  });
});
