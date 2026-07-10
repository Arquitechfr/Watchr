import { useEffect, useState } from "react";
import { remoteConfigService } from "../services/remoteConfig";
import { RemoteConfig, RemoteConfigDescriptions } from "../config/defaults";

export function useRemoteConfig(): RemoteConfig {
  const [config, setConfig] = useState<RemoteConfig>(remoteConfigService.getConfig());

  useEffect(() => remoteConfigService.subscribe(setConfig), []);

  return config;
}

export function useRemoteConfigDescriptions(): RemoteConfigDescriptions {
  const [descriptions, setDescriptions] = useState<RemoteConfigDescriptions>(remoteConfigService.getDescriptions());

  useEffect(() => remoteConfigService.subscribeDescriptions(setDescriptions), []);

  return descriptions;
}
