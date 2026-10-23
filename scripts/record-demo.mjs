import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const port = Number(process.env.DEMO_PORT ?? 4174);
const baseUrl = process.env.DEMO_URL ?? `http://localhost:${port}`;
const headless = process.env.DEMO_HEADED !== "1";
const outputDir = "demo";
const rawDir = `${outputDir}/raw`;

mkdirSync(rawDir, { recursive: true });

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
      await delay(500);
      continue;
    }
    await delay(500);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  if (!process.env.DEMO_URL) {
    server = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev", "--", "--port", String(port), "--strictPort"],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    await waitForServer(baseUrl);
  }

  browser = await chromium.launch({
    headless,
    args: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: rawDir,
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#broadcast-stage");
  await page.waitForTimeout(1_500);

  await page.getByRole("button", { name: /play match/i }).click();
  await page.waitForTimeout(2_500);

  await page.locator(".topnav__tab").nth(1).click();
  await page.waitForSelector("#control-panel");
  await page.waitForTimeout(1_000);

  const modes = page.locator(".ai-modes button");
  if ((await modes.count()) > 1) await modes.nth(1).click();

  const teamSelect = page.locator(".ai-follow select").first();
  if ((await teamSelect.locator("option").count()) > 1) {
    await teamSelect.selectOption({ index: 1 });
  }

  await page.locator(".ai-modes").scrollIntoViewIfNeeded();
  await page.waitForTimeout(4_000);

  await page.locator(".topnav__tab").nth(0).click();
  await page.waitForTimeout(800);

  let currentSpeed = 1;
  const setSpeed = async (value) => {
    if (currentSpeed === value) return;
    await page
      .getByRole("button", { name: `${value}\u00d7`, exact: true })
      .click();
    currentSpeed = value;
  };

  const startedAt = Date.now();
  let lastLog = 0;
  let finished = false;
  while (Date.now() - startedAt < 100_000) {
    const period = (
      await page
        .locator(".scorebug__period")
        .textContent()
        .catch(() => "")
    )?.trim();
    if (period === "FT") {
      finished = true;
      break;
    }
    if (Date.now() - lastLog > 10_000) {
      lastLog = Date.now();
      const clock = await page
        .locator(".scorebug__clock")
        .textContent()
        .catch(() => "");
      console.log(`recording: ${period} ${clock?.trim() ?? ""}`);
    }
    const hasOverlay = (await page.locator(".overlay").count()) > 0;
    await setSpeed(hasOverlay ? 16 : 128);
    await page.waitForTimeout(25);
  }
  await setSpeed(1);

  if (finished) {
    await page
      .locator("#match-recap")
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await page.waitForTimeout(3_500);
  } else {
    console.warn("Match did not reach full time before the demo limit.");
    await page.waitForTimeout(1_000);
  }

  const video = page.video();
  await context.close();
  await browser.close();
  stopServer();

  const webmPath = video ? await video.path() : null;
  if (!webmPath || !existsSync(webmPath)) {
    throw new Error("Playwright did not produce a video file");
  }

  const mp4Path = `${outputDir}/sigma-broadcast-demo.mp4`;
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-movflags",
      "+faststart",
      mp4Path,
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    console.error("ffmpeg failed; the WebM recording is still available:");
    console.error(webmPath);
    process.exitCode = 1;
    return;
  }

  console.log(`Demo video written to ${mp4Path}`);
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
