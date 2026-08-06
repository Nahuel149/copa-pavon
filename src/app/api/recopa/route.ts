import { NextResponse } from "next/server";
import {
  areRecopaPredictionsRevealed,
  buildRecopaStandings,
  isRecopaEditOpen,
  recopaMatches,
  recopaParticipants,
  RECOPA_EDIT_DEADLINE_ISO,
  RECOPA_EDIT_DEADLINE_LABEL,
  RECOPA_REVEAL_DEADLINE_ISO,
  RECOPA_REVEAL_DEADLINE_LABEL,
} from "@/lib/recopa";
import { readRecopaStore, writeRecopaStore } from "@/lib/recopa-storage";

export async function GET() {
  try {
    const store = await readRecopaStore();
    const isRevealed = areRecopaPredictionsRevealed();

    const safeSubmissions = store.submissions.map(({ pinHash: _pinHash, predictions, ...s }) => ({
      ...s,
      predictions: isRevealed ? predictions : [],
      hasPredictions: predictions.length > 0,
    }));

    const standings = buildRecopaStandings(store, isRevealed);

    return NextResponse.json({
      matches: recopaMatches,
      participants: recopaParticipants,
      submissions: safeSubmissions,
      results: store.results,
      standings,
      editDeadline: RECOPA_EDIT_DEADLINE_ISO,
      editDeadlineLabel: RECOPA_EDIT_DEADLINE_LABEL,
      revealDeadline: RECOPA_REVEAL_DEADLINE_ISO,
      revealDeadlineLabel: RECOPA_REVEAL_DEADLINE_LABEL,
      isOpen: isRecopaEditOpen(),
      isRevealed,
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
