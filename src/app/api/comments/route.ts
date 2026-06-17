import { NextResponse } from "next/server";
import { appendTablaComment, readTablaComments } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanInput(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

export async function GET() {
  try {
    return NextResponse.json({ comments: await readTablaComments() });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los comentarios." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el comentario." }, { status: 400 });
  }

  const body = payload && typeof payload === "object" ? (payload as { name?: unknown; comment?: unknown }) : {};
  const name = cleanInput(body.name, 40);
  const comment = cleanInput(body.comment, 240);

  if (name.length < 2) {
    return NextResponse.json({ error: "Escribi tu nombre." }, { status: 400 });
  }
  if (comment.length < 2) {
    return NextResponse.json({ error: "Escribi un comentario." }, { status: 400 });
  }

  try {
    const saved = await appendTablaComment({ name, comment });
    return NextResponse.json({ comment: saved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el comentario." }, { status: 500 });
  }
}
