import { matches } from "./matches";
import {
  getOutcome,
  normalizeName,
  parseScorerEvents,
  parseScorerNames,
  validateResultStore,
  type KnockoutResult,
  type MatchResult,
  type ResultStore,
} from "./prode";

const defaultSourceUrl = "https://worldcup26.ir/get/games";

type WorldCup26Game = {
  id?: unknown;
  home_team_name_en?: unknown;
  away_team_name_en?: unknown;
  home_score?: unknown;
  away_score?: unknown;
  home_scorers?: unknown;
  away_scorers?: unknown;
  finished?: unknown;
  time_elapsed?: unknown;
  type?: unknown;
};

export type SyncResultReport = {
  sourceUrl: string;
  sourceUrls: string[];
  imported: number;
  added: number;
  corrected: number;
  unchanged: number;
  protected: number;
  skipped: number;
  checkedAt: string;
  conflicts: SyncResultConflict[];
};

export type SyncResultConflict = {
  kind: "group" | "knockout";
  id: string;
  label: string;
  manualScore: string;
  apiScore: string;
};

let lastAutoSyncAt = 0;
let autoSyncPromise: Promise<SyncResultReport> | null = null;

function getSourceUrls() {
  const configured = [
    ...(process.env.PRODE_RESULTS_SYNC_URLS ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean),
    ...(process.env.PRODE_RESULTS_SYNC_URL ? [process.env.PRODE_RESULTS_SYNC_URL] : []),
  ];
  return Array.from(new Set(configured.length > 0 ? configured : [defaultSourceUrl]));
}

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
  let added = 0;
  let corrected = 0;
  let unchanged = 0;
  let protectedCount = 0;
  const conflicts: SyncResultConflict[] = [];

  for (const result of imported) {
    const previous = byMatch.get(result.matchId);
    const previousScorers = JSON.stringify(previous?.goalScorers ?? []);
    const nextScorers = JSON.stringify(result.goalScorers ?? []);
    if (
      previous &&
      previous.homeGoals === result.homeGoals &&
      previous.awayGoals === result.awayGoals &&
      previous.outcome === result.outcome &&
      previousScorers === nextScorers
    ) {
      unchanged += 1;
      continue;
    }
    if (previous?.source === "manual") {
      if (previous.homeGoals !== result.homeGoals || previous.awayGoals !== result.awayGoals) {
        const match = matches.find((item) => item.id === result.matchId);
        conflicts.push({
          kind: "group",
          id: result.matchId,
          label: match ? `${match.home} vs. ${match.away}` : result.matchId,
          manualScore: `${previous.homeGoals}-${previous.awayGoals}`,
          apiScore: `${result.homeGoals}-${result.awayGoals}`,
        });
        protectedCount += 1;
        continue;
      }
      if (!previous.goalScorers?.length && result.goalScorers?.length) {
        byMatch.set(result.matchId, { ...previous, goalScorers: result.goalScorers });
        changed += 1;
        corrected += 1;
      } else {
        unchanged += 1;
      }
      continue;
    }
    if (
      previous &&
      previous.homeGoals === result.homeGoals &&
      previous.awayGoals === result.awayGoals &&
      previous.outcome === result.outcome
    ) {
      byMatch.set(result.matchId, {
        ...previous,
        ...(result.goalScorers?.length ? { goalScorers: result.goalScorers } : {}),
      });
      changed += 1;
      corrected += 1;
      continue;
    }
    byMatch.set(result.matchId, {
      ...result,
      ...(previous?.highlightUrl ? { highlightUrl: previous.highlightUrl } : {}),
      ...(previous?.goalScorers?.length && !result.goalScorers?.length ? { goalScorers: previous.goalScorers } : {}),
    });
    changed += 1;
    if (previous) corrected += 1;
    else added += 1;
  }

  return {
    changed,
    added,
    corrected,
    unchanged,
    protected: protectedCount,
    conflicts,
    results: matches
      .map((match) => byMatch.get(match.id))
      .filter((result): result is MatchResult => Boolean(result)),
  };
}

function normalizeTeamName(value: unknown) {
  return normalizeName(String(value ?? ""))
    .replace(/&/g, "and")
    .replace(/\busa\b/g, "united states")
    .replace(/\s+/g, " ")
    .trim();
}

function sameTeams(a: unknown, b: unknown) {
  const left = normalizeTeamName(a);
  const right = normalizeTeamName(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function mergeKnockoutResults(current: KnockoutResult[], imported: KnockoutResult[]) {
  const byFixture = new Map(current.map((result) => [result.fixtureId, result]));
  let changed = 0;
  let added = 0;
  let corrected = 0;
  let unchanged = 0;
  let protectedCount = 0;
  const conflicts: SyncResultConflict[] = [];

  for (const result of imported) {
    const previous = byFixture.get(result.fixtureId);
    const previousScorers = (previous?.scorerNames ?? []).join("|");
    const nextScorers = (result.scorerNames ?? []).join("|");
    if (
      previous &&
      previous.homeGoals === result.homeGoals &&
      previous.awayGoals === result.awayGoals &&
      previousScorers === nextScorers
    ) {
      unchanged += 1;
      continue;
    }
    if (previous?.source === "manual") {
      if (previous.homeGoals !== result.homeGoals || previous.awayGoals !== result.awayGoals) {
        conflicts.push({
          kind: "knockout",
          id: result.fixtureId,
          label: result.fixtureId,
          manualScore: `${previous.homeGoals}-${previous.awayGoals}`,
          apiScore: `${result.homeGoals}-${result.awayGoals}`,
        });
        protectedCount += 1;
      } else {
        unchanged += 1;
      }
      continue;
    }
    byFixture.set(result.fixtureId, result);
    changed += 1;
    if (previous) corrected += 1;
    else added += 1;
  }

  return {
    changed,
    added,
    corrected,
    unchanged,
    protected: protectedCount,
    conflicts,
    results: current
      .map((result) => byFixture.get(result.fixtureId))
      .filter((result): result is KnockoutResult => Boolean(result))
      .concat(imported.filter((result) => !current.some((existing) => existing.fixtureId === result.fixtureId))),
  };
}

export async function syncGroupMatchResults(current: ResultStore) {
  const sourceUrls = getSourceUrls();
  const importedByMatch = new Map<string, MatchResult>();
  const importedKnockoutByFixture = new Map<string, KnockoutResult>();
  let skipped = 0;
  let successfulSources = 0;

  for (const sourceUrl of sourceUrls) {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      continue;
    }

    successfulSources += 1;
    const payload = await response.json();
    const games = extractGames(payload);

    for (const game of games) {
      const sourceId = Number(game.id);
      const match = matches[sourceId - 1];
      const gameType = String(game.type ?? "group").toLowerCase();
      if (!isFinishedGame(game)) {
        skipped += 1;
        continue;
      }

      const homeGoals = parseScore(game.home_score);
      const awayGoals = parseScore(game.away_score);
      if (homeGoals === null || awayGoals === null || homeGoals > 30 || awayGoals > 30) {
        skipped += 1;
        continue;
      }

      if (gameType === "group" && match) {
        if (!importedByMatch.has(match.id)) {
          importedByMatch.set(match.id, {
            matchId: match.id,
            homeGoals,
            awayGoals,
            outcome: getOutcome(homeGoals, awayGoals),
            goalScorers: [...parseScorerEvents(game.home_scorers, "home"), ...parseScorerEvents(game.away_scorers, "away")],
            source: "api",
          });
        }
        continue;
      }

      const fixture = current.knockoutFixtures.find(
        (item) =>
          sameTeams(item.home, game.home_team_name_en) &&
          sameTeams(item.away, game.away_team_name_en),
      );
      if (!fixture) {
        skipped += 1;
        continue;
      }
      if (!importedKnockoutByFixture.has(fixture.id)) {
        importedKnockoutByFixture.set(fixture.id, {
          fixtureId: fixture.id,
          homeGoals,
          awayGoals,
          scorerNames: [...parseScorerNames(game.home_scorers), ...parseScorerNames(game.away_scorers)],
          source: "api",
        });
      }
    }
  }

  if (successfulSources === 0) {
    throw new Error("No se pudo leer ninguna fuente de resultados.");
  }

  const merged = mergeMatchResults(current.matchResults, Array.from(importedByMatch.values()));
  const mergedKnockout = mergeKnockoutResults(current.knockoutResults, Array.from(importedKnockoutByFixture.values()));
  const results = validateResultStore({
    ...current,
    matchResults: merged.results,
    knockoutResults: mergedKnockout.results,
  });

  const report: SyncResultReport = {
    sourceUrl: sourceUrls.join(", "),
    sourceUrls,
    imported: merged.changed + mergedKnockout.changed,
    added: merged.added + mergedKnockout.added,
    corrected: merged.corrected + mergedKnockout.corrected,
    unchanged: merged.unchanged + mergedKnockout.unchanged,
    protected: merged.protected + mergedKnockout.protected,
    skipped,
    checkedAt: new Date().toISOString(),
    conflicts: [...merged.conflicts, ...mergedKnockout.conflicts],
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
