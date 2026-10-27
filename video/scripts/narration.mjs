import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const videoRoot = join(repoRoot, "video");
const publicRoot = join(videoRoot, "public");
const audioRoot = join(publicRoot, "audio");
const generatedRoot = join(videoRoot, "src", "generated");
const tempRoot = join(repoRoot, "video", ".tmp-tts");
const force = process.argv.includes("--force");

const VIDEOS = [
  {
    key: "demo",
    dir: join(videoRoot, "DEMO"),
    scriptPath: join(videoRoot, "DEMO", "script.json"),
  },
  {
    key: "pitch",
    dir: join(videoRoot, "PITCH"),
    scriptPath: join(videoRoot, "PITCH", "script.json"),
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function fontsReady() {
  return process.platform === "win32";
}

function ffprobeDurationMs(path) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      path,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${path}: ${result.stderr}`);
  }
  const seconds = Number(result.stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`ffprobe returned an invalid duration for ${path}`);
  }
  return Math.round(seconds * 1000);
}

function synthesize({ text, outPath, voice, rate }) {
  mkdirSync(tempRoot, { recursive: true });
  const textPath = join(tempRoot, `${hash(text)}.txt`);
  writeFileSync(textPath, text, "utf8");
  const scriptPath = join(tempRoot, "sapi.ps1");
  const script = [
    "param([string]$TextPath,[string]$OutPath,[string]$Voice,[int]$Rate)",
    "Add-Type -AssemblyName System.Speech",
    "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "try { $synth.SelectVoice($Voice) } catch { throw \"Voice not installed: $Voice\" }",
    "$synth.Rate = $Rate",
    "$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)",
    "$synth.SetOutputToWaveFile($OutPath, $format)",
    "$text = [System.IO.File]::ReadAllText($TextPath, [System.Text.Encoding]::UTF8)",
    "$synth.Speak($text)",
    "$synth.Dispose()",
  ].join("\n");
  writeFileSync(scriptPath, script, "utf8");

  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      textPath,
      outPath,
      voice,
      String(rate),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `Speech synthesis failed for "${text.slice(0, 60)}...": ${result.stderr || result.stdout}`,
    );
  }
}

function formatSrtTime(ms) {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function writeSrt(path, cues) {
  const body = cues
    .map((cue, index) => {
      const lines = [
        String(index + 1),
        `${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}`,
        ...cue.lines,
      ];
      return lines.join("\r\n");
    })
    .join("\r\n\r\n");
  writeFileSync(path, `${body}\r\n`, "utf8");
}

function buildVideo(video, manifest) {
  const script = readJson(video.scriptPath);
  const spoken = script.spokenLocale;
  const other = spoken === "es" ? "en" : "es";
  const suffix = video.key;
  const audioDir = join(audioRoot, suffix);
  mkdirSync(audioDir, { recursive: true });
  mkdirSync(join(video.dir, "subtitles"), { recursive: true });

  const scriptHash = hash(
    JSON.stringify({
      voice: script.voice,
      rate: script.rate,
      spokenLocale: spoken,
      narration: script.scenes.map((scene) => scene.narration[spoken]),
    }),
  );

  const cached =
    !force &&
    manifest?.[suffix]?.hash === scriptHash &&
    manifest[suffix].files.every((file) => existsSync(join(publicRoot, file)));
  const files = [];

  if (!cached) {
    console.log(`[${script.id}] synthesizing ${script.scenes.length} scenes with ${script.voice}`);
    for (const [sceneIndex, scene] of script.scenes.entries()) {
      const sentences = scene.narration[spoken];
      for (const [sentenceIndex, text] of sentences.entries()) {
        const relative = `audio/${suffix}/${scene.id}-${sentenceIndex + 1}.wav`;
        const absolute = join(publicRoot, relative);
        console.log(
          `  ${sceneIndex + 1}/${script.scenes.length} ${scene.id} sentence ${sentenceIndex + 1}/${sentences.length}`,
        );
        synthesize({
          text,
          outPath: absolute,
          voice: script.voice,
          rate: script.rate,
        });
        files.push(relative);
      }
    }
  } else {
    console.log(`[${script.id}] reusing cached narration (${manifest[suffix].files.length} files)`);
    files.push(...manifest[suffix].files);
  }

  const allFiles = [];
  for (const scene of script.scenes) {
    for (let index = 0; index < scene.narration[spoken].length; index += 1) {
      allFiles.push(`audio/${suffix}/${scene.id}-${index + 1}.wav`);
    }
  }

  const cuesByLocale = { en: [], es: [] };
  const scenes = [];
  let sceneStartMs = script.leadInMs;

  for (const scene of script.scenes) {
    const sentences = scene.narration[spoken];
    const translations = scene.narration[other];
    if (translations.length !== sentences.length) {
      throw new Error(
        `${scene.id}: ${spoken} has ${sentences.length} cues but ${other} has ${translations.length}`,
      );
    }

    const sentenceTimings = [];
    let cursor = sceneStartMs + script.audioLeadMs;
    for (const [index, text] of sentences.entries()) {
      const file = `audio/${suffix}/${scene.id}-${index + 1}.wav`;
      const durationMs = ffprobeDurationMs(join(publicRoot, file));
      sentenceTimings.push({
        file,
        startMs: cursor,
        endMs: cursor + durationMs,
        durationMs,
        text: { [spoken]: text, [other]: translations[index] },
      });
      cuesByLocale[spoken].push({
        startMs: cursor,
        endMs: cursor + durationMs + 60,
        lines: [text],
      });
      cuesByLocale[other].push({
        startMs: cursor,
        endMs: cursor + durationMs + 60,
        lines: [translations[index]],
      });
      cursor += durationMs + script.sentenceGapMs;
    }

    const audioEndMs =
      sentenceTimings.length === 0
        ? sceneStartMs
        : sentenceTimings[sentenceTimings.length - 1].endMs;
    const sceneEndMs = audioEndMs + script.scenePaddingMs;
    scenes.push({
      id: scene.id,
      startMs: sceneStartMs,
      endMs: sceneEndMs,
      visual: scene.visual,
      badgeKind: scene.badgeKind,
      badge: scene.badge,
      title: scene.title,
      source: scene.source,
      sentences: sentenceTimings,
    });
    sceneStartMs = sceneEndMs;
  }

  const durationMs = sceneStartMs + script.tailMs;
  const durationInFrames = Math.ceil((durationMs / 1000) * script.fps);

  const timings = {
    id: script.id,
    fps: script.fps,
    width: script.width,
    height: script.height,
    spokenLocale: spoken,
    durationMs,
    durationInFrames,
    leadInMs: script.leadInMs,
    tailMs: script.tailMs,
    scenes,
  };
  writeFileSync(
    join(generatedRoot, `${suffix}.json`),
    `${JSON.stringify(timings, null, 2)}\n`,
    "utf8",
  );
  writeSrt(join(video.dir, "subtitles", "en.srt"), cuesByLocale.en);
  writeSrt(join(video.dir, "subtitles", "es.srt"), cuesByLocale.es);

  const totalAudioMs = scenes.reduce(
    (sum, scene) =>
      sum +
      scene.sentences.reduce((inner, sentence) => inner + sentence.durationMs, 0),
    0,
  );
  console.log(
    `[${script.id}] duration ${(durationMs / 1000).toFixed(1)}s · narration ${(totalAudioMs / 1000).toFixed(1)}s · ${scenes.length} scenes · ${durationInFrames} frames`,
  );

  return {
    file: `src/generated/${suffix}.json`,
    hash: scriptHash,
    files: allFiles,
  };
}

function main() {
  if (!fontsReady()) {
    throw new Error(
      "Narration generation uses Windows System.Speech. Run it on Windows or supply your own WAV files in video/public/audio.",
    );
  }
  mkdirSync(generatedRoot, { recursive: true });
  mkdirSync(audioRoot, { recursive: true });

  const manifestPath = join(audioRoot, "manifest.json");
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
  const nextManifest = { ...manifest };

  for (const video of VIDEOS) {
    nextManifest[video.key] = buildVideo(video, manifest);
  }

  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
  console.log("Narration, timings and subtitles are ready.");
}

main();
