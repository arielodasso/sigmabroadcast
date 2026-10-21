import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/app/App";

function render(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("transparent broadcast output", () => {
  it("renders the bare graphics source on the output route", () => {
    const html = render("/output");
    expect(html).toContain('data-output="transparent"');
  });

  it("keeps the editorial chrome out of the output route", () => {
    const html = render("/output");
    expect(html).not.toContain("INTELLIGENTLY BROADCAST");
    expect(html).not.toContain("app__main");
  });

  it("keeps the editorial chrome on the main route", () => {
    const html = render("/");
    expect(html).toContain("INTELLIGENTLY BROADCAST");
    expect(html).not.toContain('data-output="transparent"');
  });
});
