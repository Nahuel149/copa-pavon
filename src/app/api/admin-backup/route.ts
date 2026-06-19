import { NextResponse } from "next/server";
import { groupMap, matchMap, type GroupId } from "@/lib/matches";
import { getOutcome, normalizeName, parseClan, validateResultStore, type AppSettings, type PredictionChoice, type Submission } from "@/lib/prode";
import {
  appendAuditEvent,
  readAppSettings,
  readAuditEvents,
  readResultStore,
  readSubmissionStore,
  readTablaComments,
  writeAppSettings,
  writeResultStore,
  writeSubmissionStore,
  writeTablaComments,
  type TablaComment,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAllowed(request: Request) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin) return true;
  const url = new URL(request.url);
  const providedPin = request.headers.get("x-prode-admin-pin") ?? url.searchParams.get("pin");
  return providedPin === requiredPin;
}

export async function GET(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN invalido." }, { status: 401 });
  }

  const [submissionStore, results, settings, audit, comments] = await Promise.all([
    readSubmissionStore(),
    readResultStore(),
    readAppSettings(),
    readAuditEvents(300),
    readTablaComments(500),
  ]);

  await appendAuditEvent({
    actor: "admin",
    type: "backup",
    message: "Descargo backup JSON completo.",
    meta: { submissions: submissionStore.submissions.length },
  });

  return NextResponse.json({
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    results,
    submissions: submissionStore.submissions,
    audit,
    comments,
  });
}

function parseBackupSubmission(value: unknown, index: number): Submission {
  if (!value || typeof value !== "object") throw new Error(`Participante ${index + 1} invalido.`);
  const item = value as Partial<Submission>;
  const name = typeof item.name === "string" ? item.name.trim().replace(/\s+/g, " ") : "";
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!name || !id) throw new Error(`Participante ${index + 1} sin nombre o ID.`);
  if (!Array.isArray(item.predictions) || !Array.isArray(item.groupPredictions)) {
    throw new Error(`Pronosticos invalidos para ${name}.`);
  }
  const predictions = item.predictions.map((prediction, predictionIndex) => {
    if (!prediction || typeof prediction !== "object") throw new Error(`Pronostico ${predictionIndex + 1} invalido para ${name}.`);
    const raw = prediction as Record<string, unknown>;
    const matchId = typeof raw.matchId === "string" ? raw.matchId : "";
    if (!matchMap.has(matchId)) throw new Error(`Partido desconocido en el pronostico de ${name}.`);
    if (raw.type === "choice" && (raw.choice === "home" || raw.choice === "draw" || raw.choice === "away")) {
      return { matchId, type: "choice" as const, choice: raw.choice as PredictionChoice };
    }
    if (
      raw.type === "score" &&
      Number.isInteger(raw.homeGoals) &&
      Number.isInteger(raw.awayGoals) &&
      Number(raw.homeGoals) >= 0 &&
      Number(raw.homeGoals) <= 30 &&
      Number(raw.awayGoals) >= 0 &&
      Number(raw.awayGoals) <= 30
    ) {
      const homeGoals = Number(raw.homeGoals);
      const awayGoals = Number(raw.awayGoals);
      return { matchId, type: "score" as const, homeGoals, awayGoals, outcome: getOutcome(homeGoals, awayGoals) };
    }
    throw new Error(`Pronostico ${predictionIndex + 1} invalido para ${name}.`);
  });
  const groupPredictions = item.groupPredictions.map((prediction) => {
    if (!prediction || typeof prediction !== "object") throw new Error(`Pronostico de grupo invalido para ${name}.`);
    const raw = prediction as Record<string, unknown>;
    const groupId = typeof raw.groupId === "string" && groupMap.has(raw.groupId as GroupId) ? (raw.groupId as GroupId) : null;
    const group = groupId ? groupMap.get(groupId) : undefined;
    const first = typeof raw.first === "string" ? raw.first : "";
    const second = typeof raw.second === "string" ? raw.second : "";
    if (!group || first === second || !group.teams.includes(first) || !group.teams.includes(second)) {
      throw new Error(`Pronostico de grupo invalido para ${name}.`);
    }
    return { groupId: group.id, first, second };
  });
  const knockoutPredictions = (Array.isArray(item.knockoutPredictions) ? item.knockoutPredictions : []).map((prediction) => {
    if (!prediction || typeof prediction !== "object") throw new Error(`Pronostico eliminatorio invalido para ${name}.`);
    const raw = prediction as Record<string, unknown>;
    if (
      typeof raw.fixtureId !== "string" ||
      !Number.isInteger(raw.homeGoals) ||
      !Number.isInteger(raw.awayGoals) ||
      Number(raw.homeGoals) < 0 ||
      Number(raw.awayGoals) < 0
    ) {
      throw new Error(`Pronostico eliminatorio invalido para ${name}.`);
    }
    return {
      fixtureId: raw.fixtureId,
      homeGoals: Number(raw.homeGoals),
      awayGoals: Number(raw.awayGoals),
      ...(typeof raw.goalScorer === "string" && raw.goalScorer.trim() ? { goalScorer: raw.goalScorer.trim() } : {}),
    };
  });
  return {
    id,
    name,
    normalizedName: normalizeName(name),
    clan: parseClan(item.clan),
    ...(typeof item.pinHash === "string" ? { pinHash: item.pinHash } : {}),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    ...(typeof item.updatedAt === "string" ? { updatedAt: item.updatedAt } : {}),
    predictions,
    groupPredictions,
    knockoutPredictions,
  };
}

function parseBackup(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("El archivo no es un backup valido.");
  const source = payload as {
    submissions?: unknown;
    results?: unknown;
    settings?: Partial<AppSettings>;
    comments?: unknown;
  };
  if (!Array.isArray(source.submissions)) throw new Error("El backup no contiene participantes.");
  if (!source.results || typeof source.results !== "object") throw new Error("El backup no contiene resultados.");
  const submissions = source.submissions.map(parseBackupSubmission);
  if (new Set(submissions.map((submission) => submission.normalizedName)).size !== submissions.length) {
    throw new Error("El backup contiene nombres de participantes duplicados.");
  }
  const comments = Array.isArray(source.comments)
    ? source.comments.filter((comment): comment is TablaComment => Boolean(comment && typeof comment === "object"))
    : undefined;
  return {
    submissions,
    results: validateResultStore(source.results),
    settings: { submissionsOpen: source.settings?.submissionsOpen === true },
    comments,
  };
}

export async function POST(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN invalido." }, { status: 401 });
  }

  try {
    const backup = parseBackup(await request.json());
    const [previousSubmissionStore, previousResults, previousSettings, previousComments] = await Promise.all([
      readSubmissionStore(),
      readResultStore(),
      readAppSettings(),
      readTablaComments(500),
    ]);
    let submissionStore;
    let results;
    let settings;
    try {
      submissionStore = await writeSubmissionStore({ submissions: backup.submissions });
      results = await writeResultStore(backup.results);
      settings = await writeAppSettings(backup.settings);
      if (backup.comments) await writeTablaComments(backup.comments);
    } catch (restoreError) {
      await writeSubmissionStore(previousSubmissionStore);
      await writeResultStore(previousResults);
      await writeAppSettings(previousSettings);
      await writeTablaComments(previousComments);
      throw restoreError;
    }
    await appendAuditEvent({
      actor: "admin",
      type: "restore",
      message: "Restauro un backup JSON completo.",
      meta: {
        submissions: submissionStore.submissions.length,
        matchResults: results.matchResults.length,
        comments: backup.comments?.length ?? "sin cambios",
      },
    });
    return NextResponse.json({
      restored: true,
      submissions: submissionStore.submissions.length,
      matchResults: results.matchResults.length,
      submissionsOpen: settings.submissionsOpen,
      comments: backup.comments?.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo restaurar el backup." },
      { status: 400 },
    );
  }
}
