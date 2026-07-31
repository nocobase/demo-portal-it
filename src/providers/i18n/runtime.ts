import { createInstance, type TOptions } from "i18next";

import {
  getTranslationResources,
  registerTranslationResources,
  setTranslationResolver,
  subscribeTranslationResources,
  type TranslationOptions,
} from "@/lib/i18n";
import { nocobaseClient } from "@/lib/nocobase/client";
import {
  DEFAULT_LOCALE,
  getLocaleDefinition,
  getLocaleDirection,
  getLocaleLabel,
  registerLocale,
  resolveSupportedLocale,
  setEnabledLocales,
} from "./locale-store";

export type LocaleResources = Record<
  string,
  Record<string, string | number | boolean>
>;

export type LocaleSystemSettings = {
  appLang?: string | null;
  enabledLanguages?: string[] | null;
};

type LocalePersistence = (locale: string) => void | Promise<void>;

let localePersistence: LocalePersistence | undefined;

export const i18n = createInstance();

void i18n.init({
  lng: resolveSupportedLocale(nocobaseClient.getLocale()),
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: "starter",
  fallbackNS: "starter",
  keySeparator: false,
  nsSeparator: false,
  initImmediate: false,
  interpolation: {
    escapeValue: false,
  },
});

function addLocaleResources(namespace: string, resources: LocaleResources) {
  for (const [locale, resource] of Object.entries(resources)) {
    i18n.addResourceBundle(locale, namespace, resource, true, true);
    registerLocale({
      locale,
      label: getLocaleLabel(locale),
      direction: getLocaleDirection(locale),
    });
  }
}

getTranslationResources().forEach(([namespace, resources]) =>
  addLocaleResources(namespace, resources)
);
subscribeTranslationResources(addLocaleResources);

export function getCurrentLocale() {
  return resolveSupportedLocale(i18n.resolvedLanguage ?? i18n.language);
}

export function registerLocaleResources(
  namespace: string,
  resources: LocaleResources
) {
  registerTranslationResources(namespace, resources);
}

export function translate(
  key: string,
  options?: TranslationOptions | string,
  defaultMessage?: string
) {
  const normalizedOptions = typeof options === "string" ? undefined : options;
  const normalizedDefault =
    typeof options === "string" ? options : defaultMessage;
  const value = i18n.t(key, {
    ...(normalizedOptions as TOptions),
    defaultValue: normalizedDefault ?? normalizedOptions?.defaultValue ?? key,
  });

  return typeof value === "string" ? value : String(value);
}

export function applyDocumentLocale(locale = getCurrentLocale()) {
  if (typeof document === "undefined") return;
  const direction =
    getLocaleDefinition(locale)?.direction ?? getLocaleDirection(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
}

function resolveSystemLocale(settings?: LocaleSystemSettings) {
  const enabledLanguages = Array.isArray(settings?.enabledLanguages)
    ? settings.enabledLanguages.filter(Boolean)
    : [];
  const storedLocale = nocobaseClient.getStoredLocale();

  if (
    storedLocale &&
    (!enabledLanguages.length || enabledLanguages.includes(storedLocale))
  ) {
    return resolveSupportedLocale(storedLocale);
  }

  const defaultLocale =
    settings?.appLang || enabledLanguages[0] || DEFAULT_LOCALE;
  return resolveSupportedLocale(defaultLocale);
}

export async function applySystemLocale(settings?: LocaleSystemSettings) {
  const enabledLanguages = Array.isArray(settings?.enabledLanguages)
    ? settings.enabledLanguages.filter(Boolean)
    : [];
  if (enabledLanguages.length) setEnabledLocales(enabledLanguages);

  const storedLocale = nocobaseClient.getStoredLocale();
  if (
    storedLocale &&
    enabledLanguages.length &&
    !enabledLanguages.includes(storedLocale)
  ) {
    nocobaseClient.setLocale(null);
  }

  const locale = resolveSystemLocale(settings);
  nocobaseClient.setRuntimeLocale(locale);
  await i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
  return locale;
}

export function setLocalePersistence(persistence?: LocalePersistence) {
  localePersistence = persistence;
  return () => {
    if (localePersistence === persistence) localePersistence = undefined;
  };
}

export async function changeLocale(locale: string) {
  const nextLocale = resolveSupportedLocale(locale);

  try {
    await localePersistence?.(nextLocale);
  } catch (error) {
    console.warn("Unable to persist the language preference", error);
  }

  nocobaseClient.setLocale(nextLocale);
  await i18n.changeLanguage(nextLocale);
  applyDocumentLocale(nextLocale);

  if (typeof window !== "undefined") window.location.reload();
}

setTranslationResolver(translate);
applyDocumentLocale();
