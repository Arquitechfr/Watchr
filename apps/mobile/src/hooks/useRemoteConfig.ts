import { useEffect, useState } from "react";
import { remoteConfigService } from "../services/remoteConfig";
import { RemoteConfig } from "../config/defaults";

export function useRemoteConfig(): RemoteConfig {
  const [config, setConfig] = useState<RemoteConfig>(remoteConfigService.getConfig());

  useEffect(() => remoteConfigService.subscribe(setConfig), []);

  return config;
}
