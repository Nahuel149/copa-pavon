import { NextResponse } from "next/server";
import { appendAuditEvent, readResultStore, writeResultStore } from "@/lib/storage";
import { validateResultStore } from "@/lib/prode";
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

  let syncReport = null;
  let authoritativeResults = validateResultStore(payload);
  try {
    const synced = await syncGroupMatchResults(authoritativeResults);
    authoritativeResults = synced.results;
    syncReport = synced.report;
  } catch {
    syncReport = null;
  }

  const results = await writeResultStore(authoritativeResults);
  await appendAuditEvent({
    actor: "admin",
    type: "results",
    message: syncReport?.corrected
      ? "Guardo resultados oficiales y corrigio marcadores con la API."
      : "Guardo resultados oficiales.",
    meta: {
      matchResults: results.matchResults.length,
      groupResults: results.groupResults.length,
      knockoutResults: results.knockoutResults.length,
      manualAdjustments: results.manualAdjustments?.length ?? 0,
      sourceCorrections: syncReport?.corrected ?? 0,
      sourceAdded: syncReport?.added ?? 0,
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
