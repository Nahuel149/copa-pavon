export type HistoricalEdition = {
  id: string;
  title: string;
  year: string;
  champion: string;
  runnerUp?: string;
  description: string;
  image?: string;
  table?: Array<{
    pos: number;
    participant: string;
    points: number;
    played: number;
    won: number;
    lost: number;
    exactHits: number;
    goals: number;
    groups: string;
    totalHits: number;
    notes?: string;
    badge?: "champion" | "runner-up" | "podium" | "relegated";
  }>;
};

export const historicalEditions: HistoricalEdition[] = [
  {
    id: "copa-kahl-2026",
    title: "Copa Kahl",
    year: "2026",
    champion: "Gonza el + Fachero.",
    runnerUp: "Nicolas Gonzalez",
    description: "Tabla oficial de posiciones de la Copa Kahl.",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
    table: [
      { pos: 1, participant: "Gonza el + Fachero.", points: 162, played: 104, won: 71, lost: 33, exactHits: 10, goals: 17, groups: "7/12", totalHits: 105, badge: "champion", notes: "CAMPEÓN" },
      { pos: 2, participant: "Nicolas Gonzalez", points: 157, played: 104, won: 65, lost: 39, exactHits: 10, goals: 14, groups: "9/12", totalHits: 98, badge: "runner-up", notes: "Subcampeón" },
      { pos: 3, participant: "Miguel (El Buda)", points: 157, played: 104, won: 72, lost: 32, exactHits: 6, goals: 15, groups: "9/12", totalHits: 102, badge: "podium", notes: "Tercer Puesto" },
      { pos: 4, participant: "Ale Bauce", points: 153, played: 104, won: 66, lost: 38, exactHits: 8, goals: 15, groups: "6/12", totalHits: 95 },
      { pos: 5, participant: "Zino", points: 152, played: 104, won: 69, lost: 35, exactHits: 8, goals: 14, groups: "8/12", totalHits: 99 },
      { pos: 6, participant: "Lautaro", points: 150, played: 100, won: 64, lost: 36, exactHits: 7, goals: 17, groups: "7/12", totalHits: 95 },
      { pos: 7, participant: "Javier", points: 150, played: 104, won: 66, lost: 38, exactHits: 6, goals: 12, groups: "5/12", totalHits: 89 },
      { pos: 8, participant: "Enzo", points: 147, played: 104, won: 65, lost: 39, exactHits: 11, goals: 14, groups: "7/12", totalHits: 97 },
      { pos: 9, participant: "Matías N...", points: 147, played: 104, won: 58, lost: 46, exactHits: 4, goals: 13, groups: "7/12", totalHits: 82 },
      { pos: 10, participant: "Tony", points: 142, played: 104, won: 66, lost: 38, exactHits: 9, goals: 14, groups: "5/12", totalHits: 94 },
      { pos: 11, participant: "Lautaro", points: 136, played: 104, won: 65, lost: 39, exactHits: 6, goals: 14, groups: "6/12", totalHits: 91 },
      { pos: 12, participant: "Andres", points: 135, played: 104, won: 62, lost: 42, exactHits: 5, goals: 9, groups: "8/12", totalHits: 84 },
      { pos: 13, participant: "Nahuel", points: 129, played: 104, won: 56, lost: 48, exactHits: 5, goals: 9, groups: "9/12", totalHits: 79, badge: "relegated", notes: "Descendido a B Nacional" },
      { pos: 14, participant: "Maxi", points: 124, played: 102, won: 64, lost: 38, exactHits: 6, goals: 13, groups: "3/12", totalHits: 86, badge: "relegated", notes: "Descendido a B Nacional" },
      { pos: 15, participant: "Fer", points: 118, played: 104, won: 55, lost: 49, exactHits: 3, goals: 11, groups: "6/12", totalHits: 75, badge: "relegated", notes: "Descendido a B Nacional" },
    ],
  },
  {
    id: "copa-chiqui-bauch",
    title: "Copa Chiqui Bauch",
    year: "2025",
    champion: "Gonza Fiss",
    description: "Edición mítica donde se consagró campeón Gonza Fiss.",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
  },
  {
    id: "copa-fiss",
    title: "Copa Fiss",
    year: "2024",
    champion: "Javi",
    description: "La edición inagural conquistada por Javi.",
    image: "/kahl-assets/campeon-javi.jpeg",
  },
];

export type AllTimeRecord = {
  participant: string;
  titles: number;
  trophies: string[];
};

export const allTimePalmares: AllTimeRecord[] = [
  { participant: "Gonza Fiss / Gonza el + Fachero.", titles: 2, trophies: ["Copa Chiqui Bauch", "Copa Kahl"] },
  { participant: "Javi / Javier", titles: 1, trophies: ["Copa Fiss"] },
];
