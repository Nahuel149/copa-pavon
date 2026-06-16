import {
  groupMap,
  groups,
  matches,
  matchMap,
  knockoutStageScoring,
  knockoutStages,
  type GroupId,
  type KnockoutFixture,
  type KnockoutStage,
} from "./matches";

export type PredictionChoice = "home" | "draw" | "away";

export type ChoicePrediction = {
  matchId: string;
  type: "choice";
  choice: PredictionChoice;
};

export type ScorePrediction = {
  matchId: string;
  type: "score";
  homeGoals: number;
  awayGoals: number;
  outcome: PredictionChoice;
};

export type Prediction = ChoicePrediction | ScorePrediction;

export type GroupPrediction = {
  groupId: GroupId;
  first: string;
  second: string;
};

export type KnockoutPrediction = {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  goalScorer?: string;
};

export type ClanId = "river-plate" | "la-batata";

export const defaultClan: ClanId = "river-plate";

export const clans: Array<{ id: ClanId; name: string; hint: string }> = [
  {
    id: "river-plate",
    name: "River Plate",
    hint: "Clan por defecto",
  },
  {
    id: "la-batata",
    name: "La Batata",
    hint: "Seleccionar solo si jugás con ese grupo",
  },
];

export type Submission = {
  id: string;
  name: string;
  normalizedName: string;
  clan: ClanId;
  pinHash?: string;
  createdAt: string;
  updatedAt?: string;
  predictions: Prediction[];
  groupPredictions: GroupPrediction[];
  knockoutPredictions: KnockoutPrediction[];
};

export type SubmissionStore = {
  submissions: Submission[];
};

export type AppSettings = {
  submissionsOpen: boolean;
  updatedAt?: string;
};

export type MatchResult = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  outcome: PredictionChoice;
  highlightUrl?: string;
  source?: "api" | "manual";
};

export type GroupResult = {
  groupId: GroupId;
  first: string;
  second: string;
};

export type KnockoutResult = {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  scorerNames?: string[];
  source?: "api" | "manual";
};

export type ManualPointAdjustment = {
  normalizedName: string;
  name?: string;
  points: number;
  reason?: string;
};

export type ResultStore = {
  matchResults: MatchResult[];
  groupResults: GroupResult[];
  knockoutFixtures: KnockoutFixture[];
  knockoutResults: KnockoutResult[];
  manualAdjustments?: ManualPointAdjustment[];
};

export type StandingRow = {
  submissionId: string;
  name: string;
  clan: ClanId;
  totalPoints: number;
  matchPoints: number;
  groupPoints: number;
  knockoutPoints: number;
  exactHits: number;
  winnerHits: number;
  groupHits: number;
  knockoutExactHits: number;
  knockoutWinnerHits: number;
  knockoutScorerHits: number;
  manualAdjustmentPoints: number;
  playedMatches: number;
  decidedGroups: number;
  playedKnockoutMatches: number;
  predictionMatchesPlayed: number;
  predictionWins: number;
  predictionLosses: number;
};

type RawPrediction = {
  matchId?: unknown;
  type?: unknown;
  choice?: unknown;
  homeGoals?: unknown;
  awayGoals?: unknown;
};

type RawGroupPrediction = {
  groupId?: unknown;
  first?: unknown;
  second?: unknown;
};

type RawKnockoutPrediction = {
  fixtureId?: unknown;
  homeGoals?: unknown;
  awayGoals?: unknown;
  goalScorer?: unknown;
};

export type RawSubmission = {
  name?: unknown;
  clan?: unknown;
  predictions?: unknown;
  groupPredictions?: unknown;
};

export type RawKnockoutSubmission = {
  name?: unknown;
  predictions?: unknown;
};

export type ValidationResult =
  | {
      ok: true;
      name: string;
      normalizedName: string;
      clan: ClanId;
      predictions: Prediction[];
      groupPredictions: GroupPrediction[];
    }
  | { ok: false; errors: string[] };

export type KnockoutValidationResult =
  | { ok: true; name: string; normalizedName: string; predictions: KnockoutPrediction[] }
  | { ok: false; errors: string[] };

export function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeScorerName(value: string) {
  return normalizeName(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b\d{1,3}(?:\s*\+\s*\d{1,2})?\b/g, " ")
    .replace(/\bog\b|\bpen\b|\bp\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseScorerNames(value: unknown) {
  if (typeof value !== "string") return [];
  const raw = value.trim();
  if (!raw || raw.toLowerCase() === "null") return [];

  return raw
    .replace(/[{}"“”]/g, "")
    .split(",")
    .map((item) =>
      item
        .replace(/\d{1,3}'(?:\+\d{1,2}')?/g, "")
        .replace(/\((?:OG|P|Pen)\)/gi, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitutionCost);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

function scorerNameMatches(prediction: string | undefined, officialScorers: string[] | undefined) {
  const predicted = normalizeScorerName(prediction ?? "");
  if (predicted.length < 3 || !officialScorers?.length) return false;

  const predictedTokens = predicted.split(" ").filter(Boolean);
  const predictedLast = predictedTokens.at(-1) ?? predicted;
  const predictedFirst = predictedTokens[0] ?? "";

  return officialScorers.some((official) => {
    const normalizedOfficial = normalizeScorerName(official);
    if (!normalizedOfficial) return false;
    if (normalizedOfficial.includes(predicted) || predicted.includes(normalizedOfficial)) return true;

    const officialTokens = normalizedOfficial.split(" ").filter(Boolean);
    const officialLast = officialTokens.at(-1) ?? normalizedOfficial;
    const officialFirst = officialTokens[0] ?? "";

    const lastNameDistance = levenshteinDistance(predictedLast, officialLast);
    const firstNameCompatible =
      predictedTokens.length === 1 ||
      !predictedFirst ||
      !officialFirst ||
      predictedFirst[0] === officialFirst[0] ||
      levenshteinDistance(predictedFirst, officialFirst) <= 2;
    if (lastNameDistance <= 2 && firstNameCompatible) return true;

    const fullDistance = levenshteinDistance(predicted, normalizedOfficial);
    return fullDistance <= Math.max(2, Math.floor(Math.max(predicted.length, normalizedOfficial.length) * 0.25));
  });
}

function knockoutScorerBonusMatches(prediction: KnockoutPrediction, result: KnockoutResult) {
  if (!normalizeScorerName(prediction.goalScorer ?? "")) {
    return result.homeGoals === 0 && result.awayGoals === 0 && !result.scorerNames?.length;
  }

  return scorerNameMatches(prediction.goalScorer, result.scorerNames);
}

export function getOutcome(homeGoals: number, awayGoals: number): PredictionChoice {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

export function choiceLabel(choice: PredictionChoice, home: string, away: string) {
  if (choice === "home") return home;
  if (choice === "away") return away;
  return "Empate";
}

export function parseClan(value: unknown): ClanId {
  return clans.some((clan) => clan.id === value) ? (value as ClanId) : defaultClan;
}

export function clanLabel(clanId: ClanId) {
  return clans.find((clan) => clan.id === clanId)?.name ?? "River Plate";
}

function parseGoal(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isGroupId(value: unknown): value is GroupId {
  return typeof value === "string" && groupMap.has(value as GroupId);
}

function isKnockoutStage(value: unknown): value is KnockoutStage {
  return typeof value === "string" && knockoutStages.includes(value as KnockoutStage);
}

function parseTeam(groupId: GroupId, value: unknown) {
  if (typeof value !== "string") return "";
  const group = groupMap.get(groupId);
  return group?.teams.includes(value) ? value : "";
}

export function validateSubmission(
  payload: RawSubmission,
  options: { excludedMatchIds?: Iterable<string> } = {},
): ValidationResult {
  const errors: string[] = [];
  const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ") : "";
  const normalizedName = normalizeName(name);
  const clan = parseClan(payload.clan);
  const excludedMatchIds = new Set(options.excludedMatchIds ?? []);

  if (name.length < 2) errors.push("Ingresá un nombre de al menos 2 caracteres.");
  if (name.length > 80) errors.push("El nombre no puede superar 80 caracteres.");

  if (!Array.isArray(payload.predictions)) {
    return { ok: false, errors: [...errors, "Faltan los pronósticos de partidos."] };
  }

  if (!Array.isArray(payload.groupPredictions)) {
    return { ok: false, errors: [...errors, "Faltan los pronósticos de grupos."] };
  }

  const rawByMatch = new Map<string, RawPrediction>();
  for (const item of payload.predictions as RawPrediction[]) {
    if (!item || typeof item !== "object" || typeof item.matchId !== "string") {
      errors.push("Hay un pronóstico de partido con formato inválido.");
      continue;
    }
    if (rawByMatch.has(item.matchId)) {
      errors.push(`El partido ${item.matchId} está repetido.`);
      continue;
    }
    rawByMatch.set(item.matchId, item);
  }

  const predictions: Prediction[] = [];
  for (const match of matches) {
    if (excludedMatchIds.has(match.id)) continue;

    const raw = rawByMatch.get(match.id);
    if (!raw) {
      errors.push(`Falta ${match.home} vs. ${match.away}.`);
      continue;
    }

    if (match.exactScore) {
      const homeGoals = parseGoal(raw.homeGoals);
      const awayGoals = parseGoal(raw.awayGoals);
      if (homeGoals === null || awayGoals === null) {
        errors.push(`Cargá el marcador exacto de ${match.home} vs. ${match.away}.`);
        continue;
      }
      if (homeGoals < 0 || awayGoals < 0 || homeGoals > 30 || awayGoals > 30) {
        errors.push(`El resultado de ${match.home} vs. ${match.away} tiene que estar entre 0 y 30.`);
        continue;
      }

      predictions.push({
        matchId: match.id,
        type: "score",
        homeGoals,
        awayGoals,
        outcome: getOutcome(homeGoals, awayGoals),
      });
      continue;
    }

    if (raw.choice !== "home" && raw.choice !== "draw" && raw.choice !== "away") {
      errors.push(`Elegí ganador, empate o perdedor para ${match.home} vs. ${match.away}.`);
      continue;
    }

    predictions.push({
      matchId: match.id,
      type: "choice",
      choice: raw.choice,
    });
  }

  for (const matchId of rawByMatch.keys()) {
    if (!matchMap.has(matchId)) errors.push(`El partido ${matchId} no existe.`);
  }

  const rawGroups = new Map<GroupId, RawGroupPrediction>();
  for (const item of payload.groupPredictions as RawGroupPrediction[]) {
    if (!item || typeof item !== "object" || !isGroupId(item.groupId)) {
      errors.push("Hay un pronóstico de grupo con formato inválido.");
      continue;
    }
    if (rawGroups.has(item.groupId)) {
      errors.push(`El grupo ${item.groupId} está repetido.`);
      continue;
    }
    rawGroups.set(item.groupId, item);
  }

  const groupPredictions: GroupPrediction[] = [];
  for (const group of groups) {
    const raw = rawGroups.get(group.id);
    if (!raw) {
      errors.push(`Falta el top 2 del Grupo ${group.id}.`);
      continue;
    }

    const first = parseTeam(group.id, raw.first);
    const second = parseTeam(group.id, raw.second);
    if (!first || !second) {
      errors.push(`Elegí 1º y 2º del Grupo ${group.id}.`);
      continue;
    }
    if (first === second) {
      errors.push(`El Grupo ${group.id} necesita dos equipos distintos.`);
      continue;
    }

    groupPredictions.push({ groupId: group.id, first, second });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, name, normalizedName, clan, predictions, groupPredictions };
}

export function validateKnockoutSubmission(
  payload: RawKnockoutSubmission,
  fixtures: KnockoutFixture[],
  options: { excludedFixtureIds?: Iterable<string> } = {},
): KnockoutValidationResult {
  const errors: string[] = [];
  const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ") : "";
  const normalizedName = normalizeName(name);
  const excludedFixtureIds = new Set(options.excludedFixtureIds ?? []);
  const requiredFixtures = fixtures.filter((fixture) => !excludedFixtureIds.has(fixture.id));

  if (name.length < 2) errors.push("Ingresá un nombre de al menos 2 caracteres.");
  if (fixtures.length === 0) errors.push("Todavía no hay cruces eliminatorios cargados.");
  if (!Array.isArray(payload.predictions)) {
    return { ok: false, errors: [...errors, "Faltan los pronósticos de eliminatorias."] };
  }

  const rawByFixture = new Map<string, RawKnockoutPrediction>();
  for (const item of payload.predictions as RawKnockoutPrediction[]) {
    if (!item || typeof item !== "object" || typeof item.fixtureId !== "string") {
      errors.push("Hay un pronóstico de eliminatoria con formato inválido.");
      continue;
    }
    if (rawByFixture.has(item.fixtureId)) {
      errors.push(`El cruce ${item.fixtureId} está repetido.`);
      continue;
    }
    rawByFixture.set(item.fixtureId, item);
  }

  const predictions: KnockoutPrediction[] = [];
  for (const fixture of requiredFixtures) {
    const raw = rawByFixture.get(fixture.id);
    if (!raw) {
      errors.push(`Falta ${fixture.home} vs. ${fixture.away}.`);
      continue;
    }
    const homeGoals = parseGoal(raw.homeGoals);
    const awayGoals = parseGoal(raw.awayGoals);
    if (homeGoals === null || awayGoals === null) {
      errors.push(`Cargá el marcador exacto de ${fixture.home} vs. ${fixture.away}.`);
      continue;
    }
    if (homeGoals < 0 || awayGoals < 0 || homeGoals > 30 || awayGoals > 30) {
      errors.push(`El resultado de ${fixture.home} vs. ${fixture.away} tiene que estar entre 0 y 30.`);
      continue;
    }
    const goalScorer = typeof raw.goalScorer === "string" ? raw.goalScorer.trim().replace(/\s+/g, " ") : "";
    predictions.push({ fixtureId: fixture.id, homeGoals, awayGoals, ...(goalScorer ? { goalScorer } : {}) });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, name, normalizedName, predictions };
}

export function validateResultStore(payload: unknown): ResultStore {
  const source = payload && typeof payload === "object" ? (payload as Partial<ResultStore>) : {};
  const matchResults: MatchResult[] = [];
  const groupResults: GroupResult[] = [];
  const knockoutFixtures: KnockoutFixture[] = [];
  const knockoutResults: KnockoutResult[] = [];
  const manualAdjustments: ManualPointAdjustment[] = [];

  for (const raw of Array.isArray(source.matchResults) ? source.matchResults : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<MatchResult>;
    if (typeof item.matchId !== "string" || !matchMap.has(item.matchId)) continue;
    const homeGoals = parseGoal(item.homeGoals);
    const awayGoals = parseGoal(item.awayGoals);
    if (homeGoals === null || awayGoals === null || homeGoals < 0 || awayGoals < 0 || homeGoals > 30 || awayGoals > 30) {
      continue;
    }
    matchResults.push({
      matchId: item.matchId,
      homeGoals,
      awayGoals,
      outcome: getOutcome(homeGoals, awayGoals),
      ...(typeof item.highlightUrl === "string" && isSafeHttpUrl(item.highlightUrl) ? { highlightUrl: item.highlightUrl.trim() } : {}),
      ...(item.source === "manual" || item.source === "api" ? { source: item.source } : {}),
    });
  }

  const seenGroups = new Set<GroupId>();
  for (const raw of Array.isArray(source.groupResults) ? source.groupResults : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<GroupResult>;
    if (!isGroupId(item.groupId) || seenGroups.has(item.groupId)) continue;
    const first = parseTeam(item.groupId, item.first);
    const second = parseTeam(item.groupId, item.second);
    if (!first || !second || first === second) continue;
    seenGroups.add(item.groupId);
    groupResults.push({ groupId: item.groupId, first, second });
  }

  const fixtureById = new Map<string, KnockoutFixture>();
  for (const raw of Array.isArray(source.knockoutFixtures) ? source.knockoutFixtures : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<KnockoutFixture>;
    if (typeof item.id !== "string" || !item.id.trim() || fixtureById.has(item.id)) continue;
    if (!isKnockoutStage(item.stage)) continue;
    if (typeof item.home !== "string" || typeof item.away !== "string") continue;
    const home = item.home.trim().replace(/\s+/g, " ");
    const away = item.away.trim().replace(/\s+/g, " ");
    if (home.length < 2 || away.length < 2 || home === away) continue;
    const fixture: KnockoutFixture = {
      id: item.id,
      order: Number.isInteger(item.order) && Number(item.order) > 0 ? Number(item.order) : knockoutFixtures.length + 1,
      stage: item.stage,
      home,
      away,
      ...(typeof item.kickoffAt === "string" && !Number.isNaN(new Date(item.kickoffAt).getTime()) ? { kickoffAt: item.kickoffAt } : {}),
    };
    fixtureById.set(fixture.id, fixture);
    knockoutFixtures.push(fixture);
  }

  for (const raw of Array.isArray(source.knockoutResults) ? source.knockoutResults : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<KnockoutResult>;
    if (typeof item.fixtureId !== "string" || !fixtureById.has(item.fixtureId)) continue;
    const homeGoals = parseGoal(item.homeGoals);
    const awayGoals = parseGoal(item.awayGoals);
    if (homeGoals === null || awayGoals === null || homeGoals < 0 || awayGoals < 0 || homeGoals > 30 || awayGoals > 30) {
      continue;
    }
    const scorerNames = Array.isArray(item.scorerNames)
      ? item.scorerNames.filter((scorer): scorer is string => typeof scorer === "string" && scorer.trim().length > 0)
      : parseScorerNames((item as Partial<KnockoutResult> & { scorers?: unknown }).scorers);
    knockoutResults.push({
      fixtureId: item.fixtureId,
      homeGoals,
      awayGoals,
      ...(scorerNames.length > 0 ? { scorerNames } : {}),
      ...(item.source === "manual" || item.source === "api" ? { source: item.source } : {}),
    });
  }

  for (const raw of Array.isArray(source.manualAdjustments) ? source.manualAdjustments : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<ManualPointAdjustment>;
    const normalizedName =
      typeof item.normalizedName === "string" ? normalizeName(item.normalizedName) : typeof item.name === "string" ? normalizeName(item.name) : "";
    const points = typeof item.points === "number" && Number.isFinite(item.points) ? Math.trunc(item.points) : null;
    if (!normalizedName || points === null || points === 0) continue;
    manualAdjustments.push({
      normalizedName,
      points,
      ...(typeof item.name === "string" && item.name.trim() ? { name: item.name.trim().replace(/\s+/g, " ") } : {}),
      ...(typeof item.reason === "string" && item.reason.trim() ? { reason: item.reason.trim().replace(/\s+/g, " ") } : {}),
    });
  }

  return { matchResults, groupResults, knockoutFixtures, knockoutResults, manualAdjustments };
}

export function countCompletePredictions(predictions: Record<string, unknown>) {
  return matches.reduce((total, match) => {
    const value = predictions[match.id];
    if (!value || typeof value !== "object") return total;
    if (match.exactScore) {
      const exact = value as { homeGoals?: string; awayGoals?: string };
      return exact.homeGoals !== "" && exact.awayGoals !== "" ? total + 1 : total;
    }
    const choice = (value as { choice?: string }).choice;
    return choice === "home" || choice === "draw" || choice === "away" ? total + 1 : total;
  }, 0);
}

export function countCompleteGroupPredictions(groupPredictions: Record<string, { first: string; second: string }>) {
  return groups.reduce((total, group) => {
    const value = groupPredictions[group.id];
    return value?.first && value?.second && value.first !== value.second ? total + 1 : total;
  }, 0);
}

export function countCompleteKnockoutPredictions(
  predictions: Record<string, { homeGoals: string; awayGoals: string }>,
  fixtures: KnockoutFixture[],
) {
  return fixtures.reduce((total, fixture) => {
    const value = predictions[fixture.id];
    return value && value.homeGoals !== "" && value.awayGoals !== "" ? total + 1 : total;
  }, 0);
}

export function serializePrediction(prediction: Prediction) {
  const match = matchMap.get(prediction.matchId);
  if (!match) return "";
  if (prediction.type === "score") {
    return `${prediction.homeGoals}-${prediction.awayGoals}`;
  }
  return choiceLabel(prediction.choice, match.home, match.away);
}

export function serializeKnockoutPrediction(prediction: KnockoutPrediction) {
  return `${prediction.homeGoals}-${prediction.awayGoals}${prediction.goalScorer ? ` · ${prediction.goalScorer}` : ""}`;
}

export function scoreSubmission(submission: Submission, results: ResultStore): StandingRow {
  const resultByMatch = new Map(results.matchResults.map((result) => [result.matchId, result]));
  const resultByGroup = new Map(results.groupResults.map((result) => [result.groupId, result]));
  const knockoutResultByFixture = new Map(results.knockoutResults.map((result) => [result.fixtureId, result]));
  const knockoutFixtureById = new Map(results.knockoutFixtures.map((fixture) => [fixture.id, fixture]));
  let matchPoints = 0;
  let groupPoints = 0;
  let knockoutPoints = 0;
  let exactHits = 0;
  let winnerHits = 0;
  let groupHits = 0;
  let knockoutExactHits = 0;
  let knockoutWinnerHits = 0;
  let knockoutScorerHits = 0;
  let playedMatchPredictions = 0;
  let playedKnockoutPredictions = 0;
  const manualAdjustmentPoints = (results.manualAdjustments ?? [])
    .filter((adjustment) => adjustment.normalizedName === submission.normalizedName)
    .reduce((total, adjustment) => total + adjustment.points, 0);

  for (const prediction of submission.predictions) {
    const result = resultByMatch.get(prediction.matchId);
    if (!result) continue;
    playedMatchPredictions += 1;

    if (
      prediction.type === "score" &&
      prediction.homeGoals === result.homeGoals &&
      prediction.awayGoals === result.awayGoals
    ) {
      matchPoints += 2;
      exactHits += 1;
      continue;
    }

    const predictedOutcome = prediction.type === "score" ? prediction.outcome : prediction.choice;
    if (predictedOutcome === result.outcome) {
      matchPoints += 1;
      winnerHits += 1;
    }
  }

  for (const prediction of submission.groupPredictions ?? []) {
    const result = resultByGroup.get(prediction.groupId);
    if (!result) continue;
    const predicted = new Set([prediction.first, prediction.second]);
    if (predicted.has(result.first) && predicted.has(result.second)) {
      groupPoints += 5;
      groupHits += 1;
    }
  }

  for (const prediction of submission.knockoutPredictions ?? []) {
    const result = knockoutResultByFixture.get(prediction.fixtureId);
    const fixture = knockoutFixtureById.get(prediction.fixtureId);
    if (!result) continue;
    playedKnockoutPredictions += 1;
    const scoring = fixture ? knockoutStageScoring[fixture.stage] : knockoutStageScoring.R16;
    if (prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals) {
      knockoutPoints += scoring.exact;
      knockoutExactHits += 1;
    } else if (getOutcome(prediction.homeGoals, prediction.awayGoals) === getOutcome(result.homeGoals, result.awayGoals)) {
      knockoutPoints += scoring.winner;
      knockoutWinnerHits += 1;
    }

    if (knockoutScorerBonusMatches(prediction, result)) {
      knockoutPoints += 1;
      knockoutScorerHits += 1;
    }
  }

  const predictionMatchesPlayed = playedMatchPredictions + playedKnockoutPredictions;
  const predictionWins = exactHits + winnerHits + knockoutExactHits + knockoutWinnerHits;

  return {
    submissionId: submission.id,
    name: submission.name,
    clan: parseClan(submission.clan),
    totalPoints: matchPoints + groupPoints + knockoutPoints + manualAdjustmentPoints,
    matchPoints,
    groupPoints,
    knockoutPoints,
    exactHits,
    winnerHits,
    groupHits,
    knockoutExactHits,
    knockoutWinnerHits,
    knockoutScorerHits,
    manualAdjustmentPoints,
    playedMatches: results.matchResults.length,
    decidedGroups: results.groupResults.length,
    playedKnockoutMatches: results.knockoutResults.length,
    predictionMatchesPlayed,
    predictionWins,
    predictionLosses: Math.max(predictionMatchesPlayed - predictionWins, 0),
  };
}

export function buildStandings(submissions: Submission[], results: ResultStore) {
  return submissions
    .map((submission) => scoreSubmission(submission, results))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      if (b.knockoutExactHits !== a.knockoutExactHits) return b.knockoutExactHits - a.knockoutExactHits;
      if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
      return b.name.localeCompare(a.name, "es");
    });
}
