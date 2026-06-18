"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Loader2, MessageSquare, RefreshCw, Send, Share2, Trophy } from "lucide-react";
import { formatArgentinaDateTime, formatArgentinaTime } from "@/lib/argentina-time";
import { readJsonResponse } from "@/lib/client-json";
import { type ClanId, type StandingRow } from "@/lib/prode";

function shortParticipantName(name: string) {
  return name.length > 8 ? `${name.slice(0, 8)}...` : name;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compactText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;
}

function svgText(value: string, x: number, y: number, options: { size?: number; weight?: number; fill?: string; anchor?: string } = {}) {
  const size = options.size ?? 26;
  const weight = options.weight ?? 800;
  const fill = options.fill ?? "#050505";
  const anchor = options.anchor ? ` text-anchor="${options.anchor}"` : "";
  return `<text x="${x}" y="${y}" font-family="Trebuchet MS, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor}>${escapeXml(value)}</text>`;
}

async function svgToPngFile(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo crear la imagen."));
    });
    image.src = url;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.fillStyle = "#fffdf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("No se pudo descargar la imagen."))), "image/png");
    });
    return new File([pngBlob], filename, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

type StandingsResponse = {
  standings: StandingRow[];
  standingsByClan: Record<ClanId, StandingRow[]>;
  history: Array<{
    label: string;
    title: string;
    positions: Array<{
      submissionId: string;
      name: string;
      clan: ClanId;
      position: number;
      points: number;
    }>;
  }>;
  playedMatches: number;
  decidedGroups: number;
  knockoutFixtures: number;
  playedKnockoutMatches: number;
  updatedAt: string;
  error?: string;
};

type TablaComment = {
  id: string;
  name: string;
  comment: string;
  createdAt: string;
};

type CommentsResponse = {
  comments?: TablaComment[];
  comment?: TablaComment;
  error?: string;
};

export default function TablaPage() {
  const [data, setData] = useState<StandingsResponse>({
    standings: [],
    standingsByClan: { "river-plate": [], "la-batata": [] },
    history: [],
    playedMatches: 0,
    decidedGroups: 0,
    knockoutFixtures: 0,
    playedKnockoutMatches: 0,
    updatedAt: "",
  });
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState("");
  const [historyLimit, setHistoryLimit] = useState(0);
  const [movementLimit, setMovementLimit] = useState(0);
  const [hiddenGraphIds, setHiddenGraphIds] = useState<string[]>([]);
  const [graphDisplayLimit, setGraphDisplayLimit] = useState(0);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "working">("idle");
  const [shareMessage, setShareMessage] = useState("");
  const [comments, setComments] = useState<TablaComment[]>([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentStatus, setCommentStatus] = useState<"idle" | "saving">("idle");
  const [commentMessage, setCommentMessage] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const rows = data.standingsByClan?.["river-plate"] ?? data.standings.filter((row) => row.clan === "river-plate");
  const visibleComments = showAllComments ? comments : comments.slice(0, 10);
  const hiddenCommentCount = Math.max(comments.length - visibleComments.length, 0);
  const relegationCount = rows.length > 10 ? 3 : 2;
  const fullGraphHistory = useMemo(
    () =>
      (data.history ?? []).map((entry) => ({
        ...entry,
        positions: entry.positions.filter((position) => position.clan === "river-plate"),
      })),
    [data.history],
  );
  const graphHistoryLimit = fullGraphHistory.length === 0 ? 0 : Math.min(Math.max(historyLimit || fullGraphHistory.length, 1), fullGraphHistory.length);
  const graphHistory = useMemo(
    () => fullGraphHistory.slice(0, graphHistoryLimit),
    [fullGraphHistory, graphHistoryLimit],
  );
  const selectedGraphSnapshot = graphHistory.at(-1);
  const movementHistoryLimit = fullGraphHistory.length === 0 ? 0 : Math.min(Math.max(movementLimit || fullGraphHistory.length, 1), fullGraphHistory.length);
  const movementTargetSnapshot = movementHistoryLimit > 1 ? fullGraphHistory[movementHistoryLimit - 1] : undefined;
  const movementBaseSnapshot = movementHistoryLimit > 1 ? fullGraphHistory[movementHistoryLimit - 2] : undefined;
  const movementBaseLabel = movementBaseSnapshot && movementTargetSnapshot
    ? `Cambios ${movementBaseSnapshot.label} -> ${movementTargetSnapshot.label}`
    : "Cambios por fecha: falta una fecha anterior";
  const effectiveGraphDisplayLimit = graphDisplayLimit > 0 ? graphDisplayLimit : rows.length;
  const graphRows = (selectedGraphSnapshot?.positions ?? []).slice(0, effectiveGraphDisplayLimit);
  const visibleGraphRows = graphRows.filter((row) => !hiddenGraphIds.includes(row.submissionId));
  const movementById = useMemo(() => {
    const previousPositions = new Map((movementBaseSnapshot?.positions ?? []).map((row) => [row.submissionId, row.position]));
    const targetPositions = new Map((movementTargetSnapshot?.positions ?? []).map((row) => [row.submissionId, row.position]));
    return new Map(
      rows.map((row) => {
        const previous = previousPositions.get(row.submissionId);
        const current = targetPositions.get(row.submissionId);
        if (typeof current !== "number") return [row.submissionId, 0];
        return [row.submissionId, typeof previous === "number" ? previous - current : 0];
      }),
    );
  }, [movementBaseSnapshot?.positions, movementTargetSnapshot?.positions, rows]);
  const graphWidth = 680;
  const graphHeight = 300;
  const graphPadX = 46;
  const graphPadTop = 24;
  const graphPadBottom = 46;
  const graphInnerWidth = graphWidth - graphPadX * 2;
  const graphInnerHeight = graphHeight - graphPadTop - graphPadBottom;
  const maxPosition = Math.max(rows.length, 1);
  const positionMarkers = Array.from(new Set([1, Math.ceil(maxPosition / 2), maxPosition]));
  const graphColors = [
    "#f04424",
    "#2c6f45",
    "#276b8f",
    "#d79b30",
    "#111111",
    "#8f3d2b",
    "#6d6a62",
    "#005f73",
    "#9b2226",
    "#6a4c93",
    "#0a9396",
    "#ca6702",
    "#3a86ff",
    "#7f5539",
    "#ff4d6d",
    "#00b4d8",
  ];
  const graphColorById = useMemo(
    () => new Map(rows.map((row, index) => [row.submissionId, graphColors[index % graphColors.length]])),
    [rows],
  );

  function colorForSubmission(submissionId: string, fallbackIndex: number) {
    return graphColorById.get(submissionId) ?? graphColors[fallbackIndex % graphColors.length];
  }

  function graphPoint(index: number, position: number) {
    const x = graphPadX + (graphHistory.length <= 1 ? 0 : (index / (graphHistory.length - 1)) * graphInnerWidth);
    const y = graphPadTop + (maxPosition <= 1 ? 0 : ((position - 1) / (maxPosition - 1)) * graphInnerHeight);
    return { x, y };
  }

  function linePoints(submissionId: string) {
    return graphHistory
      .map((entry, index) => {
        const position = entry.positions.find((item) => item.submissionId === submissionId)?.position;
        if (!position) return null;
        const point = graphPoint(index, position);
        return `${point.x},${point.y}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  function toggleGraphParticipant(submissionId: string) {
    setHiddenGraphIds((current) =>
      current.includes(submissionId) ? current.filter((id) => id !== submissionId) : [...current, submissionId],
    );
  }

  function movementLabel(submissionId: string) {
    if (!movementBaseSnapshot) return movementTargetSnapshot?.label.replace("Fecha ", "F") ?? "F1";
    const movement = movementById.get(submissionId) ?? 0;
    if (movement > 0) return `+${movement}`;
    if (movement < 0) return `${movement}`;
    return "=";
  }

  function movementClass(submissionId: string) {
    if (!movementBaseSnapshot) return "movement same";
    const movement = movementById.get(submissionId) ?? 0;
    if (movement > 0) return "movement up";
    if (movement < 0) return "movement down";
    return "movement same";
  }

  function pointDetailCards(row: StandingRow) {
    const matchHits = row.exactHits + row.winnerHits;
    const matchPending = Math.max(data.playedMatches - matchHits, 0);
    return [
      {
        label: "Puntos partidos de grupo",
        value: row.matchPoints,
        help: "Puntos por partidos de fase de grupos.",
        meta: `${matchHits}/${data.playedMatches} aciertos · ${matchPending} errores · ${row.exactHits} exactos`,
      },
      {
        label: "Puntos ganadores de grupos",
        value: row.groupPoints,
        help: "Bonus por acertar los dos clasificados de cada grupo.",
        meta: `${row.groupHits} grupos acertados · ${data.decidedGroups} grupos definidos`,
      },
      {
        label: "Puntos en eliminatorias",
        value: row.knockoutPoints,
        help: "Incluye exactos, clasificados y bonus de goleador.",
        meta: `${row.knockoutExactHits} exactos · ${row.knockoutWinnerHits} clasificados · ${row.knockoutScorerHits} goleadores`,
      },
      {
        label: "Aciertos en goleadores",
        value: row.knockoutScorerHits,
        help: "+1 si acierta un goleador o deja vacio y sale 0-0.",
        meta: row.playedKnockoutMatches > 0 ? `${row.knockoutScorerHits}/${row.playedKnockoutMatches} aciertos` : "Arranca en eliminatorias",
      },
    ];
  }

  function buildStandingsShareSvg() {
    const width = 1080;
    const rowHeight = 54;
    const headerHeight = 190;
    const footerHeight = 64;
    const tableTop = headerHeight;
    const height = tableTop + 56 + Math.max(rows.length, 1) * rowHeight + footerHeight;
    const red = "#fa3b22";
    const cream = "#fffdf7";
    const pale = "#fff1ec";
    const green = "#e5f7df";
    const ink = "#050505";
    const muted = "#625d55";
    const left = 36;
    const usable = width - left * 2;
    const col = {
      rank: 68,
      name: 298,
      points: 120,
      played: 120,
      wins: 120,
      losses: 120,
      exacts: 120,
    };
    const headers = [
      { label: "#", x: left, width: col.rank, anchor: "middle" },
      { label: "Participante", x: left + col.rank, width: col.name, anchor: "start" },
      { label: "Pts", x: left + col.rank + col.name, width: col.points, anchor: "middle" },
      { label: "Jug", x: left + col.rank + col.name + col.points, width: col.played, anchor: "middle" },
      { label: "Gan", x: left + col.rank + col.name + col.points + col.played, width: col.wins, anchor: "middle" },
      { label: "Per", x: left + col.rank + col.name + col.points + col.played + col.wins, width: col.losses, anchor: "middle" },
      { label: "Exa", x: left + col.rank + col.name + col.points + col.played + col.wins + col.losses, width: col.exacts, anchor: "middle" },
    ];
    const tableWidth = usable;
    const updated = data.updatedAt ? formatArgentinaDateTime(data.updatedAt) : "Actualizando";
    const rowsSvg = rows.map((row, index) => {
      const y = tableTop + 56 + index * rowHeight;
      const fill = index === 0 ? green : index >= rows.length - relegationCount ? "#ffe2dc" : index % 2 ? "#fff8ef" : cream;
      return [
        `<rect x="${left}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="${fill}" stroke="#d3cec4" stroke-width="2"/>`,
        `<rect x="${left + col.rank + col.name}" y="${y}" width="${col.points}" height="${rowHeight}" fill="${red}" stroke="${ink}" stroke-width="2"/>`,
        svgText(String(index + 1), left + col.rank / 2, y + 35, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(compactText(row.name, 18), left + col.rank + 16, y + 35, { size: 24, weight: 900, fill: ink }),
        svgText(String(row.totalPoints), left + col.rank + col.name + col.points / 2, y + 38, { size: 34, weight: 900, fill: "#ffffff", anchor: "middle" }),
        svgText(String(row.predictionMatchesPlayed), left + col.rank + col.name + col.points + col.played / 2, y + 35, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(row.predictionWins), left + col.rank + col.name + col.points + col.played + col.wins / 2, y + 35, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(row.predictionLosses), left + col.rank + col.name + col.points + col.played + col.wins + col.losses / 2, y + 35, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(row.exactHits + row.knockoutExactHits), left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts / 2, y + 35, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
      ].join("");
    }).join("");
    const headersSvg = headers.map((header) => {
      const textX = header.anchor === "start" ? header.x + 16 : header.x + header.width / 2;
      return [
        `<rect x="${header.x}" y="${tableTop}" width="${header.width}" height="56" fill="${pale}" stroke="${ink}" stroke-width="2"/>`,
        svgText(header.label, textX, tableTop + 36, { size: 19, weight: 900, fill: ink, anchor: header.anchor === "start" ? undefined : "middle" }),
      ].join("");
    }).join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${cream}"/>
      <rect x="0" y="0" width="${width}" height="128" fill="${red}"/>
      ${svgText("CK", 64, 82, { size: 34, weight: 900, fill: "#fff" })}
      ${svgText("Copa Kahl", 124, 70, { size: 48, weight: 900, fill: "#fff" })}
      ${svgText("Tabla actual", 124, 108, { size: 24, weight: 900, fill: "#fff1ec" })}
      <rect x="${left}" y="144" width="${tableWidth}" height="34" fill="#f4fff0" stroke="${ink}" stroke-width="2"/>
      ${svgText(`${rows.length} participantes · ${data.playedMatches}/72 partidos · Actualizada ${updated}`, left + 16, 168, { size: 20, weight: 900, fill: muted })}
      ${headersSvg}
      ${rowsSvg || svgText("La tabla aparece cuando haya envios.", left + 20, tableTop + 98, { size: 28, weight: 900 })}
      <rect x="${left}" y="${height - 46}" width="${tableWidth}" height="2" fill="${ink}"/>
      ${svgText("Puntos, jugados, ganados, perdidos y exactos del prode.", left, height - 18, { size: 18, weight: 900, fill: muted })}
    </svg>`;
  }

  async function shareStandingsImage() {
    if (rows.length === 0 || shareStatus === "working") return;
    setShareStatus("working");
    setShareMessage("");
    try {
      const file = await svgToPngFile(buildStandingsShareSvg(), `copa-kahl-tabla-${new Date().toISOString().slice(0, 10)}.png`);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Tabla Copa Kahl", text: "Tabla actual de la Copa Kahl", files: [file] });
        setShareMessage("Imagen lista para compartir.");
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        setShareMessage("Imagen descargada.");
      }
    } catch (shareError) {
      setShareMessage(shareError instanceof Error ? shareError.message : "No se pudo generar la imagen.");
    } finally {
      setShareStatus("idle");
    }
  }

  const awards = useMemo(() => {
    if (rows.length === 0) return [];
    const usedAwardIds = new Set<string>();
    const remember = (row?: StandingRow) => {
      if (row) usedAwardIds.add(row.submissionId);
      return row;
    };
    const topRow = remember(rows[0]);
    const historicHitsCandidates = rows
      .map((row) => ({
        row,
        hits: row.exactHits + row.winnerHits + row.knockoutExactHits,
      }))
      .sort(
        (a, b) =>
          b.hits - a.hits ||
          b.row.totalPoints - a.row.totalPoints ||
          a.row.name.localeCompare(b.row.name, "es"),
      );
    const historicHitsLeader = historicHitsCandidates[0];
    const historicHitsAward =
      !usedAwardIds.has(historicHitsLeader.row.submissionId) || historicHitsLeader.hits === 0
        ? historicHitsLeader
        : historicHitsCandidates.find((candidate) => candidate.hits > 0 && !usedAwardIds.has(candidate.row.submissionId));
    if (historicHitsAward) remember(historicHitsAward.row);

    const movementCandidates = rows
      .map((row) => ({ row, movement: movementById.get(row.submissionId) ?? 0 }))
      .sort((a, b) => b.movement - a.movement || a.row.name.localeCompare(b.row.name, "es"));
    const riseAward = movementCandidates.find((candidate) => candidate.movement > 0 && !usedAwardIds.has(candidate.row.submissionId));
    if (riseAward) remember(riseAward.row);

    const last = rows.at(-1);
    if (last) remember(last);

    const batacazoAward = movementCandidates.find((candidate) => candidate.movement >= 3 && !usedAwardIds.has(candidate.row.submissionId));
    if (batacazoAward) remember(batacazoAward.row);

    const historicLabel =
      historicHitsAward && historicHitsAward.row.submissionId !== historicHitsLeader.row.submissionId
        ? "Otro con aciertos historicos"
        : "Mas aciertos historicos";
    return [
      { label: "Puntero", value: topRow?.name ?? "-", detail: `${topRow?.totalPoints ?? 0} pts` },
      {
        label: historicLabel,
        value: historicHitsAward ? historicHitsAward.row.name : "Sin datos",
        detail: historicHitsAward ? `${historicHitsAward.hits} resultados` : "Sin otro jugador",
      },
      {
        label: "Racha positiva",
        value: riseAward ? riseAward.row.name : "Sin cambios",
        detail: riseAward ? `Subio ${riseAward.movement}` : "=",
      },
      { label: "Ultimo de la B", value: last?.name ?? "-", detail: `${last?.totalPoints ?? 0} pts` },
      {
        label: "Pego el batacazo",
        value: batacazoAward ? batacazoAward.row.name : "Sin batacazo",
        detail: batacazoAward ? `+${batacazoAward.movement} puestos` : "Sin otro salto fuerte",
      },
    ];
  }, [movementById, rows]);

  async function loadStandings() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/standings", { cache: "no-store" });
      const body = await readJsonResponse<StandingsResponse>(response);
      if (!response.ok || body.error) throw new Error(body.error ?? "No se pudo actualizar la tabla.");
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo actualizar la tabla.");
    } finally {
      setStatus("ready");
    }
  }

  async function loadComments() {
    try {
      const response = await fetch("/api/comments", { cache: "no-store" });
      const body = await readJsonResponse<CommentsResponse>(response);
      if (response.ok && Array.isArray(body.comments)) setComments(body.comments);
    } catch {
      // Comments are secondary; keep the table usable if they fail.
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = commentName.trim();
    const comment = commentText.trim();
    if (name.length < 2) {
      setCommentMessage("Escribi tu nombre.");
      return;
    }
    if (comment.length < 2) {
      setCommentMessage("Escribi un comentario.");
      return;
    }

    setCommentStatus("saving");
    setCommentMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, comment }),
      });
      const body = await readJsonResponse<CommentsResponse>(response);
      if (!response.ok || body.error || !body.comment) throw new Error(body.error ?? "No se pudo guardar el comentario.");
      setComments((current) => [body.comment as TablaComment, ...current].slice(0, 40));
      setCommentText("");
      setCommentMessage("Comentario publicado.");
    } catch (commentError) {
      setCommentMessage(commentError instanceof Error ? commentError.message : "No se pudo guardar el comentario.");
    } finally {
      setCommentStatus("idle");
    }
  }

  useEffect(() => {
    void loadStandings();
    void loadComments();
    const intervalId = window.setInterval(() => {
      void loadStandings();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (fullGraphHistory.length === 0) return;
    setHistoryLimit((current) => {
      if (current > 0 && current <= fullGraphHistory.length) return current;
      return fullGraphHistory.length;
    });
    setMovementLimit((current) => {
      if (current > 1 && current <= fullGraphHistory.length) return current;
      return fullGraphHistory.length;
    });
  }, [fullGraphHistory.length]);

  useEffect(() => {
    const validIds = new Set(rows.map((row) => row.submissionId));
    setHiddenGraphIds((current) => current.filter((id) => validIds.has(id)));
  }, [rows]);

  return (
    <div className="pageStack">
      <section className="heroBand tableHero standingsHero">
        <div>
          <p className="eyebrow">Tabla</p>
          <h1>Posiciones del prode.</h1>
          <p className="heroCopy">
            Puntaje acumulado por 1X2, marcadores exactos, grupos y eliminatorias. Se recalcula con los resultados
            oficiales cargados en admin.
          </p>
        </div>
        <div className="tableRefresh">
          <span>{data.updatedAt ? `Actualizada ${formatArgentinaTime(data.updatedAt)}` : "Actualizando..."}</span>
          <button className="primaryAction light" onClick={loadStandings} type="button">
            <RefreshCw className={status === "loading" ? "spin" : ""} size={18} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </section>

      {error ? <section className="errorPanel" aria-live="polite">{error}</section> : null}

      <section className="tableShell">
        <div className="tableNote">
          <strong>Tabla</strong>
          <div>
            <span>
              Los puntos se suman cada vez que existen resultados oficiales: partidos de grupo, top 2 por grupo y cruces
              de eliminatorias. Ganados/perdidos son aciertos y errores del prode. {movementBaseLabel}.
            </span>
            {fullGraphHistory.length > 1 ? (
              <div className="movementCutSelector" role="group" aria-label="Elegir tramo de cambios de posiciones">
                {fullGraphHistory.slice(1).map((entry, index) => {
                  const limit = index + 2;
                  return (
                    <button
                      className={movementHistoryLimit === limit ? "active" : ""}
                      key={entry.label}
                      onClick={() => setMovementLimit(limit)}
                      type="button"
                    >
                      {fullGraphHistory[index].label} {"->"} {entry.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
        <table className="standingsTable publicStandingsTable">
          <colgroup>
            <col className="standingPositionCol" />
            <col className="standingPlayerCol" />
            <col className="standingPointsCol" />
            <col className="standingMetricCol" />
            <col className="standingMetricCol" />
            <col className="standingMetricCol" />
            <col className="standingExactCol" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Participante</th>
              <th className="pointsHeader">Puntos</th>
              <th>Jugados</th>
              <th>Ganados</th>
              <th>Perdidos</th>
              <th>Exactos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLeader = index === 0;
              const isRelegation = rows.length > 1 && index >= rows.length - relegationCount;
              return (
                <Fragment key={row.submissionId}>
                  <tr className={isLeader ? "leaderRow" : isRelegation ? "relegationRow" : ""}>
                    <td data-label="Posicion">
                      <span className="positionCell">
                        <b>{index + 1}</b>
                        <span className={movementClass(row.submissionId)}>{movementLabel(row.submissionId)}</span>
                      </span>
                    </td>
                    <td className="playerCell" data-label="Participante">
                      <button className="tableButton inlineButton" onClick={() => setExpandedPlayerId(expandedPlayerId === row.submissionId ? null : row.submissionId)} title={row.name} type="button">
                        {shortParticipantName(row.name)}
                      </button>
                    </td>
                    <td className="pointsCell" data-label="Puntos"><strong>{row.totalPoints}</strong></td>
                    <td data-label="Jugados">{row.predictionMatchesPlayed}</td>
                    <td data-label="Ganados">{row.predictionWins}</td>
                    <td data-label="Perdidos">{row.predictionLosses}</td>
                    <td data-label="Exactos">{row.exactHits + row.knockoutExactHits}</td>
                  </tr>
                  {expandedPlayerId === row.submissionId ? (
                    <tr className="detailRow">
                      <td colSpan={7}>
                        <div className="playerPointPanel">
                          <div className="playerPointSummary">
                            <div>
                              <span>Detalle de puntos</span>
                              <strong>{row.name}</strong>
                            </div>
                            <div>
                              <span>Total</span>
                              <strong>{row.totalPoints}</strong>
                            </div>
                          </div>
                          <div className="pointBreakdown compact">
                            {pointDetailCards(row).map((card) => (
                              <article key={card.label}>
                                <div>
                                  <span>{card.label}</span>
                                  <strong>{card.value}</strong>
                                </div>
                                <p>{card.help}</p>
                                <small>{card.meta}</small>
                              </article>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>La tabla aparece cuando haya envios guardados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="raceGraph" aria-label="Evolucion de posiciones por fecha">
        <div className="tableNote">
          <div>
            <strong>Carrera por la punta</strong>
            <span>
              {selectedGraphSnapshot
                ? `Hasta ${selectedGraphSnapshot.label}: ${selectedGraphSnapshot.title}.`
                : "Cada corte suma una fecha con resultados oficiales cargados."}{" "}
              Cuanto mas arriba esta la linea, mejor ubicacion.
            </span>
          </div>
          {fullGraphHistory.length > 0 ? (
            <div className="raceCutSelector" role="group" aria-label="Elegir corte del grafico">
              {fullGraphHistory.map((entry, index) => (
                <button
                  className={graphHistoryLimit === index + 1 ? "active" : ""}
                  key={entry.label}
                  onClick={() => setHistoryLimit(index + 1)}
                  type="button"
                >
                  {entry.label}
                </button>
              ))}
            </div>
          ) : null}
          {fullGraphHistory.length > 0 ? (
            <div className="raceQuickFilters" aria-label="Filtros del grafico">
              <button
                className={graphDisplayLimit === 5 ? "active" : ""}
                onClick={() => {
                  setGraphDisplayLimit(5);
                  setHiddenGraphIds([]);
                }}
                type="button"
              >
                Top 5
              </button>
              <button
                className={graphDisplayLimit === 0 ? "active" : ""}
                onClick={() => {
                  setGraphDisplayLimit(0);
                  setHiddenGraphIds([]);
                }}
                type="button"
              >
                Ver todos
              </button>
              <button className="light" onClick={() => setHiddenGraphIds([])} type="button">
                Limpiar seleccion
              </button>
            </div>
          ) : null}
        </div>
        {graphRows.length > 0 ? (
          <div className="raceGraphBody">
            <div className="raceGraphCanvas">
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="img" aria-label="Grafico de posiciones por fecha">
                <rect x="0" y="0" width={graphWidth} height={graphHeight} rx="0" />
                {positionMarkers.map((position) => {
                  const point = graphPoint(0, position);
                  return (
                    <g className="raceGridLine" key={position}>
                      <line x1={graphPadX} x2={graphWidth - graphPadX} y1={point.y} y2={point.y} />
                      <text x="16" y={point.y + 5}>
                        #{position}
                      </text>
                    </g>
                  );
                })}
                {graphHistory.map((entry, index) => {
                  const point = graphPoint(index, maxPosition);
                  return (
                    <g className="raceTurnLine" key={entry.label}>
                      <line x1={point.x} x2={point.x} y1={graphPadTop} y2={graphPadTop + graphInnerHeight} />
                      <text x={point.x} y={graphHeight - 18}>
                        {entry.label}
                      </text>
                    </g>
                  );
                })}
                {visibleGraphRows.map((row, index) => {
                  const color = colorForSubmission(row.submissionId, index);
                  const points = linePoints(row.submissionId);
                  if (!points) return null;
                  return (
                    <g className="raceLineGroup" key={row.submissionId}>
                      <polyline points={points} style={{ stroke: color }} />
                      {graphHistory.map((entry, entryIndex) => {
                        const position = entry.positions.find((item) => item.submissionId === row.submissionId)?.position;
                        if (!position) return null;
                        const point = graphPoint(entryIndex, position);
                        const snapshotRow = entry.positions.find((item) => item.submissionId === row.submissionId);
                        return (
                          <circle cx={point.x} cy={point.y} fill={color} key={`${row.submissionId}-${entry.label}`} r="4.5">
                            <title>{`${row.name} · ${entry.label}: #${position}, ${snapshotRow?.points ?? 0} pts`}</title>
                          </circle>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
            <ol className="raceLegend" aria-label={`Posiciones hasta ${selectedGraphSnapshot?.label ?? "el corte elegido"}`}>
              {graphRows.map((row, index) => (
                <li className={hiddenGraphIds.includes(row.submissionId) ? "muted" : ""} key={row.submissionId}>
                  <button
                    aria-pressed={!hiddenGraphIds.includes(row.submissionId)}
                    onClick={() => toggleGraphParticipant(row.submissionId)}
                    type="button"
                  >
                    <i style={{ background: colorForSubmission(row.submissionId, index) }} />
                  <span>{row.position}</span>
                  <strong>{row.name}</strong>
                  <b>{row.points} pts</b>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="emptyState">El grafico aparece cuando haya participantes guardados.</div>
        )}
      </section>

      {awards.length > 0 ? (
        <section className="awardsPanel" aria-label="Premios de la fecha">
          <div className="tableNote">
            <strong>Premios de la fecha</strong>
            <span>Badges automaticos, sutiles y recalculados con la tabla actual.</span>
          </div>
          <div className="awardGrid">
            {awards.map((award) => (
              <article className="awardPill" key={award.label}>
                <span>{award.label}</span>
                <strong>{award.value}</strong>
                <small>{award.detail}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shareCardPanel standingsSharePanel" aria-label="Compartir tabla actual">
        <div className="shareCardPreview">
          <div>
            <strong>Imagen para compartir la tabla</strong>
            <p>{rows.length} participantes · {data.playedMatches}/72 partidos con resultado.</p>
          </div>
          <Trophy size={28} aria-hidden="true" />
        </div>
        <div className="shareActions">
          <button className="primaryAction" disabled={rows.length === 0 || shareStatus === "working"} onClick={shareStandingsImage} type="button">
            {shareStatus === "working" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
            Compartir tabla
          </button>
          <button className="primaryAction light" disabled={rows.length === 0 || shareStatus === "working"} onClick={shareStandingsImage} type="button">
            <Download size={18} aria-hidden="true" />
            Descargar imagen
          </button>
        </div>
        {shareMessage ? <p className="shareMessage">{shareMessage}</p> : null}
      </section>

      <section className="commentsPanel" aria-label="Comentarios">
        <div className="tableNote">
          <div>
            <strong>Comentarios</strong>
            <span>Deja una gastada, reclamo o mensaje para la fecha.</span>
          </div>
          <MessageSquare size={24} aria-hidden="true" />
        </div>
        <form className="commentForm" onSubmit={submitComment}>
          <label>
            <span>Nombre</span>
            <input maxLength={40} onChange={(event) => setCommentName(event.target.value)} placeholder="Tu nombre" value={commentName} />
          </label>
          <label>
            <span>Comentario</span>
            <textarea maxLength={240} onChange={(event) => setCommentText(event.target.value)} placeholder="Escribi algo..." value={commentText} />
          </label>
          <button className="primaryAction" disabled={commentStatus === "saving"} type="submit">
            {commentStatus === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            Publicar
          </button>
        </form>
        {commentMessage ? <p className="shareMessage">{commentMessage}</p> : null}
        <div className="commentList">
          {visibleComments.map((comment) => (
            <article key={comment.id}>
              <strong>{comment.name}</strong>
              <p>{comment.comment}</p>
              <small>{formatArgentinaDateTime(comment.createdAt)}</small>
            </article>
          ))}
          {comments.length === 0 ? <div className="emptyState">Todavia no hay comentarios.</div> : null}
        </div>
        {comments.length > 10 ? (
          <button className="tableButton commentsMoreButton" onClick={() => setShowAllComments((current) => !current)} type="button">
            {showAllComments ? "Ver menos" : `Ver mas comentarios (${hiddenCommentCount})`}
          </button>
        ) : null}
      </section>
    </div>
  );
}
