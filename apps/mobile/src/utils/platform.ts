import Constants from "expo-constants";

export function isStandaloneBuild(): boolean {
  return Constants.executionEnvironment === "standalone";
}
