import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tablaReactionEmojis, type TablaReactionEmoji } from "@/lib/comment-reactions";
import { addTablaCommentReaction, appendTablaComment, readTablaComments } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reactionVoterCookie = "copa-kahl-comment-voter";

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

export async function PATCH(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la reaccion." }, { status: 400 });
  }

  const body = payload && typeof payload === "object" ? (payload as { commentId?: unknown; reaction?: unknown }) : {};
  const commentId = cleanInput(body.commentId, 120);
  const reaction = typeof body.reaction === "string" ? body.reaction : "";
  if (!commentId || !tablaReactionEmojis.includes(reaction as TablaReactionEmoji)) {
    return NextResponse.json({ error: "La reaccion no es valida." }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const existingVoterId = cookieStore.get(reactionVoterCookie)?.value;
    const voterId = existingVoterId && /^[a-zA-Z0-9-]{20,120}$/.test(existingVoterId) ? existingVoterId : randomUUID();
    const result = await addTablaCommentReaction(commentId, reaction as TablaReactionEmoji, voterId);
    if (!result) return NextResponse.json({ error: "No encontramos ese comentario." }, { status: 404 });

    const response = NextResponse.json({ comment: result.comment, viewerReaction: result.reaction, alreadyReacted: !result.added });
    if (voterId !== existingVoterId) {
      response.cookies.set(reactionVoterCookie, voterId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365 * 5,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la reaccion." }, { status: 500 });
  }
}
