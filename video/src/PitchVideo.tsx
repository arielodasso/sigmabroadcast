import pitch from "./generated/pitch.json";
import { BroadcastVideo } from "./BroadcastVideo";
import type { VideoTimings } from "./types";

const timings = pitch as unknown as VideoTimings;

export function PitchVideo() {
  return <BroadcastVideo timings={timings} />;
}
