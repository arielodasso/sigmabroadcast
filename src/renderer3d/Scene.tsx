import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MatchEngine } from "../simulation/engine";
import { TEAMS } from "../simulation/roster";
import { createPitch } from "./pitch";
import { addPlayerMesh, createPlayers, updatePlayers, type PlayerVisuals } from "./players";
import { createBall, updateBall } from "./ball";
import { applyCameraMode, trackBall, type CameraMode } from "./cameras";

export interface SceneProps {
  engine: MatchEngine;
  cameraMode: CameraMode;
}

/**
 * Pure renderer.
 *
 * The scene visualises the state the simulation engine already holds; it
 * never advances the match itself. The match clock is owned by the application
 * shell so that every route (broadcast view, control panel, transparent
 * output) advances the very same match.
 */
export function Scene({ engine, cameraMode }: SceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  cameraModeRef.current = cameraMode;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 140, 260);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    applyCameraMode(camera, cameraModeRef.current);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    scene.add(sun);

    scene.add(createPitch());

    const visuals: PlayerVisuals = createPlayers();
    scene.add(visuals.group);

    const frame = engine.getFrame();
    const teamColor = new Map(TEAMS.map((team) => [team.id, team.color]));
    for (const player of frame.players) {
      addPlayerMesh(visuals, player, teamColor.get(player.teamId) ?? "#888888");
    }

    const ball = createBall();
    scene.add(ball);

    let lastTime = performance.now();
    let animationId = 0;
    let appliedMode: CameraMode = cameraModeRef.current;

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const loop = (time: number) => {
      animationId = requestAnimationFrame(loop);
      const deltaWallMs = Math.min(100, time - lastTime);
      lastTime = time;

      const snapshot = engine.getFrame();
      updatePlayers(visuals, snapshot.players, new Map());
      updateBall(ball, snapshot.ball);

      if (cameraModeRef.current !== appliedMode) {
        appliedMode = cameraModeRef.current;
        applyCameraMode(camera, appliedMode);
      }
      trackBall(camera, appliedMode, snapshot.ball.x);

      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      container.removeChild(renderer.domElement);
    };
  }, [engine]);

  return <div ref={containerRef} className="scene" aria-label="3D match view" />;
}
