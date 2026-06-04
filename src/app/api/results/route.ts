import { NextResponse } from "next/server";
import { readResultStore, writeResultStore } from "@/lib/storage";
import { validateResultStore } from "@/lib/prode";

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

  const results = await writeResultStore(validateResultStore(payload));
  return NextResponse.json(results);
}
