import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/app/App";

function render(locale: "en" | "es"): string {
  const previous = globalThis.navigator?.language;
  Object.defineProperty(globalThis, "navigator", {
    value: { language: locale },
    configurable: true,
  });
  try {
    return renderToString(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      value: { language: previous },
      configurable: true,
    });
  }
}

describe("application shell", () => {
  it("renders the broadcast view without crashing", () => {
    const html = render("en");
    expect(html).toContain("Sigma Broadcast");
    expect(html).toContain("INTELLIGENTLY BROADCAST");
    expect(html).toContain("Match recap");
  });

  it("renders the localized shell in spanish", () => {
    const html = render("es");
    expect(html).toContain("TRANSMISIÓN INTELIGENTE");
    expect(html).toContain("Resumen del partido");
  });

  it("keeps the interface free of emoji glyphs", () => {
    const html = render("en");
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emoji.test(html)).toBe(false);
  });
});
