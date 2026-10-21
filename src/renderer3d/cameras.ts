import * as THREE from "three";

export type CameraMode = "broadcast" | "tactical";

const BROADCAST_POSITION = new THREE.Vector3(0, 42, 68);
const BROADCAST_LOOKAT = new THREE.Vector3(0, 0, 0);
const TACTICAL_POSITION = new THREE.Vector3(0, 95, 0.01);
const TACTICAL_LOOKAT = new THREE.Vector3(0, 0, 0);

export function applyCameraMode(
  camera: THREE.PerspectiveCamera,
  mode: CameraMode,
): void {
  if (mode === "broadcast") {
    camera.position.copy(BROADCAST_POSITION);
    camera.lookAt(BROADCAST_LOOKAT);
  } else {
    camera.position.copy(TACTICAL_POSITION);
    camera.lookAt(TACTICAL_LOOKAT);
  }
  camera.updateProjectionMatrix();
}

export function trackBall(
  camera: THREE.PerspectiveCamera,
  mode: CameraMode,
  ballX: number,
): void {
  if (mode !== "broadcast") return;
  const clampedX = Math.min(30, Math.max(-30, ballX));
  camera.position.set(clampedX * 0.6, 42, 68);
  camera.lookAt(clampedX * 0.35, 0, 0);
}
