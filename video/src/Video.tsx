import React from "react";
import { Composition } from "remotion";
import demo from "./generated/demo.json";
import pitch from "./generated/pitch.json";
import { DemoVideo } from "./DemoVideo";
import { PitchVideo } from "./PitchVideo";

export const Video: React.FC = () => {
  return (
    <>
      <Composition
        id="DEMO"
        component={DemoVideo}
        durationInFrames={demo.durationInFrames}
        fps={demo.fps}
        width={demo.width}
        height={demo.height}
      />
      <Composition
        id="PITCH"
        component={PitchVideo}
        durationInFrames={pitch.durationInFrames}
        fps={pitch.fps}
        width={pitch.width}
        height={pitch.height}
      />
    </>
  );
};
