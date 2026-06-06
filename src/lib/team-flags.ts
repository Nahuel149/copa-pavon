import { groups, type GroupId } from "./matches";

const flagCodesByGroup: Record<GroupId, string[]> = {
  A: ["mx", "za", "kr", "cz"],
  B: ["ca", "ba", "qa", "ch"],
  C: ["br", "ma", "ht", "gb-sct"],
  D: ["us", "py", "au", "tr"],
  E: ["de", "cw", "ci", "ec"],
  F: ["nl", "jp", "se", "tn"],
  G: ["be", "eg", "ir", "nz"],
  H: ["es", "cv", "sa", "uy"],
  I: ["fr", "sn", "iq", "no"],
  J: ["ar", "dz", "at", "jo"],
  K: ["pt", "cd", "uz", "co"],
  L: ["gb-eng", "hr", "gh", "pa"],
};

const flagUrlByTeam = new Map(
  groups.flatMap((group) => group.teams.map((team, index) => [team, `https://flagcdn.com/w80/${flagCodesByGroup[group.id][index]}.png`])),
);

export function getTeamFlagUrl(team: string) {
  return flagUrlByTeam.get(team) ?? null;
}
