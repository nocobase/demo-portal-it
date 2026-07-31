import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { nocobaseClient } from "@/lib/nocobase/client";
import { applySystemLocale } from "../i18n";
import {
  SystemSettingsContext,
  type SystemSettings,
  type SystemSettingsContextValue,
} from "./context";

let cachedSettings: SystemSettings | undefined;
let settingsRequest: Promise<SystemSettings> | undefined;

function requestSystemSettings(force = false) {
  if (!force && cachedSettings) return Promise.resolve(cachedSettings);
  if (!force && settingsRequest) return settingsRequest;

  const request = nocobaseClient
    .action<SystemSettings>("systemSettings", "get", {
      method: "GET",
      includeRole: false,
      withAclMeta: false,
    })
    .then((settings) => {
      cachedSettings = settings;
      return settings;
    });

  settingsRequest = request;
  const clearRequest = () => {
    if (settingsRequest === request) settingsRequest = undefined;
  };
  void request.then(clearRequest, clearRequest);
  return request;
}

export function SystemSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(cachedSettings);
  const [error, setError] = useState<Error>();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const nextSettings = await requestSystemSettings(force);
      await applySystemLocale(nextSettings);
      setSettings(nextSettings);
      setError(undefined);
      return nextSettings;
    } catch (reason) {
      const nextError =
        reason instanceof Error
          ? reason
          : new Error("Unable to load system settings");
      console.warn("Unable to load NocoBase system settings", reason);
      setError(nextError);
      await applySystemLocale();
      return undefined;
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<SystemSettingsContextValue>(
    () => ({
      settings,
      error,
      loading,
      refresh: () => load(true),
    }),
    [error, load, loading, settings]
  );

  if (!ready) return <LoadingState className="min-h-svh" />;

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
}
