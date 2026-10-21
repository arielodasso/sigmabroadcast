import { DEFAULT_LOCALE, type Locale } from "./locale";
import { en } from "./catalog/en";
import { es } from "./catalog/es";

export type TranslationCatalog = Record<string, string>;
export type TranslationVars = Record<string, string | number>;

const CATALOGS: Record<Locale, TranslationCatalog> = { en, es };

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(
  template: string,
  vars?: TranslationVars,
): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Resolve a catalog key for a locale. Missing keys fall back to the default
 * locale and, as a last resort, to the key itself so the interface never
 * renders an empty string.
 */
export function t(
  locale: Locale,
  key: string,
  vars?: TranslationVars,
): string {
  const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
  const template = catalog[key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
  return interpolate(template, vars);
}

export function hasKey(locale: Locale, key: string): boolean {
  return (CATALOGS[locale] ?? {})[key] !== undefined;
}
