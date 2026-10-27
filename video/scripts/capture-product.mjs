import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const captureRoot = join(repoRoot, "video", "public", "captures");
const realRoot = join(captureRoot, "real");
const port = Number(process.env.DEMO_PORT ?? 4176);
const baseUrl = process.env.DEMO_URL ?? `http://localhost:${port}`;
const headed = process.env.DEMO_HEADED === "1";

const LABELS = {
  es: {
    languageButton: "Español",
    play: "Reproducir",
    pause: "Pausar",
    corrections: "Correcciones",
    goal: /^Gol(?!\s+anulado)/i,
    disallowed: /anulado/i,
  },
  en: {
    languageButton: "English",
    play: "Play",
    pause: "Pause",
    corrections: "Corrections",
    goal: /^Goal(?!\s+disallowed)/i,
    disallowed: /disallowed/i,
  },
};

let server = null;
let browser = null;

function stopServer() {
  if (!server) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.kill("SIGTERM");
  }
  server = null;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(400);
      continue;
    }
    await delay(400);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function waitFor(timeoutMs, check, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) return true;
    await delay(60);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function screenshot(page, name, locator = null) {
  const path = join(captureRoot, name);
  mkdirSync(dirname(path), { recursive: true });
  if (locator) {
    await locator.screenshot({ path, animations: "disabled" });
  } else {
    await page.screenshot({ path, animations: "disabled" });
  }
  console.log(`  capture ${name}`);
}

async function setLocale(page, locale) {
  const htmlLang = await page.locator("html").getAttribute("lang");
  if (htmlLang === locale) return;
  await page.getByRole("button", { name: LABELS[locale].languageButton, exact: true }).click();
  await waitFor(5_000, async () => (await page.locator("html").getAttribute("lang")) === locale, `locale ${locale}`);
}

async function ensurePlaying(page, labels) {
  const button = page.locator(".transport .btn--primary");
  const label = await button.getAttribute("aria-label");
  if (label === labels.play) {
    await button.click();
    await page.waitForTimeout(200);
  }
}

async function ensurePaused(page, labels) {
  const button = page.locator(".transport .btn--primary");
  const label = await button.getAttribute("aria-label");
  if (label === labels.pause) {
    await button.click();
    await page.waitForTimeout(200);
  }
}

async function correctionCount(page, locale) {
  return page.locator(".strip__cell").evaluateAll((cells, label) => {
    const cell = cells.find((candidate) => candidate.textContent?.includes(label));
    const value = cell?.querySelector(".strip__cell-value")?.textContent ?? "0";
    return Number(value.trim()) || 0;
  }, LABELS[locale].corrections);
}

async function overlayTexts(page) {
  return page.locator(".overlay__headline").allInnerTexts();
}

async function captureLocale(locale) {
  const labels = LABELS[locale];
  const dir = locale;
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    locale: locale === "es" ? "es-ES" : "en-US",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#broadcast-stage");
  await setLocale(page, locale);
  await page.waitForTimeout(900);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await screenshot(page, `${dir}/hero.png`);

  await page.locator("#broadcast-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await screenshot(page, `${dir}/stage.png`, page.locator("#broadcast-stage"));

  await page.locator(".topnav__tab").nth(1).click();
  await page.waitForSelector("#control-panel");
  await page.waitForTimeout(450);

  const teamSelect = page.locator(".ai-follow select").first();
  await teamSelect.selectOption("team-northbridge");
  await page.waitForTimeout(200);
  const playerSelect = page.locator(".ai-follow select").nth(1);
  const playerOptions = await playerSelect.locator("option").count();
  if (playerOptions > 1) {
    await playerSelect.selectOption({ index: 1 });
  }
  await page.waitForTimeout(300);
  await page.locator(".panel__header").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await screenshot(page, `${dir}/panel-empty-top.png`);

  await page.locator(".topnav__tab").nth(0).click();
  await page.waitForSelector("#broadcast-stage");
  await page.waitForTimeout(250);
  await page.locator(".stage__play").click();
  await page.waitForTimeout(1_600);
  await page.evaluate(() => document.getElementById("broadcast-stage")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250);
  await screenshot(page, `${dir}/stage-playing.png`, page.locator("#broadcast-stage"));

  await page.getByRole("button", { name: "16×", exact: true }).click();
  await waitFor(
    45_000,
    async () => (await overlayTexts(page)).some((text) => labels.goal.test(text.trim())),
    `${locale} goal overlay`,
  );
  await ensurePaused(page, labels);
  await page.waitForTimeout(350);

  await page.evaluate(() => document.getElementById("broadcast-stage")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250);
  await screenshot(page, `${dir}/stage-goal.png`, page.locator("#broadcast-stage"));
  await screenshot(page, `${dir}/broadcast-goal.png`);
  const goalOverlay = page.locator(".overlay").first();
  if (await goalOverlay.count()) {
    await screenshot(page, `${dir}/overlay-goal.png`, goalOverlay);
    console.log(
      `  followed overlay: ${await goalOverlay.getAttribute("data-followed")} · ${await goalOverlay.getAttribute("data-overlay-id")}`,
    );
  }

  const output = await context.newPage();
  await output.goto(
    `${baseUrl}/output?locale=${locale}&audience=fan&team=team-northbridge`,
    { waitUntil: "networkidle" },
  );
  await output.waitForSelector(".output");
  await output.waitForTimeout(1_000);
  await screenshot(output, `${dir}/output.png`);
  console.log(`  output overlays: ${await output.locator(".overlay").count()}`);
  await output.close();
  await page.bringToFront();

  await page.getByRole("button", { name: "10s", exact: true }).click();
  await page.waitForTimeout(250);
  await screenshot(page, `${dir}/controls-delay.png`, page.locator(".transport"));

  await ensurePlaying(page, labels);
  await page.getByRole("button", { name: "16×", exact: true }).click();
  await waitFor(
    45_000,
    async () => (await correctionCount(page, locale)) > 0,
    `${locale} correction`,
  );
  await page.getByRole("button", { name: "8×", exact: true }).click();
  const disallowed = await waitFor(
    8_000,
    async () => (await overlayTexts(page)).some((text) => labels.disallowed.test(text)),
    `${locale} disallowed overlay`,
  ).catch(() => false);
  await ensurePaused(page, labels);
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById("broadcast-stage")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250);
  await screenshot(page, `${dir}/stage-correction.png`, page.locator("#broadcast-stage"));
  await screenshot(page, `${dir}/broadcast-correction.png`);
  if (disallowed) {
    await screenshot(page, `${dir}/overlay-disallowed.png`, page.locator(".overlay").first());
  }

  await page.locator(".topnav__tab").nth(1).click();
  await page.waitForSelector("#control-panel");
  await page.waitForTimeout(400);
  await page.locator(".panel__header").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await screenshot(page, `${dir}/panel-top.png`);
  await screenshot(page, `${dir}/panel-header.png`, page.locator(".panel__header"));
  await screenshot(page, `${dir}/panel-grid.png`, page.locator(".panel__grid"));
  await screenshot(page, `${dir}/panel-ai.png`, page.locator(".panel__module--ai"));
  await screenshot(page, `${dir}/panel-columns.png`, page.locator(".panel__columns"));
  const correctionModule = page.locator(".panel__module").filter({ hasText: labels.corrections }).first();
  if (await correctionModule.count()) {
    await screenshot(page, `${dir}/panel-corrections.png`, correctionModule);
  } else {
    console.warn(`  no ${labels.corrections} module found`);
  }

  await page.locator(".topnav__tab").nth(0).click();
  await page.waitForSelector("#broadcast-stage");
  await page.waitForTimeout(250);
  await page.bringToFront();
  await page.getByRole("button", { name: "128×", exact: true }).click();
  const currentStatus = await page.locator(".scorebug__period").innerText();
  if (currentStatus.trim() !== "FT") {
    await ensurePlaying(page, labels);
  }
  await waitFor(
    180_000,
    async () => (await page.locator(".scorebug__period").innerText()).trim() === "FT",
    `${locale} full time`,
  );
  await page.waitForTimeout(800);
  await page.locator("#match-recap").scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await screenshot(page, `${dir}/recap-viewport.png`);
  await screenshot(page, `${dir}/recap.png`, page.locator("#match-recap"));

  await page.locator(".topnav__tab").nth(1).click();
  await page.waitForSelector("#control-panel");
  await page.waitForTimeout(400);
  await page.locator(".panel__header").scrollIntoViewIfNeeded();
  await screenshot(page, `${dir}/panel-final-top.png`);

  await context.close();
}

async function captureClip(locale) {
  const labels = LABELS[locale];
  const rawDir = join(realRoot, "raw");
  mkdirSync(rawDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: locale === "es" ? "es-ES" : "en-US",
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#broadcast-stage");
  await setLocale(page, locale);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("broadcast-stage")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  const box = await page.locator("#broadcast-stage").boundingBox();
  if (!box) throw new Error("Could not measure the broadcast stage");
  await page.locator(".stage__play").click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await page.waitForTimeout(14_000);
  const video = page.video();
  await context.close();
  const raw = video ? await video.path() : null;
  if (!raw || !existsSync(raw)) throw new Error("Playwright did not produce a clip");

  const cropW = Math.floor(box.width / 2) * 2;
  const cropH = Math.floor(box.height / 2) * 2;
  const cropX = Math.floor(box.x / 2) * 2;
  const cropY = Math.floor(box.y / 2) * 2;
  const output = join(realRoot, `stage-live-${locale}.mp4`);
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", raw],
    { encoding: "utf8" },
  );
  const rawDuration = Number(probe.stdout.trim()) || 16;
  const trimStart = Math.min(4, Math.max(0, rawDuration - 10));
  const trimLength = Math.min(12, Math.max(6, rawDuration - trimStart - 1));
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(trimStart),
      "-t",
      String(trimLength),
      "-i",
      raw,
      "-vf",
      `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=1920:1080:flags=lanczos,fps=30`,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      output,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${output}: ${result.stderr}`);
  }
  console.log(`  capture ${locale === "es" ? "real" : "real"}/stage-live-${locale}.mp4 (${trimLength}s)`);
  writeFileSync(
    join(realRoot, `stage-live-${locale}.json`),
    `${JSON.stringify({ raw: raw.replaceAll("\\", "/"), box, trimStart, trimLength, output }, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  mkdirSync(captureRoot, { recursive: true });
  mkdirSync(realRoot, { recursive: true });

  if (!process.env.DEMO_URL) {
    server = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev", "--", "--port", String(port), "--strictPort"],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    await waitForServer(baseUrl);
  }

  browser = await chromium.launch({
    headless: !headed,
    args: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });

  const locales = (process.env.DEMO_LOCALES ?? "es,en")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value === "es" || value === "en");
  if (locales.length === 0) throw new Error("DEMO_LOCALES must include es and/or en");

  for (const locale of locales) {
    console.log(`Capturing product UI (${locale})`);
    await captureLocale(locale);
    console.log(`Capturing real match clip (${locale})`);
    await captureClip(locale);
  }

  await browser.close();
  browser = null;
  stopServer();
  console.log("Product captures are ready.");
}

main()
  .catch(async (error) => {
    if (browser) await browser.close().catch(() => {});
    stopServer();
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    stopServer();
  });
