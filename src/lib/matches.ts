export type MatchRound = 1 | 2 | 3;
export type GroupId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";
export type KnockoutStage = "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";

export type Group = {
  id: GroupId;
  teams: string[];
};

export type Match = {
  id: string;
  round: MatchRound;
  order: number;
  groupId: GroupId;
  dateLabel: string;
  home: string;
  away: string;
  exactScore: boolean;
};

export type KnockoutFixture = {
  id: string;
  order: number;
  stage: KnockoutStage;
  home: string;
  away: string;
  kickoffAt?: string;
};

export const groups: Group[] = [
  { id: "A", teams: ["México", "Sudáfrica", "Corea del Sur", "República Checa"] },
  { id: "B", teams: ["Canadá", "Bosnia & Herzegovina", "Qatar", "Suiza"] },
  { id: "C", teams: ["Brasil", "Marruecos", "Haití", "Escocia"] },
  { id: "D", teams: ["Estados Unidos", "Paraguay", "Australia", "Turquía"] },
  { id: "E", teams: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"] },
  { id: "F", teams: ["Países Bajos", "Japón", "Suecia", "Túnez"] },
  { id: "G", teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"] },
  { id: "H", teams: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"] },
  { id: "I", teams: ["Francia", "Senegal", "Irak", "Noruega"] },
  { id: "J", teams: ["Argentina", "Argelia", "Austria", "Jordania"] },
  { id: "K", teams: ["Portugal", "RD Congo", "Uzbekistán", "Colombia"] },
  { id: "L", teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"] },
];

const rawMatches: Array<Omit<Match, "id" | "round" | "order" | "exactScore">> = [
  { dateLabel: "11 Jun", groupId: "A", home: "México", away: "Sudáfrica" },
  { dateLabel: "11 Jun", groupId: "A", home: "Corea del Sur", away: "República Checa" },
  { dateLabel: "12 Jun", groupId: "B", home: "Canadá", away: "Bosnia & Herzegovina" },
  { dateLabel: "12 Jun", groupId: "D", home: "Estados Unidos", away: "Paraguay" },
  { dateLabel: "13 Jun", groupId: "C", home: "Haití", away: "Escocia" },
  { dateLabel: "13 Jun", groupId: "D", home: "Australia", away: "Turquía" },
  { dateLabel: "13 Jun", groupId: "C", home: "Brasil", away: "Marruecos" },
  { dateLabel: "13 Jun", groupId: "B", home: "Qatar", away: "Suiza" },
  { dateLabel: "14 Jun", groupId: "E", home: "Costa de Marfil", away: "Ecuador" },
  { dateLabel: "14 Jun", groupId: "E", home: "Alemania", away: "Curazao" },
  { dateLabel: "14 Jun", groupId: "F", home: "Países Bajos", away: "Japón" },
  { dateLabel: "14 Jun", groupId: "F", home: "Suecia", away: "Túnez" },
  { dateLabel: "15 Jun", groupId: "H", home: "Arabia Saudita", away: "Uruguay" },
  { dateLabel: "15 Jun", groupId: "H", home: "España", away: "Cabo Verde" },
  { dateLabel: "15 Jun", groupId: "G", home: "Irán", away: "Nueva Zelanda" },
  { dateLabel: "15 Jun", groupId: "G", home: "Bélgica", away: "Egipto" },
  { dateLabel: "16 Jun", groupId: "I", home: "Francia", away: "Senegal" },
  { dateLabel: "16 Jun", groupId: "I", home: "Irak", away: "Noruega" },
  { dateLabel: "16 Jun", groupId: "J", home: "Argentina", away: "Argelia" },
  { dateLabel: "16 Jun", groupId: "J", home: "Austria", away: "Jordania" },
  { dateLabel: "17 Jun", groupId: "L", home: "Ghana", away: "Panamá" },
  { dateLabel: "17 Jun", groupId: "L", home: "Inglaterra", away: "Croacia" },
  { dateLabel: "17 Jun", groupId: "K", home: "Portugal", away: "RD Congo" },
  { dateLabel: "17 Jun", groupId: "K", home: "Uzbekistán", away: "Colombia" },
  { dateLabel: "18 Jun", groupId: "A", home: "República Checa", away: "Sudáfrica" },
  { dateLabel: "18 Jun", groupId: "B", home: "Suiza", away: "Bosnia & Herzegovina" },
  { dateLabel: "18 Jun", groupId: "B", home: "Canadá", away: "Qatar" },
  { dateLabel: "18 Jun", groupId: "A", home: "México", away: "Corea del Sur" },
  { dateLabel: "19 Jun", groupId: "C", home: "Brasil", away: "Haití" },
  { dateLabel: "19 Jun", groupId: "C", home: "Escocia", away: "Marruecos" },
  { dateLabel: "19 Jun", groupId: "D", home: "Turquía", away: "Paraguay" },
  { dateLabel: "19 Jun", groupId: "D", home: "Estados Unidos", away: "Australia" },
  { dateLabel: "20 Jun", groupId: "E", home: "Alemania", away: "Costa de Marfil" },
  { dateLabel: "20 Jun", groupId: "E", home: "Ecuador", away: "Curazao" },
  { dateLabel: "20 Jun", groupId: "F", home: "Países Bajos", away: "Suecia" },
  { dateLabel: "20 Jun", groupId: "F", home: "Túnez", away: "Japón" },
  { dateLabel: "21 Jun", groupId: "H", home: "Uruguay", away: "Cabo Verde" },
  { dateLabel: "21 Jun", groupId: "H", home: "España", away: "Arabia Saudita" },
  { dateLabel: "21 Jun", groupId: "G", home: "Bélgica", away: "Irán" },
  { dateLabel: "21 Jun", groupId: "G", home: "Nueva Zelanda", away: "Egipto" },
  { dateLabel: "22 Jun", groupId: "I", home: "Noruega", away: "Senegal" },
  { dateLabel: "22 Jun", groupId: "I", home: "Francia", away: "Irak" },
  { dateLabel: "22 Jun", groupId: "J", home: "Argentina", away: "Austria" },
  { dateLabel: "22 Jun", groupId: "J", home: "Jordania", away: "Argelia" },
  { dateLabel: "23 Jun", groupId: "L", home: "Inglaterra", away: "Ghana" },
  { dateLabel: "23 Jun", groupId: "L", home: "Panamá", away: "Croacia" },
  { dateLabel: "23 Jun", groupId: "K", home: "Portugal", away: "Uzbekistán" },
  { dateLabel: "23 Jun", groupId: "K", home: "Colombia", away: "RD Congo" },
  { dateLabel: "24 Jun", groupId: "C", home: "Escocia", away: "Brasil" },
  { dateLabel: "24 Jun", groupId: "C", home: "Marruecos", away: "Haití" },
  { dateLabel: "24 Jun", groupId: "B", home: "Suiza", away: "Canadá" },
  { dateLabel: "24 Jun", groupId: "B", home: "Bosnia & Herzegovina", away: "Qatar" },
  { dateLabel: "24 Jun", groupId: "A", home: "República Checa", away: "México" },
  { dateLabel: "24 Jun", groupId: "A", home: "Sudáfrica", away: "Corea del Sur" },
  { dateLabel: "25 Jun", groupId: "E", home: "Curazao", away: "Costa de Marfil" },
  { dateLabel: "25 Jun", groupId: "E", home: "Ecuador", away: "Alemania" },
  { dateLabel: "25 Jun", groupId: "F", home: "Japón", away: "Suecia" },
  { dateLabel: "25 Jun", groupId: "F", home: "Túnez", away: "Países Bajos" },
  { dateLabel: "25 Jun", groupId: "D", home: "Turquía", away: "Estados Unidos" },
  { dateLabel: "25 Jun", groupId: "D", home: "Paraguay", away: "Australia" },
  { dateLabel: "26 Jun", groupId: "I", home: "Noruega", away: "Francia" },
  { dateLabel: "26 Jun", groupId: "I", home: "Senegal", away: "Irak" },
  { dateLabel: "26 Jun", groupId: "G", home: "Egipto", away: "Irán" },
  { dateLabel: "26 Jun", groupId: "G", home: "Nueva Zelanda", away: "Bélgica" },
  { dateLabel: "26 Jun", groupId: "H", home: "Cabo Verde", away: "Arabia Saudita" },
  { dateLabel: "26 Jun", groupId: "H", home: "Uruguay", away: "España" },
  { dateLabel: "27 Jun", groupId: "L", home: "Panamá", away: "Inglaterra" },
  { dateLabel: "27 Jun", groupId: "L", home: "Croacia", away: "Ghana" },
  { dateLabel: "27 Jun", groupId: "J", home: "Argelia", away: "Austria" },
  { dateLabel: "27 Jun", groupId: "J", home: "Jordania", away: "Argentina" },
  { dateLabel: "27 Jun", groupId: "K", home: "Colombia", away: "Portugal" },
  { dateLabel: "27 Jun", groupId: "K", home: "RD Congo", away: "Uzbekistán" },
];

const exactScoreMatchIds = new Set([
  "m-04",
  "m-07",
  "m-10",
  "m-13",
  "m-14",
  "m-16",
  "m-17",
  "m-19",
  "m-22",
  "m-23",
  "m-29",
  "m-32",
  "m-33",
  "m-35",
  "m-37",
  "m-38",
  "m-42",
  "m-43",
  "m-45",
  "m-47",
  "m-49",
  "m-53",
  "m-56",
  "m-58",
  "m-59",
  "m-61",
  "m-66",
  "m-67",
  "m-70",
  "m-71",
]);

export const matches: Match[] = rawMatches.map((match, index) => {
  const id = `m-${String(index + 1).padStart(2, "0")}`;
  return {
    ...match,
    exactScore: exactScoreMatchIds.has(id),
    id,
    order: index + 1,
    round: (Math.floor(index / 24) + 1) as MatchRound,
  };
});

export const knockoutStageLabels: Record<KnockoutStage, string> = {
  R32: "16avos",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinal",
  THIRD: "Tercer puesto",
  FINAL: "Final",
};

export const knockoutStages = Object.keys(knockoutStageLabels) as KnockoutStage[];

export const knockoutStageSchedule: Record<KnockoutStage, string> = {
  R32: "28 Jun - 3 Jul",
  R16: "4 - 7 Jul",
  QF: "9 - 11 Jul",
  SF: "14 - 15 Jul",
  THIRD: "18 Jul",
  FINAL: "19 Jul",
};

export const knockoutStageScoring: Record<KnockoutStage, { exact: number; winner: number; winnerLabel: string }> = {
  R32: { exact: 4, winner: 2, winnerLabel: "ganador clasificado" },
  R16: { exact: 4, winner: 2, winnerLabel: "ganador clasificado" },
  QF: { exact: 5, winner: 3, winnerLabel: "ganador clasificado" },
  SF: { exact: 6, winner: 4, winnerLabel: "ganador clasificado" },
  THIRD: { exact: 4, winner: 2, winnerLabel: "ganador" },
  FINAL: { exact: 8, winner: 5, winnerLabel: "campeon correcto" },
};

export const exactScoreMatches = matches.filter((match) => match.exactScore);
export const choiceMatches = matches.filter((match) => !match.exactScore);

export const matchMap = new Map(matches.map((match) => [match.id, match]));
export const groupMap = new Map(groups.map((group) => [group.id, group]));

export const roundLabels: Record<MatchRound, string> = {
  1: "Fechas 11-17 Jun",
  2: "Fechas 18-23 Jun",
  3: "Fechas 24-27 Jun",
};
