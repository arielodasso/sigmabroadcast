import * as THREE from "three";
import type { Player, Vector3 } from "../contracts";

export interface PlayerVisuals {
  meshes: Map<string, THREE.Mesh>;
  group: THREE.Group;
}

export function createPlayers(): PlayerVisuals {
  const group = new THREE.Group();
  const meshes = new Map<string, THREE.Mesh>();
  return { meshes, group };
}

export function addPlayerMesh(
  visuals: PlayerVisuals,
  player: Player,
  color: string,
): void {
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 1.0, 4, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
  );
  body.castShadow = true;
  body.position.set(player.position.x, 0.95, player.position.z);

  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
  );
  marker.rotation.x = Math.PI;
  marker.position.set(0, 1.0, 0);
  body.add(marker);

  const numberSprite = createNumberSprite(player.shirtNumber, color);
  if (numberSprite) {
    numberSprite.position.set(0, 2.0, 0);
    body.add(numberSprite);
  }

  visuals.meshes.set(player.id, body);
  visuals.group.add(body);
}

function createNumberSprite(
  shirtNumber: number,
  teamColor: string,
): THREE.Sprite | null {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(shirtNumber), 32, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: true }),
  );
  sprite.scale.set(1.1, 1.1, 1);
  return sprite;
}

export function updatePlayers(
  visuals: PlayerVisuals,
  players: readonly Player[],
  interpolated: ReadonlyMap<string, Vector3>,
): void {
  for (const player of players) {
    const mesh = visuals.meshes.get(player.id);
    if (!mesh) continue;
    const target = interpolated.get(player.id) ?? player.position;
    mesh.position.set(target.x, 0.95, target.z);
  }
}
