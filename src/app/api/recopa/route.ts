import { NextResponse } from "next/server";
import { buildRecopaStandings, recopaMatches, recopaParticipants } from "@/lib/recopa";
import { readRecopaStore, writeRecopaStore } from "@/lib/recopa-storage";

export async function GET() {
  try {
    const store = await readRecopaStore();
    const safeSubmissions = store.submissions.map(({ pinHash: _pinHash, ...s }) => s);
    const standings = buildRecopaStandings(store);

    return NextResponse.json({
      matches: recopaMatches,
      participants: recopaParticipants,
      submissions: safeSubmissions,
      results: store.results,
      standings,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener datos de la Recopa." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
    }

    const store = await readRecopaStore();
    if (Array.isArray(body.results)) {
      store.results = body.results;
    }

    const updated = await writeRecopaStore(store);
    const standings = buildRecopaStandings(updated);

    return NextResponse.json({
      ok: true,
      results: updated.results,
      standings,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar la Recopa." }, { status: 500 });
  }
}
