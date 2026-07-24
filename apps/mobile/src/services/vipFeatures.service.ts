import { remoteConfigService } from "./remoteConfig";

export interface VipFeature {
  icon: string;
  labelKey: string;
  translations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  order: number;
}

interface VipFeaturesResponse {
  features: VipFeature[];
  cached: boolean;
}

export async function fetchVipFeatures(): Promise<VipFeature[]> {
  const backendUrl = remoteConfigService.getConfig().backend_url ?? "https://api.watchr.me";
  const response = await fetch(`${backendUrl}/internal/vip-features`);
  if (!response.ok) {
    throw new Error(`Failed to fetch VIP features: ${response.status}`);
  }
  const data = (await response.json()) as VipFeaturesResponse;
  return data.features;
}
