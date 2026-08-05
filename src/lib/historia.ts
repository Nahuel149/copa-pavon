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
  { participant: "Gonza Fiss / Gonza el + Fachero.", titles: 2, trophies: ["Copa Chiqui Bauch", "Copa Kahl 2026"] },
  { participant: "Javi / Javier", titles: 1, trophies: ["Copa Fiss"] },
];
