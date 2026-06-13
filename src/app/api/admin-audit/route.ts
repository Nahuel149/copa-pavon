import { NextResponse } from "next/server";
import { readAuditEvents } from "@/lib/storage";

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
  return NextResponse.json({ events: await readAuditEvents(80) });
}
