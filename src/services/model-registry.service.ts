import { MODEL_CARDS, ModelCard, RoutingSignal, filterAvailableModels, rankModelsForSignals, ProviderName } from '../config/models.js';

export interface SelectionConstraints {
  disallowProviders?: ProviderName[];
  preferProvider?: ProviderName;
}

export class ModelRegistryService {
  private static instance: ModelRegistryService | null = null;
  static getInstance(): ModelRegistryService {
    if (!ModelRegistryService.instance) ModelRegistryService.instance = new ModelRegistryService();
    return ModelRegistryService.instance;
  }

  public listAllModels(): ModelCard[] {
    return [...MODEL_CARDS];
  }

  public listAvailableModels(): ModelCard[] {
    return filterAvailableModels(MODEL_CARDS);
  }

  public selectBestModel(signal: RoutingSignal, constraints: SelectionConstraints = {}): ModelCard | null {
    let candidates = this.listAvailableModels();
    if (constraints.disallowProviders?.length) {
      candidates = candidates.filter(c => !constraints.disallowProviders!.includes(c.provider));
    }
    if (constraints.preferProvider) {
      // Move preferred provider models up slightly
      candidates = candidates.map(c => ({ card: c, boost: c.provider === constraints.preferProvider ? 1 : 0 } as const))
        .sort((a, b) => b.boost - a.boost)
        .map(x => x.card);
    }
    const ranked = rankModelsForSignals(candidates, signal);
    return ranked[0] || null;
  }
}

export const modelRegistry = ModelRegistryService.getInstance();