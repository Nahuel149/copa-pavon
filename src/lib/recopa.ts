import { createPinHash, verifyPin } from "./pin";

export type RecopaParticipantId = "Gonza el + Fachero." | "Javier";

export type RecopaParticipant = {
  id: RecopaParticipantId;
  name: string;
  fullName: string;
  title: string;
  image: string;
  aliases: string[];
};

export const recopaParticipants: RecopaParticipant[] = [
  {
    id: "Gonza el + Fachero.",
    name: "Gonza el + Fachero.",
    fullName: "Gonza el + Fachero.",
    title: "Campeón Copa Chiqui Bauch",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
    aliases: ["gonza el + fachero.", "gonza el + fachero", "gonza", "gonza fiss", "gonzalo", "gonzalo fiss"],
  },
  {
    id: "Javier",
    name: "Javier",
    fullName: "Javier",
    title: "Campeón Copa Fiss",
    image: "/kahl-assets/campeon-javi.jpeg",
    aliases: ["javier", "javi"],
  },
];

export type RecopaMatch = {
  id: string;
  order: number;
  dateLabel: string;
  kickoffTime: string;
  home: string;
  away: string;
};

export const recopaMatches: RecopaMatch[] = [
  {
    id: "recopa-1",
    order: 1,
    dateLabel: "08/08",
    kickoffTime: "14:45",
    home: "Atlético Tucumán",
    away: "Sarmiento Junín",
  },
  {
    id: "recopa-2",
    order: 2,
    dateLabel: "08/08",
    kickoffTime: "14:45",
    home: "Deportivo Riestra",
    away: "Estudiantes de La Plata",
  },
  {
    id: "recopa-3",
    order: 3,
    dateLabel: "08/08",
    kickoffTime: "17:00",
    home: "Tigre",
    away: "River Plate",
  },
  {
    id: "recopa-4",
    order: 4,
    dateLabel: "08/08",
    kickoffTime: "19:15",
    home: "Boca Juniors",
    away: "Vélez Sarsfield",
  },
  {
    id: "recopa-5",
    order: 5,
    dateLabel: "08/08",
    kickoffTime: "21:30",
    home: "Independiente",
    away: "Platense",
  },
  {
    id: "recopa-6",
    order: 6,
    dateLabel: "08/08",
    kickoffTime: "21:30",
    home: "Instituto",
    away: "Gimnasia de Mendoza",
  },
];

export type RecopaScorePrediction = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
};

export type RecopaSubmission = {
  participant: RecopaParticipantId;
  pinHash?: string;
  updatedAt: string;
  predictions: RecopaScorePrediction[];
};

export type RecopaMatchResult = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
};

export type RecopaStore = {
  submissions: RecopaSubmission[];
  results: RecopaMatchResult[];
};

export function canonicalRecopaParticipant(input: string): RecopaParticipantId | null {
  const clean = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const p of recopaParticipants) {
    if (p.aliases.some((alias) => alias.toLowerCase() === clean)) {
      return p.id;
    }
  }
  return null;
}

export type RecopaVerdict = "exact" | "winner" | "miss";

export function getOutcome(homeGoals: number, awayGoals: number): "home" | "away" | "draw" {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

export function scoreRecopaPrediction(
  prediction: RecopaScorePrediction | undefined,
  result: RecopaMatchResult | undefined,
): { points: number; verdict: RecopaVerdict } {
  if (!prediction || !result) {
    return { points: 0, verdict: "miss" };
  }

  const exact = prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals;
  if (exact) {
    return { points: 3, verdict: "exact" };
  }

  const predOutcome = getOutcome(prediction.homeGoals, prediction.awayGoals);
  const resOutcome = getOutcome(result.homeGoals, result.awayGoals);

  if (predOutcome === resOutcome) {
    return { points: 1, verdict: "winner" };
  }

  return { points: 0, verdict: "miss" };
}

export type RecopaStanding = {
  participant: RecopaParticipant;
  submission?: RecopaSubmission;
  totalPoints: number;
  exactHits: number;
  winnerHits: number;
  matchesPlayed: number;
  matchBreakdown: Record<
    string,
    {
      prediction?: RecopaScorePrediction;
      result?: RecopaMatchResult;
      points: number;
      verdict: RecopaVerdict;
    }
  >;
};

export function buildRecopaStandings(store: RecopaStore): RecopaStanding[] {
  const resultsMap = new Map(store.results.map((r) => [r.matchId, r]));

  return recopaParticipants.map((participant) => {
    const submission = store.submissions.find((s) => s.participant === participant.id);
    const predictionsMap = new Map((submission?.predictions ?? []).map((p) => [p.matchId, p]));

    let totalPoints = 0;
    let exactHits = 0;
    let winnerHits = 0;
    let matchesPlayed = 0;

    const matchBreakdown: RecopaStanding["matchBreakdown"] = {};

    for (const match of recopaMatches) {
      const pred = predictionsMap.get(match.id);
      const res = resultsMap.get(match.id);

      const { points, verdict } = scoreRecopaPrediction(pred, res);

      if (res) {
        matchesPlayed += 1;
        totalPoints += points;
        if (verdict === "exact") exactHits += 1;
        if (verdict === "winner") winnerHits += 1;
      }

      matchBreakdown[match.id] = {
        prediction: pred,
        result: res,
        points,
        verdict,
      };
    }

    return {
      participant,
      submission,
      totalPoints,
      exactHits,
      winnerHits,
      matchesPlayed,
      matchBreakdown,
    };
  });
}
