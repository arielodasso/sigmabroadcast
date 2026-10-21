import { describe, expect, it } from "vitest";
import { en } from "../../src/i18n/catalog/en";
import { es } from "../../src/i18n/catalog/es";
import {
  DEFAULT_LOCALE,
  isLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "../../src/i18n/locale";
import { hasKey, interpolate, t } from "../../src/i18n/translate";

describe("i18n module", () => {
  it("defaults to english and exposes both locales", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("es");
  });

  it("recognises supported locales only", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(resolveLocale("es")).toBe("es");
    expect(resolveLocale("fr")).toBe("en");
    expect(resolveLocale(undefined, "es")).toBe("es");
  });

  it("interpolates named placeholders", () => {
    expect(interpolate("{homeTeam} {homeScore}–{awayScore} {awayTeam}", {
      homeTeam: "North",
      homeScore: 2,
      awayScore: 1,
      awayTeam: "South",
    })).toBe("North 2–1 South");
  });

  it("keeps unresolved placeholders visible instead of blanking them", () => {
    expect(interpolate("Value {missing}", { other: 1 })).toBe("Value {missing}");
  });

  it("falls back to english and then to the key itself", () => {
    expect(t("es", "nav.broadcast")).toBe("Transmisión");
    expect(t("es", "totally.unknown.key")).toBe("totally.unknown.key");
  });

  it("translates insight templates with their variables", () => {
    const enText = t("en", "insight.goal.analyst", {
      team: "North",
      eventId: "match-demo-0001-e12",
    });
    const esText = t("es", "insight.goal.analyst", {
      team: "North",
      eventId: "match-demo-0001-e12",
    });

    expect(enText).toBe("Goal for North (event match-demo-0001-e12).");
    expect(esText).toBe("Gol de North (evento match-demo-0001-e12).");
    expect(enText).not.toBe(esText);
  });

  it("mirrors every english key in the spanish catalog", () => {
    const missing = Object.keys(en).filter((key) => !hasKey("es", key));
    expect(missing).toEqual([]);
  });

  it("keeps both catalogs free of empty strings", () => {
    for (const [locale, catalog] of [
      ["en", en],
      ["es", es],
    ] as const) {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });
});
