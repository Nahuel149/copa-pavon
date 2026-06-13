import { NextResponse } from "next/server";
import { readAppSettings, readResultStore, writeAppSettings } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAllowed(request: Request) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin) return true;
  const url = new URL(request.url);
  const providedPin = request.headers.get("x-prode-admin-pin") ?? url.searchParams.get("pin");
  return providedPin === requiredPin;
}

export async function GET() {
  const [settings, results] = await Promise.all([readAppSettings(), readResultStore()]);
  return NextResponse.json({
    ...settings,
    lockedMatchIds: results.matchResults.map((result) => result.matchId),
  });
}

export async function PUT(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN invalido." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la configuracion." }, { status: 400 });
  }

  const submissionsOpen = (payload as { submissionsOpen?: unknown }).submissionsOpen;
  if (typeof submissionsOpen !== "boolean") {
    return NextResponse.json({ error: "Estado de carga invalido." }, { status: 400 });
  }

  const settings = await writeAppSettings({ submissionsOpen });
  return NextResponse.json(settings);
}
