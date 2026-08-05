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

const flagAliases: Record<string, string> = {
  "bosnia and herzegovina": "Bosnia & Herzegovina",
  "bosnia herzegovina": "Bosnia & Herzegovina",
  "bosnia herz": "Bosnia & Herzegovina",
  "bosnia hercegovina": "Bosnia & Herzegovina",
  "bosnia y herzegovina": "Bosnia & Herzegovina",
  bosnia: "Bosnia & Herzegovina",
  "cabo verde": "Cabo Verde",
  "cape verde": "Cabo Verde",
  canada: "Canadá",
  "corea del sur": "Corea del Sur",
  "costa de marfil": "Costa de Marfil",
  "cote d ivoire": "Costa de Marfil",
  curacao: "Curazao",
  espana: "España",
  haiti: "Haití",
  iran: "Irán",
  japon: "Japón",
  mexico: "México",
  "nueva zelanda": "Nueva Zelanda",
  "new zealand": "Nueva Zelanda",
  "paises bajos": "Países Bajos",
  netherlands: "Países Bajos",
  "rd congo": "RD Congo",
  "dr congo": "RD Congo",
  "republica checa": "República Checa",
  "czech republic": "República Checa",
  sudafrica: "Sudáfrica",
  "sud africa": "Sudáfrica",
  "south africa": "Sudáfrica",
  tunez: "Túnez",
  turquia: "Turquía",
  uzbekistan: "Uzbekistán",
  panama: "Panamá",
};

function normalizeTeamFlagName(value: string) {
  return value
    .replace(new RegExp("\\u00c3\\u00a1", "g"), "a")
    .replace(new RegExp("\\u00c3\\u00a9", "g"), "e")
    .replace(new RegExp("\\u00c3\\u00ad", "g"), "i")
    .replace(new RegExp("\\u00c3\\u00b3", "g"), "o")
    .replace(new RegExp("\\u00c3\\u00ba", "g"), "u")
    .replace(new RegExp("\\u00c3\\u00b1", "g"), "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const flagUrlByTeam = new Map<string, string>();

for (const group of groups) {
  group.teams.forEach((team, index) => {
    const flagUrl = `https://flagcdn.com/w80/${flagCodesByGroup[group.id][index]}.png`;
    flagUrlByTeam.set(team, flagUrl);
    flagUrlByTeam.set(normalizeTeamFlagName(team), flagUrl);
  });
}

for (const [alias, canonicalTeam] of Object.entries(flagAliases)) {
  const flagUrl = flagUrlByTeam.get(canonicalTeam) ?? flagUrlByTeam.get(normalizeTeamFlagName(canonicalTeam));
  if (flagUrl) flagUrlByTeam.set(normalizeTeamFlagName(alias), flagUrl);
}

const argentineClubs = [
  "Atlético Tucumán",
  "Sarmiento Junín",
  "Deportivo Riestra",
  "Estudiantes de La Plata",
  "Tigre",
  "River Plate",
  "Boca Juniors",
  "Vélez Sarsfield",
  "Independiente",
  "Platense",
  "Instituto",
  "Gimnasia de Mendoza",
];

const arFlagUrl = "https://flagcdn.com/w80/ar.png";
for (const club of argentineClubs) {
  flagUrlByTeam.set(club, arFlagUrl);
  flagUrlByTeam.set(normalizeTeamFlagName(club), arFlagUrl);
}

export function getTeamFlagUrl(team: string) {
  return flagUrlByTeam.get(team) ?? flagUrlByTeam.get(normalizeTeamFlagName(team)) ?? null;
}
