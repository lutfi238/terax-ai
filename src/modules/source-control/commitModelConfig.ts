import type { LocalProviderConfig } from "@/modules/ai/lib/agent";
import type { CustomEndpointKeys } from "@/modules/ai/lib/keyring";
import type { Preferences } from "@/modules/settings/store";

type CommitModelPreferences = Pick<
  Preferences,
  | "lmstudioBaseURL"
  | "lmstudioModelId"
  | "mlxBaseURL"
  | "mlxModelId"
  | "ollamaBaseURL"
  | "ollamaModelId"
  | "openaiCompatibleBaseURL"
  | "openaiCompatibleModelId"
  | "openrouterModelId"
  | "customEndpoints"
>;

export function buildCommitModelConfig(
  preferences: CommitModelPreferences,
  customEndpointKeys: CustomEndpointKeys,
): LocalProviderConfig {
  return {
    lmstudioBaseURL: preferences.lmstudioBaseURL,
    lmstudioModelId: preferences.lmstudioModelId,
    mlxBaseURL: preferences.mlxBaseURL,
    mlxModelId: preferences.mlxModelId,
    ollamaBaseURL: preferences.ollamaBaseURL,
    ollamaModelId: preferences.ollamaModelId,
    openaiCompatibleBaseURL: preferences.openaiCompatibleBaseURL,
    openaiCompatibleModelId: preferences.openaiCompatibleModelId,
    openrouterModelId: preferences.openrouterModelId,
    customEndpoints: preferences.customEndpoints,
    customEndpointKeys,
  };
}
