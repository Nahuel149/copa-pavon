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
    played?: number;
    won?: number;
    lost?: number;
    exactHits?: number;
    goals?: number;
    groups?: string;
    totalHits?: number;
    streak?: string;
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
    runnerUp: "Nicolas Montes",
    description: "Tabla oficial de posiciones de la Copa Kahl.",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
    table: [
      { pos: 1, participant: "Gonza el + Fachero.", points: 162, played: 104, won: 71, lost: 33, exactHits: 10, goals: 17, groups: "7/12", totalHits: 105, badge: "champion", notes: "CAMPEÓN" },
      { pos: 2, participant: "Nicolas Montes", points: 157, played: 104, won: 65, lost: 39, exactHits: 10, goals: 14, groups: "9/12", totalHits: 98, badge: "runner-up", notes: "Subcampeón" },
      { pos: 3, participant: "Miguel (El Borracho)", points: 157, played: 104, won: 72, lost: 32, exactHits: 6, goals: 15, groups: "9/12", totalHits: 102, badge: "podium", notes: "Tercer Puesto" },
      { pos: 4, participant: "Ale Bauch", points: 153, played: 104, won: 66, lost: 38, exactHits: 8, goals: 15, groups: "6/12", totalHits: 95 },
      { pos: 5, participant: "Zino", points: 152, played: 104, won: 69, lost: 35, exactHits: 8, goals: 14, groups: "8/12", totalHits: 99 },
      { pos: 6, participant: "Lautaro", points: 150, played: 100, won: 64, lost: 36, exactHits: 7, goals: 17, groups: "7/12", totalHits: 95 },
      { pos: 7, participant: "Javier", points: 150, played: 104, won: 66, lost: 38, exactHits: 6, goals: 12, groups: "5/12", totalHits: 89 },
      { pos: 8, participant: "Enzo", points: 147, played: 104, won: 65, lost: 39, exactHits: 11, goals: 14, groups: "7/12", totalHits: 97 },
      { pos: 9, participant: "Matías Nicolas", points: 147, played: 104, won: 58, lost: 46, exactHits: 4, goals: 13, groups: "7/12", totalHits: 82 },
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
    runnerUp: "Mono Andrés",
    description: "Tabla final del torneo y análisis oficial de los participantes.",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
    table: [
      {
        pos: 1,
        participant: "Gonza Fiss",
        points: 17,
        badge: "champion",
        notes: "El único que entendió el juego. Campeón, capitán y dueño absoluto del torneo. Levantó la copa con una mano y con la otra sostenía la pija del Fiss. Igual que no se agrande mucho porque ganó un prode, no la Libertadores.",
      },
      {
        pos: 2,
        participant: "Mono Andrés",
        points: 14,
        badge: "runner-up",
        notes: "Otra vez segundo, como hoy. Ya no es mala suerte, es identidad. Tiene cosas de mono, sí: instinto, fuerza y cero capacidad para cerrar una final. Subcampeón dos veces, el Boca del grupo.",
      },
      {
        pos: 3,
        participant: "Tony",
        points: 14,
        badge: "podium",
        notes: "La jugó calladito, sin hacer ruido, sin vender humo… y casi les roba el torneo a todos. Perfil bajo pero puñalero. No ganó porque le faltó un poquito de maldad y otro poquito de fútbol.",
      },
      {
        pos: 4,
        participant: "Maxi",
        points: 13,
        notes: "El peleador oficial del torneo. No sabemos si vino a jugar el prode o a cagarse a piñas con la tabla. Quedó cerca, pero como siempre: mucho huevo, poca precisión.",
      },
      {
        pos: 5,
        participant: "Ale Bauch",
        points: 13,
        notes: "Llegó agrandado, hablando como si ya tuviera la copa en la vitrina. Se veía campeón, se sentía campeón, se peinaba como campeón… (si tuviese pelo) y terminó mirando la vuelta olímpica por televisión. Humildad, Ale, humildad.",
      },
      {
        pos: 6,
        participant: "Nico",
        points: 11,
        notes: "Se metió por la ventana en los últimos partidos. Nadie sabe cómo llegó ahí, ni él mismo. Apareció al final como esos suplentes que entran al minuto 88 y piden patear el penal.",
      },
      {
        pos: 7,
        participant: "Fernando",
        points: 11,
        notes: "Árbitro de profesión, jugador de prode por accidente. Que se dedique a cobrar offside, porque para pronosticar fútbol viene complicado. Con el silbato capaz suma más que con los resultados.",
      },
      {
        pos: 8,
        participant: "Zino",
        points: 10,
        notes: "El hermano espiritual de Gonza, pero versión “me faltó actualizar el Excel”. Arrancó con ilusión y terminó haciendo cuentas para no quedar tan abajo. Buen intento, pero el apellido no gana solo.",
      },
      {
        pos: 9,
        participant: "Fer",
        points: 10,
        notes: "Fer es Fer. Un boludo querido, pero boludo al fin. Hizo 10 puntos, que es exactamente el número ideal para decir: “participé, rompí las bolas y me fui”.",
      },
      {
        pos: 10,
        participant: "Enzo",
        points: 10,
        notes: "Jugador de tierra brava, carácter fuerte, negro y pronósticos flojitos. Metió 10 puntos con más garra que claridad. Le puso presencia al torneo, pero la pelota y el prode todavía le piden documento.",
      },
      {
        pos: 11,
        participant: "Nahuel",
        points: 9,
        notes: "Previo subcampeón y uno de los mejores jugadores… pero esta vez vino en modo turista. Una campaña decepcionante para alguien que sabe jugar. Se esperaba pelea por la copa y terminó peleando con Miguel en la mitad de tabla.",
      },
      {
        pos: 12,
        participant: "Miguel",
        points: 9,
        notes: "El pecho frío del torneo. Iba primero hasta los cuartos y después se congeló como heladera sin luz. Tenía todo para salir campeón y decidió hacer cosplay de fracaso deportivo. Durísimo.",
      },
      {
        pos: 13,
        participant: "Javi",
        points: 6,
        badge: "relegated",
        notes: "El campeón anterior convertido en desastre nacional. Pasó de levantar la copa fiss a irse al descenso como equipo fundido, papelón histórico. Lo de Javi no fue una mala campaña: fue una investigación judicial.",
      },
      {
        pos: 14,
        participant: "Buda (Matías Nicolas)",
        points: 4,
        badge: "relegated",
        notes: "Buda, hermano, dejá el fútbol. Dedicate a los postres, a seguir comiendo tranquilo y a opinar desde la mesa dulce. Cuatro puntos es menos campaña que equipo desafiliado. El prode no es lo tuyo, pero el flan capaz sí.",
      },
    ],
  },
  {
    id: "copa-fiss",
    title: "Copa Fiss",
    year: "2024",
    champion: "Javi",
    runnerUp: "Nahuel",
    description: "La edición inaugural de la historia del prode, conquistada por Javier tras una ajustada definición.",
    image: "/kahl-assets/campeon-javi.jpeg",
    table: [
      { pos: 1, participant: "Javier", points: 42, streak: "3-2", badge: "champion", notes: "CAMPEÓN" },
      { pos: 2, participant: "Nahuel", points: 40, streak: "3-2", badge: "runner-up", notes: "Subcampeón" },
      { pos: 3, participant: "Ale Bauch", points: 36, streak: "3-2", badge: "podium", notes: "Tercer Puesto" },
      { pos: 4, participant: "Enzo", points: 36, streak: "3-2" },
      { pos: 5, participant: "Diego", points: 30, streak: "2-3" },
      { pos: 6, participant: "Andres", points: 26, streak: "3-2" },
      { pos: 7, participant: "Miguel", points: 24, streak: "3-2", badge: "relegated", notes: "Descendido a B Nacional" },
      { pos: 8, participant: "Gonza", points: 24, streak: "2-3", badge: "relegated", notes: "Descendido a B Nacional" },
    ],
  },
];

export type MedalDetail = {
  type: "gold" | "silver" | "bronze";
  title: string;
};

export type AllTimeRecord = {
  participant: string;
  gold: number;
  silver: number;
  bronze: number;
  medals: MedalDetail[];
};

export const allTimePalmares: AllTimeRecord[] = [
  {
    participant: "Gonza Fiss / Gonza el + Fachero.",
    gold: 2,
    silver: 0,
    bronze: 0,
    medals: [
      { type: "gold", title: "Copa Chiqui Bauch 2025" },
      { type: "gold", title: "Copa Kahl 2026" },
    ],
  },
  {
    participant: "Javi / Javier",
    gold: 1,
    silver: 0,
    bronze: 0,
    medals: [{ type: "gold", title: "Copa Fiss 2024" }],
  },
  {
    participant: "Nicolas Montes",
    gold: 0,
    silver: 1,
    bronze: 0,
    medals: [{ type: "silver", title: "Copa Kahl 2026" }],
  },
  {
    participant: "Mono Andrés",
    gold: 0,
    silver: 1,
    bronze: 0,
    medals: [{ type: "silver", title: "Copa Chiqui Bauch 2025" }],
  },
  {
    participant: "Nahuel",
    gold: 0,
    silver: 1,
    bronze: 0,
    medals: [{ type: "silver", title: "Copa Fiss 2024" }],
  },
  {
    participant: "Miguel (El Borracho)",
    gold: 0,
    silver: 0,
    bronze: 1,
    medals: [{ type: "bronze", title: "Copa Kahl 2026" }],
  },
  {
    participant: "Tony",
    gold: 0,
    silver: 0,
    bronze: 1,
    medals: [{ type: "bronze", title: "Copa Chiqui Bauch 2025" }],
  },
  {
    participant: "Ale Bauch",
    gold: 0,
    silver: 0,
    bronze: 1,
    medals: [{ type: "bronze", title: "Copa Fiss 2024" }],
  },
];
