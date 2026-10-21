import type { Player, Team, Vector3 } from "../contracts";

export const HOME_TEAM: Team = {
  id: "team-northbridge",
  name: "Northbridge FC",
  shortName: "NBR",
  color: "#3b82f6",
};

export const AWAY_TEAM: Team = {
  id: "team-harbor",
  name: "Harbor City FC",
  shortName: "HBR",
  color: "#ef4444",
};

export const TEAMS: readonly Team[] = [HOME_TEAM, AWAY_TEAM];

interface RosterEntry {
  shirtNumber: number;
  name: string;
  role: Player["role"];
  base: Vector3;
}

const HOME_ROSTER: readonly RosterEntry[] = [
  { shirtNumber: 1, name: "J. Calder", role: "GK", base: { x: -50, y: 0, z: 0 } },
  { shirtNumber: 2, name: "M. Okafor", role: "DEF", base: { x: -36, y: 0, z: -22 } },
  { shirtNumber: 4, name: "L. Berg", role: "DEF", base: { x: -38, y: 0, z: -8 } },
  { shirtNumber: 5, name: "S. Duarte", role: "DEF", base: { x: -38, y: 0, z: 8 } },
  { shirtNumber: 3, name: "R. Hayes", role: "DEF", base: { x: -36, y: 0, z: 22 } },
  { shirtNumber: 6, name: "T. Voss", role: "MID", base: { x: -20, y: 0, z: 0 } },
  { shirtNumber: 8, name: "K. Ahmadi", role: "MID", base: { x: -14, y: 0, z: -14 } },
  { shirtNumber: 10, name: "D. Reyes", role: "MID", base: { x: -12, y: 0, z: 14 } },
  { shirtNumber: 7, name: "P. Lindqvist", role: "FWD", base: { x: 4, y: 0, z: -20 } },
  { shirtNumber: 9, name: "A. Nkemelu", role: "FWD", base: { x: 10, y: 0, z: 0 } },
  { shirtNumber: 11, name: "C. Ibarra", role: "FWD", base: { x: 4, y: 0, z: 20 } },
];

const AWAY_ROSTER: readonly RosterEntry[] = [
  { shirtNumber: 1, name: "V. Sorensen", role: "GK", base: { x: 50, y: 0, z: 0 } },
  { shirtNumber: 2, name: "H. Petrov", role: "DEF", base: { x: 36, y: 0, z: -22 } },
  { shirtNumber: 4, name: "N. Fadel", role: "DEF", base: { x: 38, y: 0, z: -8 } },
  { shirtNumber: 5, name: "G. Moreau", role: "DEF", base: { x: 38, y: 0, z: 8 } },
  { shirtNumber: 3, name: "B. Tanaka", role: "DEF", base: { x: 36, y: 0, z: 22 } },
  { shirtNumber: 6, name: "E. Kowalski", role: "MID", base: { x: 20, y: 0, z: 0 } },
  { shirtNumber: 8, name: "F. Al-Rashid", role: "MID", base: { x: 14, y: 0, z: -14 } },
  { shirtNumber: 10, name: "I. Novak", role: "MID", base: { x: 12, y: 0, z: 14 } },
  { shirtNumber: 7, name: "O. Delgado", role: "FWD", base: { x: -4, y: 0, z: -20 } },
  { shirtNumber: 9, name: "W. Adebayo", role: "FWD", base: { x: -10, y: 0, z: 0 } },
  { shirtNumber: 11, name: "Z. Keller", role: "FWD", base: { x: -4, y: 0, z: 20 } },
];

export interface Roster {
  players: readonly Player[];
  byId: ReadonlyMap<string, Player>;
}

export function createRoster(): Roster {
  const players: Player[] = [
    ...HOME_ROSTER.map((entry) => ({
      id: `${HOME_TEAM.id}-p${entry.shirtNumber}`,
      teamId: HOME_TEAM.id,
      name: entry.name,
      shirtNumber: entry.shirtNumber,
      role: entry.role,
      position: { ...entry.base },
    })),
    ...AWAY_ROSTER.map((entry) => ({
      id: `${AWAY_TEAM.id}-p${entry.shirtNumber}`,
      teamId: AWAY_TEAM.id,
      name: entry.name,
      shirtNumber: entry.shirtNumber,
      role: entry.role,
      position: { ...entry.base },
    })),
  ];
  const byId = new Map(players.map((player) => [player.id, player]));
  return { players, byId };
}

export function homePlayerId(shirtNumber: number): string {
  return `${HOME_TEAM.id}-p${shirtNumber}`;
}

export function awayPlayerId(shirtNumber: number): string {
  return `${AWAY_TEAM.id}-p${shirtNumber}`;
}
