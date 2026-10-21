import * as THREE from "three";

const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;

/** FIFA standard dimensions (metres). */
const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const GOAL_AREA_DEPTH = 5.5;
const GOAL_AREA_WIDTH = 18.32;
const PENALTY_AREA_DEPTH = 16.5;
const PENALTY_AREA_WIDTH = 40.32;
const PENALTY_SPOT_DISTANCE = 11;
const PENALTY_ARC_RADIUS = 9.15;
const CENTRE_CIRCLE_RADIUS = 9.15;

function lineMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
}

function closedRect(halfLength: number, halfWidth: number): THREE.BufferGeometry {
  const points = [
    new THREE.Vector3(-halfLength, 0.02, -halfWidth),
    new THREE.Vector3(halfLength, 0.02, -halfWidth),
    new THREE.Vector3(halfLength, 0.02, halfWidth),
    new THREE.Vector3(-halfLength, 0.02, halfWidth),
    new THREE.Vector3(-halfLength, 0.02, -halfWidth),
  ];
  return new THREE.BufferGeometry().setFromPoints(points);
}

function segment(
  from: [number, number],
  to: [number, number],
): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from[0], 0.02, from[1]),
    new THREE.Vector3(to[0], 0.02, to[1]),
  ]);
}

function circlePoints(radius: number, segments = 64): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius),
    );
  }
  return points;
}

function arcPoints(radius: number, startAngle: number, endAngle: number, segments = 48): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const span = endAngle - startAngle;
  for (let i = 0; i <= segments; i += 1) {
    const angle = startAngle + (i / segments) * span;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius),
    );
  }
  return points;
}

export function createPitch(): THREE.Group {
  const group = new THREE.Group();

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_LENGTH + 8, PITCH_WIDTH + 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  group.add(grass);

  for (let i = 0; i < 10; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH_LENGTH / 10, PITCH_WIDTH),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x232325 : 0x1c1c1e,
        roughness: 1,
      }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-PITCH_LENGTH / 2 + (PITCH_LENGTH / 10) * (i + 0.5), 0.01, 0);
    stripe.receiveShadow = true;
    group.add(stripe);
  }

  const mat = lineMaterial();
  const halfL = PITCH_LENGTH / 2;
  const halfW = PITCH_WIDTH / 2;
  const halfGoalW = GOAL_WIDTH / 2;
  const halfGoalAreaW = GOAL_AREA_WIDTH / 2;
  const halfPenaltyAreaW = PENALTY_AREA_WIDTH / 2;
  const goalAreaD = GOAL_AREA_DEPTH;
  const penaltyAreaD = PENALTY_AREA_DEPTH;

  const lines: THREE.BufferGeometry[] = [
    // Touchlines and goal lines
    closedRect(halfL, halfW),
    // Halfway line
    segment([0, -halfW], [0, halfW]),
    // Centre circle
    new THREE.BufferGeometry().setFromPoints(circlePoints(CENTRE_CIRCLE_RADIUS)),
    // Centre spot
  ];

  // Goal area (6-yard box) - left
  lines.push(
    segment([-halfL, -halfGoalAreaW], [-halfL + goalAreaD, -halfGoalAreaW]),
    segment([-halfL + goalAreaD, -halfGoalAreaW], [-halfL + goalAreaD, halfGoalAreaW]),
    segment([-halfL + goalAreaD, halfGoalAreaW], [-halfL, halfGoalAreaW]),
  );
  // Goal area - right
  lines.push(
    segment([halfL, -halfGoalAreaW], [halfL - goalAreaD, -halfGoalAreaW]),
    segment([halfL - goalAreaD, -halfGoalAreaW], [halfL - goalAreaD, halfGoalAreaW]),
    segment([halfL - goalAreaD, halfGoalAreaW], [halfL, halfGoalAreaW]),
  );
  // Penalty area (18-yard box) - left
  lines.push(
    segment([-halfL, -halfPenaltyAreaW], [-halfL + penaltyAreaD, -halfPenaltyAreaW]),
    segment([-halfL + penaltyAreaD, -halfPenaltyAreaW], [-halfL + penaltyAreaD, halfPenaltyAreaW]),
    segment([-halfL + penaltyAreaD, halfPenaltyAreaW], [-halfL, halfPenaltyAreaW]),
  );
  // Penalty area - right
  lines.push(
    segment([halfL, -halfPenaltyAreaW], [halfL - penaltyAreaD, -halfPenaltyAreaW]),
    segment([halfL - penaltyAreaD, -halfPenaltyAreaW], [halfL - penaltyAreaD, halfPenaltyAreaW]),
    segment([halfL - penaltyAreaD, halfPenaltyAreaW], [halfL, halfPenaltyAreaW]),
  );

  // Penalty arc - left (centred at penalty spot, only outside penalty area)
  const leftPenaltySpotX = -halfL + PENALTY_SPOT_DISTANCE;
  const rightPenaltySpotX = halfL - PENALTY_SPOT_DISTANCE;
  // Arc angles: from below to above, on the side away from goal line
  lines.push(new THREE.BufferGeometry().setFromPoints(arcPoints(PENALTY_ARC_RADIUS, Math.PI * 0.2, Math.PI * 0.8).map(p => new THREE.Vector3(leftPenaltySpotX + p.x, p.y, p.z))));
  lines.push(new THREE.BufferGeometry().setFromPoints(arcPoints(PENALTY_ARC_RADIUS, -Math.PI * 0.8, -Math.PI * 0.2).map(p => new THREE.Vector3(rightPenaltySpotX + p.x, p.y, p.z))));

  for (const geometry of lines) {
    group.add(new THREE.Line(geometry, mat));
  }

  // Centre spot
  const spotGeo = new THREE.CircleGeometry(0.12, 16);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const centreSpot = new THREE.Mesh(spotGeo, spotMat);
  centreSpot.rotation.x = -Math.PI / 2;
  centreSpot.position.y = 0.021;
  group.add(centreSpot);

  // Penalty spots
  for (const side of [-1, 1]) {
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(side * (halfL - PENALTY_SPOT_DISTANCE), 0.021, 0);
    group.add(spot);
  }

  // Goals
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, GOAL_HEIGHT, 8);
  for (const side of [-1, 1]) {
    const goalGroup = new THREE.Group();
    for (const z of [-halfGoalW, halfGoalW]) {
      const post = new THREE.Mesh(postGeo, goalMat);
      post.position.set(side * halfL, GOAL_HEIGHT / 2, z);
      goalGroup.add(post);
    }
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, GOAL_WIDTH, 8),
      goalMat,
    );
    bar.rotation.x = Math.PI / 2;
    bar.position.set(side * halfL, GOAL_HEIGHT, 0);
    goalGroup.add(bar);
    group.add(goalGroup);
  }

  return group;
}
