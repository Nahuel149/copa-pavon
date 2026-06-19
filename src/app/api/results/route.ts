import { NextResponse } from "next/server";
import { appendAuditEvent, readResultStore, writeResultStore } from "@/lib/storage";
import { validateResultStore, type ResultStore } from "@/lib/prode";
import { syncGroupMatchResults } from "@/lib/auto-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAllowed(request: Request) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin) return true;
  const url = new URL(request.url);
  const providedPin = request.headers.get("x-prode-admin-pin") ?? url.searchParams.get("pin");
  return providedPin === requiredPin;
}

function markAdminResultsAsManual(results: ResultStore, current: ResultStore): ResultStore {
  const currentMatches = new Map(current.matchResults.map((result) => [result.matchId, result]));
  const currentKnockout = new Map(current.knockoutResults.map((result) => [result.fixtureId, result]));
  return {
    ...results,
    matchResults: results.matchResults.map((result) => {
      const previous = currentMatches.get(result.matchId);
      const scoreUnchanged = previous && previous.homeGoals === result.homeGoals && previous.awayGoals === result.awayGoals;
      return { ...result, source: scoreUnchanged ? previous.source ?? "manual" : "manual" };
    }),
    knockoutResults: results.knockoutResults.map((result) => {
      const previous = currentKnockout.get(result.fixtureId);
      const unchanged =
        previous &&
        previous.homeGoals === result.homeGoals &&
        previous.awayGoals === result.awayGoals &&
        JSON.stringify(previous.scorerNames ?? []) === JSON.stringify(result.scorerNames ?? []);
      return { ...result, source: unchanged ? previous.source ?? "manual" : "manual" };
    }),
  };
}

export async function GET(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN inválido." }, { status: 401 });
  }

  const results = await readResultStore();
  return NextResponse.json(results);
}

export async function PUT(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN inválido." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los resultados." }, { status: 400 });
  }

  const current = await readResultStore();
  const results = await writeResultStore(markAdminResultsAsManual(validateResultStore(payload), current));
  await appendAuditEvent({
    actor: "admin",
    type: "results",
    message: "Guardo resultados oficiales manuales.",
    meta: {
      matchResults: results.matchResults.length,
      groupResults: results.groupResults.length,
      knockoutResults: results.knockoutResults.length,
      manualAdjustments: results.manualAdjustments?.length ?? 0,
      manualResults: results.matchResults.filter((result) => result.source === "manual").length,
    },
  });
  return NextResponse.json(results);
}

export async function POST(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN invÃ¡lido." }, { status: 401 });
  }

  try {
    const current = await readResultStore();
    const { results, report } = await syncGroupMatchResults(current);
    const saved = await writeResultStore(results);
    await appendAuditEvent({
      actor: "admin",
      type: "sync",
      message: "Ejecuto sincronizacion automatica de resultados.",
      meta: report,
    });
    return NextResponse.json({ results: saved, report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron sincronizar los resultados." },
      { status: 502 },
    );
  }
}
