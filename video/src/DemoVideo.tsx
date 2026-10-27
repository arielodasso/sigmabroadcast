import demo from "./generated/demo.json";
import { BroadcastVideo } from "./BroadcastVideo";
import type { VideoTimings } from "./types";

const timings = demo as unknown as VideoTimings;

export function DemoVideo() {
  return <BroadcastVideo timings={timings} />;
}
