export type HistoricalEdition = {
  id: string;
  title: string;
  year: string;
  champion: string;
  runnerUp: string;
  description: string;
  image?: string;
  table: Array<{
    pos: number;
    participant: string;
    points: number;
    played: number;
    exactHits: number;
    winnerHits: number;
    notes?: string;
    badge?: "champion" | "runner-up" | "podium" | "relegated";
  }>;
};

export const historicalEditions: HistoricalEdition[] = [
  {
    id: "copa-kahl-2026",
    title: "Copa Kahl - Mundial 2026",
    year: "2026",
    champion: "Gonza Fiss",
    runnerUp: "Nicolas Gonzalez",
    description: "La edición consagratoria de la Copa Kahl disputada durante la cita mundialista.",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
    table: [
      { pos: 1, participant: "Gonza el + Fachero.", points: 162, played: 104, exactHits: 10, winnerHits: 71, badge: "champion", notes: "CAMPEÓN" },
      { pos: 2, participant: "Nicolas Gonzalez", points: 157, played: 104, exactHits: 10, winnerHits: 65, badge: "runner-up", notes: "Subcampeón" },
      { pos: 3, participant: "Miguel", points: 157, played: 104, exactHits: 6, winnerHits: 72, badge: "podium", notes: "Tercer Puesto" },
      { pos: 4, participant: "Ale Bauce", points: 153, played: 104, exactHits: 8, winnerHits: 66, badge: "podium" },
      { pos: 5, participant: "Zino", points: 152, played: 104, exactHits: 8, winnerHits: 69 },
      { pos: 6, participant: "Javier", points: 148, played: 104, exactHits: 7, winnerHits: 66 },
      { pos: 7, participant: "El Buda", points: 144, played: 104, exactHits: 6, winnerHits: 64 },
      { pos: 8, participant: "Fer", points: 132, played: 104, exactHits: 5, winnerHits: 58, badge: "relegated", notes: "Descendido a B Nacional" },
      { pos: 9, participant: "Maxi", points: 128, played: 104, exactHits: 4, winnerHits: 56, badge: "relegated", notes: "Descendido a B Nacional" },
      { pos: 10, participant: "Nahuel", points: 121, played: 104, exactHits: 3, winnerHits: 52, badge: "relegated", notes: "Descendido a B Nacional" },
    ],
  },
  {
    id: "copa-chiqui-bauch",
    title: "Copa Chiqui Bauch",
    year: "2025",
    champion: "Gonza Fiss",
    runnerUp: "Ale Bauce",
    description: "Torneo de leyenda marcado por la paridad hasta la última fecha y el mítico triunfo de Gonza.",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
    table: [
      { pos: 1, participant: "Gonza Fiss", points: 148, played: 64, exactHits: 12, winnerHits: 44, badge: "champion", notes: "CAMPEÓN" },
      { pos: 2, participant: "Ale Bauce", points: 142, played: 64, exactHits: 9, winnerHits: 45, badge: "runner-up" },
      { pos: 3, participant: "Nicolas Gonzalez", points: 139, played: 64, exactHits: 8, winnerHits: 44, badge: "podium" },
      { pos: 4, participant: "Javi", points: 135, played: 64, exactHits: 7, winnerHits: 43 },
      { pos: 5, participant: "Zino", points: 131, played: 64, exactHits: 6, winnerHits: 42 },
      { pos: 6, participant: "Miguel", points: 125, played: 64, exactHits: 5, winnerHits: 40 },
      { pos: 7, participant: "El Buda", points: 118, played: 64, exactHits: 4, winnerHits: 38, badge: "relegated", notes: "Descendido" },
    ],
  },
  {
    id: "copa-fiss",
    title: "Copa Fiss",
    year: "2024",
    champion: "Javi",
    runnerUp: "Gonza Fiss",
    description: "La copa inagural donde Javi mostró la contundencia de un campeón supremo.",
    image: "/kahl-assets/campeon-javi.jpeg",
    table: [
      { pos: 1, participant: "Javi", points: 154, played: 64, exactHits: 14, winnerHits: 46, badge: "champion", notes: "CAMPEÓN" },
      { pos: 2, participant: "Gonza Fiss", points: 149, played: 64, exactHits: 11, winnerHits: 47, badge: "runner-up" },
      { pos: 3, participant: "Nicolas Gonzalez", points: 141, played: 64, exactHits: 9, winnerHits: 44, badge: "podium" },
      { pos: 4, participant: "Ale Bauce", points: 136, played: 64, exactHits: 8, winnerHits: 42 },
      { pos: 5, participant: "El Buda", points: 122, played: 64, exactHits: 5, winnerHits: 39, badge: "relegated", notes: "Descendido" },
      { pos: 6, participant: "Miguel", points: 119, played: 64, exactHits: 4, winnerHits: 38, badge: "relegated", notes: "Descendido" },
    ],
  },
];

export type AllTimeRecord = {
  participant: string;
  titles: number;
  runnerUps: number;
  podiums: number;
  relegations: number;
};

export const allTimePalmares: AllTimeRecord[] = [
  { participant: "Gonza Fiss / Gonza el + Fachero.", titles: 2, runnerUps: 1, podiums: 3, relegations: 0 },
  { participant: "Javi / Javier", titles: 1, runnerUps: 0, podiums: 1, relegations: 0 },
  { participant: "Ale Bauce", titles: 0, runnerUps: 1, podiums: 1, relegations: 0 },
  { participant: "Nicolas Gonzalez", titles: 0, runnerUps: 1, podiums: 2, relegations: 0 },
  { participant: "Miguel", titles: 0, runnerUps: 0, podiums: 1, relegations: 1 },
  { participant: "El Buda", titles: 0, runnerUps: 0, podiums: 0, relegations: 2 },
  { participant: "Fer", titles: 0, runnerUps: 0, podiums: 0, relegations: 1 },
  { participant: "Maxi", titles: 0, runnerUps: 0, podiums: 0, relegations: 1 },
  { participant: "Nahuel", titles: 0, runnerUps: 0, podiums: 0, relegations: 1 },
];
