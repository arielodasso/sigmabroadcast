import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(".");
const serveUrl = await bundle({
  entryPoint: path.join(root, "video/src/index.ts"),
  publicDir: path.join(root, "video/public"),
});
const jobs = [
  { id: "PITCH", frames: [1350, 2100, 2420] },
  { id: "DEMO", frames: [1950, 2440] },
];
for (const job of jobs) {
  const composition = await selectComposition({ serveUrl, id: job.id });
  for (const frame of job.frames) {
    await renderStill({
      composition,
      serveUrl,
      frame,
      output: path.join(
        root,
        `video/out/stills/${job.id.toLowerCase()}-${frame}.png`,
      ),
      imageFormat: "png",
      logLevel: "error",
    });
    console.log("rendered", job.id, frame);
  }
}
