import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Input } from "./Input";
import { ContentPicker } from "./ContentPicker";

interface DeepLinkParamDef {
  name: string;
  type: "string" | "number";
  required: boolean;
  description?: string;
}

interface DeepLinkScreenDef {
  screen: string;
  label: string;
  params: DeepLinkParamDef[];
}

type LinkMode = "none" | "deeplink" | "custom";

interface PageSelectorProps {
  value?: { screen: string; params: Record<string, unknown> } | { url: string };
  onChange: (value: { screen: string; params: Record<string, unknown> } | { url: string } | null) => void;
}

const CONTENT_PICKER_SCREENS = ["show", "episode", "comments"];

export function PageSelector({ value, onChange }: PageSelectorProps) {
  const [screens, setScreens] = useState<DeepLinkScreenDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<LinkMode>(() => {
    if (value && "url" in value) return "custom";
    if (value && "screen" in value && value.screen) return "deeplink";
    return "none";
  });
  const [selectedScreen, setSelectedScreen] = useState<string>(
    value && "screen" in value ? value.screen : "",
  );
  const [customUrl, setCustomUrl] = useState<string>(
    value && "url" in value ? value.url : "",
  );
  const [params, setParams] = useState<Record<string, string>>(() => {
    if (!value || !("params" in value) || !value.params) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(value.params)) {
      result[k] = String(v);
    }
    return result;
  });

  useEffect(() => {
    api
      .get("/admin/deep-link-catalog")
      .then((res: { data: { screens: DeepLinkScreenDef[] } }) => setScreens(res.data.screens))
      .catch(() => setScreens([]))
      .finally(() => setLoading(false));
  }, []);

  const currentDef = screens.find((s) => s.screen === selectedScreen);
  const useContentPicker = CONTENT_PICKER_SCREENS.includes(selectedScreen);

  function handleModeChange(newMode: LinkMode) {
    setMode(newMode);
    if (newMode === "none") {
      onChange(null);
    } else if (newMode === "custom") {
      setSelectedScreen("");
      setParams({});
      if (customUrl) {
        onChange({ url: customUrl });
      } else {
        onChange(null);
      }
    } else if (newMode === "deeplink") {
      setCustomUrl("");
      if (selectedScreen) {
        onChange({ screen: selectedScreen, params: {} });
      } else {
        onChange(null);
      }
    }
  }

  function handleScreenChange(screen: string) {
    setSelectedScreen(screen);
    const def = screens.find((s) => s.screen === screen);
    const newParams: Record<string, string> = {};
    if (def) {
      for (const p of def.params) {
        newParams[p.name] = "";
      }
    }
    setParams(newParams);
    if (screen) {
      onChange({ screen, params: {} });
    } else {
      onChange(null);
    }
  }

  function handleParamChange(name: string, val: string) {
    const newParams = { ...params, [name]: val };
    setParams(newParams);
    const def = screens.find((s) => s.screen === selectedScreen);
    const typedParams: Record<string, unknown> = {};
    if (def) {
      for (const p of def.params) {
        const raw = newParams[p.name];
        if (raw === "" || raw === undefined) continue;
        typedParams[p.name] = p.type === "number" ? Number(raw) : raw;
      }
    }
    onChange({ screen: selectedScreen, params: typedParams });
  }

  function handleContentPickerSelect(pickerParams: Record<string, unknown>) {
    const def = screens.find((s) => s.screen === selectedScreen);
    const typedParams: Record<string, unknown> = {};
    if (def) {
      for (const p of def.params) {
        const raw = pickerParams[p.name];
        if (raw === undefined || raw === null) continue;
        typedParams[p.name] = raw;
      }
    }
    const stringParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(pickerParams)) {
      stringParams[k] = String(v);
    }
    setParams(stringParams);
    onChange({ screen: selectedScreen, params: typedParams });
  }

  function handleCustomUrlChange(val: string) {
    setCustomUrl(val);
    if (val) {
      onChange({ url: val });
    } else {
      onChange(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-text-muted">Loading pages...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-md border border-border p-0.5 bg-background">
        <button
          type="button"
          onClick={() => handleModeChange("none")}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === "none" ? "bg-primary text-white" : "text-text-muted hover:text-text"
          }`}
        >
          None
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("deeplink")}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === "deeplink" ? "bg-primary text-white" : "text-text-muted hover:text-text"
          }`}
        >
          Deep Link
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("custom")}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === "custom" ? "bg-primary text-white" : "text-text-muted hover:text-text"
          }`}
        >
          Custom URL
        </button>
      </div>

      {mode === "custom" && (
        <div>
          <label className="text-xs text-text-muted mb-1 block">Custom URL</label>
          <Input
            type="url"
            value={customUrl}
            onChange={(e) => handleCustomUrlChange(e.target.value)}
            placeholder="https://example.com/page"
            className="h-8 text-sm"
          />
        </div>
      )}

      {mode === "deeplink" && (
        <>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Deep Link Page</label>
            <select
              value={selectedScreen || "__none"}
              onChange={(e) => handleScreenChange(e.target.value === "__none" ? "" : e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
            >
              <option value="__none">No deep link</option>
              {screens.map((s) => (
                <option key={s.screen} value={s.screen}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {currentDef && currentDef.params.length > 0 && (
            <div className="space-y-2 pl-2 border-l-2 border-border ml-1">
              {useContentPicker ? (
                <ContentPicker
                  screenType={selectedScreen as "show" | "episode" | "comments"}
                  onSelect={handleContentPickerSelect}
                />
              ) : (
                currentDef.params.map((p) => (
                  <div key={p.name}>
                    <label className="text-xs text-text-muted mb-1 block">
                      {p.name}
                      {p.required && <span className="text-danger ml-1">*</span>}
                      {p.description && (
                        <span className="text-text-muted/60 ml-1">— {p.description}</span>
                      )}
                    </label>
                    <Input
                      type={p.type === "number" ? "number" : "text"}
                      value={params[p.name] ?? ""}
                      onChange={(e) => handleParamChange(p.name, e.target.value)}
                      placeholder={`Enter ${p.name}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
