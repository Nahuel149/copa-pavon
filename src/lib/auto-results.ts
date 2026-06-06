import { matches } from "./matches";
import { getOutcome, validateResultStore, type MatchResult, type ResultStore } from "./prode";

const defaultSourceUrl = "https://worldcup26.ir/get/games";

type WorldCup26Game = {
  id?: unknown;
  home_score?: unknown;
  away_score?: unknown;
  finished?: unknown;
  time_elapsed?: unknown;
  type?: unknown;
};

export type SyncResultReport = {
  sourceUrl: string;
  imported: number;
  unchanged: number;
  skipped: number;
  checkedAt: string;
};

let lastAutoSyncAt = 0;
let autoSyncPromise: Promise<SyncResultReport> | null = null;

function parseScore(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function isFinishedGame(game: WorldCup26Game) {
  const finished = String(game.finished ?? "").trim().toLowerCase();
  const elapsed = String(game.time_elapsed ?? "").trim().toLowerCase();
  return finished === "true" || finished === "1" || elapsed === "finished" || elapsed === "completed";
}

function extractGames(payload: unknown): WorldCup26Game[] {
  if (Array.isArray(payload)) return payload as WorldCup26Game[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { games?: unknown }).games)) {
    return (payload as { games: WorldCup26Game[] }).games;
  }
  return [];
}

function mergeMatchResults(current: MatchResult[], imported: MatchResult[]) {
  const byMatch = new Map(current.map((result) => [result.matchId, result]));
  let changed = 0;
  let unchanged = 0;

  for (const result of imported) {
    const previous = byMatch.get(result.matchId);
    if (
      previous &&
      previous.homeGoals === result.homeGoals &&
      previous.awayGoals === result.awayGoals &&
      previous.outcome === result.outcome
    ) {
      unchanged += 1;
      continue;
    }
    byMatch.set(result.matchId, result);
    changed += 1;
  }

  return {
    changed,
    unchanged,
    results: matches
      .map((match) => byMatch.get(match.id))
      .filter((result): result is MatchResult => Boolean(result)),
  };
}

export async function syncGroupMatchResults(current: ResultStore) {
  const sourceUrl = process.env.PRODE_RESULTS_SYNC_URL ?? defaultSourceUrl;
  const response = await fetch(sourceUrl, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`La fuente de resultados respondio ${response.status}.`);
  }

  const payload = await response.json();
  const games = extractGames(payload);
  const imported: MatchResult[] = [];
  let skipped = 0;

  for (const game of games) {
    const sourceId = Number(game.id);
    const match = matches[sourceId - 1];
    if (!match || String(game.type ?? "group").toLowerCase() !== "group" || !isFinishedGame(game)) {
      skipped += 1;
      continue;
    }

    const homeGoals = parseScore(game.home_score);
    const awayGoals = parseScore(game.away_score);
    if (homeGoals === null || awayGoals === null || homeGoals > 30 || awayGoals > 30) {
      skipped += 1;
      continue;
    }

    imported.push({
      matchId: match.id,
      homeGoals,
      awayGoals,
      outcome: getOutcome(homeGoals, awayGoals),
    });
  }

  const merged = mergeMatchResults(current.matchResults, imported);
  const results = validateResultStore({
    ...current,
    matchResults: merged.results,
  });

  const report: SyncResultReport = {
    sourceUrl,
    imported: merged.changed,
    unchanged: merged.unchanged,
    skipped,
    checkedAt: new Date().toISOString(),
  };

  return { results, report };
}

export async function autoSyncGroupMatchResults(
  readCurrent: () => Promise<ResultStore>,
  saveResults: (results: ResultStore) => Promise<ResultStore>,
) {
  const cooldownMs = Number(process.env.PRODE_RESULTS_SYNC_COOLDOWN_MS ?? 15 * 60 * 1000);
  const now = Date.now();
  if (lastAutoSyncAt && now - lastAutoSyncAt < cooldownMs) return null;

  if (autoSyncPromise) return autoSyncPromise;

  autoSyncPromise = (async () => {
    const current = await readCurrent();
    const { results, report } = await syncGroupMatchResults(current);
    if (report.imported > 0) {
      await saveResults(results);
    }
    lastAutoSyncAt = Date.now();
    return report;
  })();

  try {
    return await autoSyncPromise;
  } finally {
    autoSyncPromise = null;
  }
}
