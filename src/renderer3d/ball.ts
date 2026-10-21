import * as THREE from "three";
import type { Vector3 } from "../contracts";

export const BALL_RADIUS = 0.55;
const GROUND_Y = BALL_RADIUS;

export function createBall(): THREE.Group {
  const group = new THREE.Group();

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 24, 18),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.0,
      emissive: 0x333333,
    }),
  );
  ball.castShadow = true;
  group.add(ball);

  const patch = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS * 1.01, 24, 18),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    }),
  );
  group.add(patch);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(BALL_RADIUS * 1.5, BALL_RADIUS * 2.1, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02 - GROUND_Y;
  group.add(ring);

  group.position.set(0, GROUND_Y, 0);
  return group;
}

export function updateBall(ball: THREE.Object3D, position: Vector3): void {
  ball.position.set(position.x, Math.max(GROUND_Y, position.y), position.z);
}
