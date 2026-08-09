"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDown, Download, Loader2, MessageSquare, RefreshCw, Send, Share2, SmilePlus, Trophy } from "lucide-react";
import { formatArgentinaDateTime, formatArgentinaTime } from "@/lib/argentina-time";
import { readJsonResponse } from "@/lib/client-json";
import { tablaReactionEmojis, type TablaCommentReactions, type TablaReactionEmoji } from "@/lib/comment-reactions";
import { type ClanId, type StandingRow } from "@/lib/prode";

const worldCupTotalMatches = 104;
const commentReactionStorageKey = "copa-kahl-comment-reactions";

function shortParticipantName(name: string) {
  return name.length > 8 ? `${name.slice(0, 8)}...` : name;
}

function ArgentinaFlagBadge() {
  return (
    <span title="Argentina" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "20px", borderRadius: "3px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.25)", background: "#75AADB", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", flexShrink: 0 }}>
      <svg width="30" height="20" viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="20" fill="#75AADB"/>
        <rect y="6.66" width="30" height="6.66" fill="#FFFFFF"/>
        <circle cx="15" cy="10" r="2.3" fill="#F6B40E"/>
        <path d="M15 6.8L15.4 8.5L16.8 7.7L15.9 9.1L17.7 10L15.9 10.9L16.8 12.3L15.4 11.5L15 13.2L14.6 11.5L13.2 12.3L14.1 10.9L12.3 10L14.1 9.1L13.2 7.7L14.6 8.5Z" fill="#855B14"/>
      </svg>
    </span>
  );
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

function isHiddenFromShare(name: string) {
  return name.trim().toLocaleLowerCase("es") === "ale..";
}

function totalHits(row: StandingRow) {
  return row.predictionWins + row.exactHits + row.knockoutExactHits + row.knockoutScorerHits + row.groupHits;
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
  tieBreakRules: readonly string[];
  dailyRecap: {
    dateLabel: string;
    matchesPlayed: number;
    matches: Array<{ matchId: string; label: string; score: string; source: "api" | "manual" }>;
    leader: { submissionId: string; name: string; points: number; hits: number; exacts: number } | null;
    correctPredictions: number;
    exactPredictions: number;
    biggestRise: { name: string; positions: number } | null;
  } | null;
  updatedAt: string;
  error?: string;
};

type TablaComment = {
  id: string;
  name: string;
  comment: string;
  createdAt: string;
  reactions: TablaCommentReactions;
  replies: Array<{ id: string; name: string; comment: string; createdAt: string }>;
};

type CommentReplyDraft = { name: string; comment: string };

type CommentsResponse = {
  comments?: TablaComment[];
  comment?: TablaComment;
  viewerReaction?: TablaReactionEmoji;
  alreadyReacted?: boolean;
  error?: string;
};

type SortKey = "position" | "name" | "points" | "played" | "wins" | "losses" | "exacts" | "scorers" | "groups" | "totalHits";
type SortDirection = "asc" | "desc";

export default function TablaPage() {
  const [data, setData] = useState<StandingsResponse>({
    standings: [],
    standingsByClan: { "river-plate": [], "la-batata": [] },
    history: [],
    playedMatches: 0,
    decidedGroups: 0,
    knockoutFixtures: 0,
    playedKnockoutMatches: 0,
    tieBreakRules: [],
    dailyRecap: null,
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
  const [selectedCommentReactions, setSelectedCommentReactions] = useState<Record<string, TablaReactionEmoji>>({});
  const [openCommentReactionPicker, setOpenCommentReactionPicker] = useState<string | null>(null);
  const [reactionSaving, setReactionSaving] = useState<string | null>(null);
  const [openReplyForm, setOpenReplyForm] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, CommentReplyDraft>>({});
  const [replySaving, setReplySaving] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: "position", direction: "asc" });
  const [regName, setRegName] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regStatus, setRegStatus] = useState<"idle" | "saving" | "done">("idle");
  const [regMessage, setRegMessage] = useState("");
  const rows = data.standingsByClan?.["river-plate"] ?? data.standings.filter((row) => row.clan === "river-plate");
  const sortedRows = useMemo(() => {
    const originalPositionById = new Map(rows.map((row, index) => [row.submissionId, index + 1]));
    const valueForSort = (row: StandingRow) => {
      switch (sortConfig.key) {
        case "position":
          return originalPositionById.get(row.submissionId) ?? 0;
        case "name":
          return row.name;
        case "points":
          return row.totalPoints;
        case "played":
          return row.predictionMatchesPlayed;
        case "wins":
          return row.predictionWins;
        case "losses":
          return row.predictionLosses;
        case "exacts":
          return row.exactHits + row.knockoutExactHits;
        case "scorers":
          return row.knockoutScorerHits;
        case "groups":
          return row.groupHits;
        case "totalHits":
          return totalHits(row);
      }
    };

    return rows.toSorted((a, b) => {
      const aValue = valueForSort(a);
      const bValue = valueForSort(b);
      const comparison =
        typeof aValue === "string" && typeof bValue === "string"
          ? aValue.localeCompare(bValue, "es", { sensitivity: "base" })
          : Number(aValue) - Number(bValue);
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      return comparison * direction || a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }, [rows, sortConfig]);
  const knockoutRows = useMemo(
    () =>
      rows
        .map((row) => ({
          ...row,
          knockoutPlayed: row.pointAudit.filter((entry) => entry.category === "knockout").length,
        }))
        .toSorted(
          (a, b) =>
            b.knockoutPoints - a.knockoutPoints ||
            b.knockoutExactHits - a.knockoutExactHits ||
            b.knockoutWinnerHits - a.knockoutWinnerHits ||
            b.knockoutScorerHits - a.knockoutScorerHits ||
            a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
        ),
    [rows],
  );
  const visibleComments = showAllComments ? comments : comments.slice(0, 10);
  const hiddenCommentCount = Math.max(comments.length - visibleComments.length, 0);
  const playedWorldCupMatches = data.playedMatches + data.playedKnockoutMatches;
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

  function toggleSort(key: SortKey) {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "name" || key === "position" ? "asc" : "desc" };
    });
  }

  function sortButton(key: SortKey, label: string) {
    const active = sortConfig.key === key;
    const directionLabel = active ? (sortConfig.direction === "asc" ? "ascendente" : "descendente") : "sin ordenar";
    return (
      <button
        aria-label={`Ordenar por ${label}, ${directionLabel}`}
        className={`sortHeaderButton${active ? " active" : ""}`}
        onClick={() => toggleSort(key)}
        type="button"
      >
        <span>{label}</span>
      </button>
    );
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
    const shareRows = rows.filter((row) => !isHiddenFromShare(row.name));
    const height = tableTop + 56 + Math.max(shareRows.length, 1) * rowHeight + footerHeight;
    const red = "#fa3b22";
    const cream = "#fffdf7";
    const pale = "#fff1ec";
    const green = "#e5f7df";
    const ink = "#050505";
    const muted = "#625d55";
    const left = 36;
    const usable = width - left * 2;
    const col = {
      rank: 58,
      name: 275,
      points: 90,
      played: 75,
      wins: 75,
      losses: 75,
      exacts: 75,
      scorers: 70,
      groups: 85,
      totalHits: 105,
    };
    const headers = [
      { label: "#", x: left, width: col.rank, anchor: "middle" },
      { label: "Participante", x: left + col.rank, width: col.name, anchor: "start" },
      { label: "Pts", x: left + col.rank + col.name, width: col.points, anchor: "middle" },
      { label: "Jug", x: left + col.rank + col.name + col.points, width: col.played, anchor: "middle" },
      { label: "Gan", x: left + col.rank + col.name + col.points + col.played, width: col.wins, anchor: "middle" },
      { label: "Per", x: left + col.rank + col.name + col.points + col.played + col.wins, width: col.losses, anchor: "middle" },
      { label: "Exa", x: left + col.rank + col.name + col.points + col.played + col.wins + col.losses, width: col.exacts, anchor: "middle" },
      { label: "Gol", x: left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts, width: col.scorers, anchor: "middle" },
      { label: "Grupos", x: left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts + col.scorers, width: col.groups, anchor: "middle" },
      { label: "Aciertos", x: left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts + col.scorers + col.groups, width: col.totalHits, anchor: "middle" },
    ];
    const tableWidth = usable;
    const updated = data.updatedAt ? formatArgentinaDateTime(data.updatedAt) : "Actualizando";
    const shareRelegationCount = shareRows.length > 10 ? 3 : 2;
    const rowsSvg = shareRows.map((row, index) => {
      const y = tableTop + 56 + index * rowHeight;
      const fill = index === 0 ? green : index >= shareRows.length - shareRelegationCount ? "#ffe2dc" : index % 2 ? "#fff8ef" : cream;
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
        svgText(String(row.knockoutScorerHits), left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts + col.scorers / 2, y + 35, { size: 21, weight: 900, fill: ink, anchor: "middle" }),
        svgText(`${row.groupHits}/${data.decidedGroups}`, left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts + col.scorers + col.groups / 2, y + 35, { size: 21, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(totalHits(row)), left + col.rank + col.name + col.points + col.played + col.wins + col.losses + col.exacts + col.scorers + col.groups + col.totalHits / 2, y + 35, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
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
      ${svgText(`${shareRows.length} participantes · ${playedWorldCupMatches}/${worldCupTotalMatches} partidos · Actualizada ${updated}`, left + 16, 168, { size: 20, weight: 900, fill: muted })}
      ${headersSvg}
      ${rowsSvg || svgText("La tabla aparece cuando haya envios.", left + 20, tableTop + 98, { size: 28, weight: 900 })}
      <rect x="${left}" y="${height - 46}" width="${tableWidth}" height="2" fill="${ink}"/>
      ${svgText("Aciertos = ganados + exactos + goleadores + grupos acertados.", left, height - 18, { size: 18, weight: 900, fill: muted })}
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

  function buildKnockoutStandingsShareSvg() {
    const width = 960;
    const rowHeight = 56;
    const headerHeight = 188;
    const footerHeight = 58;
    const tableTop = headerHeight;
    const shareRows = knockoutRows.filter((row) => !isHiddenFromShare(row.name));
    const height = tableTop + 56 + Math.max(shareRows.length, 1) * rowHeight + footerHeight;
    const red = "#fa3b22";
    const cream = "#fffdf7";
    const pale = "#fff1ec";
    const green = "#e5f7df";
    const ink = "#050505";
    const muted = "#625d55";
    const left = 32;
    const usable = width - left * 2;
    const col = {
      rank: 60,
      name: 330,
      points: 105,
      played: 90,
      exacts: 100,
      winners: 105,
      scorers: 90,
    };
    const headers = [
      { label: "#", x: left, width: col.rank, anchor: "middle" },
      { label: "Participante", x: left + col.rank, width: col.name, anchor: "start" },
      { label: "Pts", x: left + col.rank + col.name, width: col.points, anchor: "middle" },
      { label: "Jug", x: left + col.rank + col.name + col.points, width: col.played, anchor: "middle" },
      { label: "Exa", x: left + col.rank + col.name + col.points + col.played, width: col.exacts, anchor: "middle" },
      { label: "Clasif", x: left + col.rank + col.name + col.points + col.played + col.exacts, width: col.winners, anchor: "middle" },
      { label: "Gol", x: left + col.rank + col.name + col.points + col.played + col.exacts + col.winners, width: col.scorers, anchor: "middle" },
    ];
    const updated = data.updatedAt ? formatArgentinaDateTime(data.updatedAt) : "Actualizando";
    const rowsSvg = shareRows.map((row, index) => {
      const y = tableTop + 56 + index * rowHeight;
      const fill = index === 0 ? green : index % 2 ? "#fff8ef" : cream;
      return [
        `<rect x="${left}" y="${y}" width="${usable}" height="${rowHeight}" fill="${fill}" stroke="#d3cec4" stroke-width="2"/>`,
        `<rect x="${left + col.rank + col.name}" y="${y}" width="${col.points}" height="${rowHeight}" fill="${red}" stroke="${ink}" stroke-width="2"/>`,
        svgText(String(index + 1), left + col.rank / 2, y + 36, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(compactText(row.name, 20), left + col.rank + 16, y + 36, { size: 24, weight: 900, fill: ink }),
        svgText(String(row.knockoutPoints), left + col.rank + col.name + col.points / 2, y + 39, { size: 34, weight: 900, fill: "#ffffff", anchor: "middle" }),
        svgText(String(row.knockoutPlayed), left + col.rank + col.name + col.points + col.played / 2, y + 36, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(row.knockoutExactHits), left + col.rank + col.name + col.points + col.played + col.exacts / 2, y + 36, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(row.knockoutWinnerHits), left + col.rank + col.name + col.points + col.played + col.exacts + col.winners / 2, y + 36, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
        svgText(String(row.knockoutScorerHits), left + col.rank + col.name + col.points + col.played + col.exacts + col.winners + col.scorers / 2, y + 36, { size: 22, weight: 900, fill: ink, anchor: "middle" }),
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
      ${svgText("CK", 58, 82, { size: 34, weight: 900, fill: "#fff" })}
      ${svgText("Copa Kahl", 114, 70, { size: 48, weight: 900, fill: "#fff" })}
      ${svgText("Tabla eliminatorias", 114, 108, { size: 24, weight: 900, fill: "#fff1ec" })}
      <rect x="${left}" y="144" width="${usable}" height="34" fill="#f4fff0" stroke="${ink}" stroke-width="2"/>
      ${svgText(`${shareRows.length} participantes · ${data.playedKnockoutMatches} cruces con resultado · Actualizada ${updated}`, left + 16, 168, { size: 20, weight: 900, fill: muted })}
      ${headersSvg}
      ${rowsSvg || svgText("La tabla aparece cuando haya cruces.", left + 20, tableTop + 98, { size: 28, weight: 900 })}
      <rect x="${left}" y="${height - 42}" width="${usable}" height="2" fill="${ink}"/>
      ${svgText("Solo puntos de eliminatorias: exactos, clasificados y goleadores.", left, height - 16, { size: 18, weight: 900, fill: muted })}
    </svg>`;
  }

  async function shareKnockoutStandingsImage() {
    if (knockoutRows.length === 0 || shareStatus === "working") return;
    setShareStatus("working");
    setShareMessage("");
    try {
      const file = await svgToPngFile(buildKnockoutStandingsShareSvg(), `copa-kahl-eliminatorias-${new Date().toISOString().slice(0, 10)}.png`);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Tabla eliminatorias Copa Kahl", text: "Tabla de eliminatorias de la Copa Kahl", files: [file] });
        setShareMessage("Imagen de eliminatorias lista para compartir.");
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        setShareMessage("Imagen de eliminatorias descargada.");
      }
    } catch (shareError) {
      setShareMessage(shareError instanceof Error ? shareError.message : "No se pudo generar la imagen.");
    } finally {
      setShareStatus("idle");
    }
  }

  const dateHighlights = useMemo(() => {
    if (rows.length === 0) return [];
    const topRow = rows[0];
    const historicHitsLeader = rows
      .map((row) => ({
        row,
        hits: row.exactHits + row.winnerHits + row.knockoutExactHits + row.knockoutWinnerHits + row.groupHits,
      }))
      .sort(
        (a, b) =>
          b.hits - a.hits ||
          b.row.totalPoints - a.row.totalPoints ||
          a.row.name.localeCompare(b.row.name, "es"),
      )[0];
    const last = rows.at(-1);
    return [
      { label: "Puntero", value: topRow?.name ?? "-", detail: `${topRow?.totalPoints ?? 0} pts` },
      ...(data.dailyRecap
        ? [
            {
              label: "Figura de la jornada",
              value: data.dailyRecap.leader?.name ?? "Sin datos",
              detail: data.dailyRecap.leader ? `${data.dailyRecap.leader.points} pts · ${data.dailyRecap.leader.hits} aciertos` : "-",
            },
          ]
        : []),
      {
        label: "Mas aciertos historicos",
        value: historicHitsLeader?.row.name ?? "Sin datos",
        detail: historicHitsLeader ? `${historicHitsLeader.hits} aciertos` : "-",
      },
      { label: "Ultimo de la B", value: last?.name ?? "-", detail: `${last?.totalPoints ?? 0} pts` },
    ];
  }, [data.dailyRecap, rows]);

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

  async function registerParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (regStatus === "saving") return;

    setRegStatus("saving");
    setRegMessage("");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, pin: regPin }),
      });
      const body = await readJsonResponse<{ ok?: boolean; name?: string; errors?: string[] }>(response);
      if (!response.ok || !body.ok) {
        throw new Error(body.errors?.[0] ?? "No se pudo crear el participante.");
      }

      setRegStatus("done");
      setRegPin("");
      setRegMessage(`Listo, ${body.name ?? regName.trim()}. Ya podes entrar a Editar Prode con tu PIN.`);
      await loadStandings();
    } catch (registrationError) {
      setRegStatus("idle");
      setRegMessage(registrationError instanceof Error ? registrationError.message : "No se pudo crear el participante.");
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
      setComments((current) => [body.comment as TablaComment, ...current]);
      setCommentText("");
      setCommentMessage("Comentario publicado.");
    } catch (commentError) {
      setCommentMessage(commentError instanceof Error ? commentError.message : "No se pudo guardar el comentario.");
    } finally {
      setCommentStatus("idle");
    }
  }

  async function addCommentReaction(commentId: string, reaction: TablaReactionEmoji) {
    if (selectedCommentReactions[commentId]) return;

    const reactionKey = `${commentId}:${reaction}`;
    setReactionSaving(reactionKey);
    setCommentMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, reaction }),
      });
      const body = await readJsonResponse<CommentsResponse>(response);
      if (!response.ok || body.error || !body.comment) throw new Error(body.error ?? "No se pudo guardar la reaccion.");

      setComments((current) => current.map((comment) => (comment.id === commentId ? body.comment as TablaComment : comment)));
      setSelectedCommentReactions((current) => {
        const next = { ...current, [commentId]: body.viewerReaction ?? reaction };
        window.localStorage.setItem(commentReactionStorageKey, JSON.stringify(next));
        return next;
      });
      setOpenCommentReactionPicker(null);
      if (body.alreadyReacted) setCommentMessage("Ya habias reaccionado a este comentario.");
    } catch (reactionError) {
      setCommentMessage(reactionError instanceof Error ? reactionError.message : "No se pudo guardar la reaccion.");
    } finally {
      setReactionSaving(null);
    }
  }

  function openReply(commentId: string) {
    setOpenReplyForm((current) => (current === commentId ? null : commentId));
    setReplyDrafts((current) => current[commentId] ? current : { ...current, [commentId]: { name: commentName, comment: "" } });
  }

  function updateReplyDraft(commentId: string, field: keyof CommentReplyDraft, value: string) {
    setReplyDrafts((current) => ({
      ...current,
      [commentId]: { name: current[commentId]?.name ?? commentName, comment: current[commentId]?.comment ?? "", [field]: value },
    }));
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, commentId: string) {
    event.preventDefault();
    const draft = replyDrafts[commentId] ?? { name: commentName, comment: "" };
    const name = draft.name.trim();
    const comment = draft.comment.trim();
    if (name.length < 2) {
      setCommentMessage("Escribi tu nombre para responder.");
      return;
    }
    if (comment.length < 2) {
      setCommentMessage("Escribi una respuesta.");
      return;
    }

    setReplySaving(commentId);
    setCommentMessage("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: commentId, name, comment }),
      });
      const body = await readJsonResponse<CommentsResponse>(response);
      if (!response.ok || body.error || !body.comment) throw new Error(body.error ?? "No se pudo guardar la respuesta.");
      setComments((current) => current.map((entry) => (entry.id === commentId ? body.comment as TablaComment : entry)));
      setReplyDrafts((current) => ({ ...current, [commentId]: { name, comment: "" } }));
      setOpenReplyForm(null);
      setCommentMessage("Respuesta publicada.");
    } catch (replyError) {
      setCommentMessage(replyError instanceof Error ? replyError.message : "No se pudo guardar la respuesta.");
    } finally {
      setReplySaving(null);
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
    try {
      const raw = window.localStorage.getItem(commentReactionStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as Record<string, unknown>;
      const selected = Object.fromEntries(
        Object.entries(stored).map(([commentId, reactions]) => [
          commentId,
          Array.isArray(reactions)
            ? reactions.find((reaction): reaction is TablaReactionEmoji => tablaReactionEmojis.includes(reaction as TablaReactionEmoji))
            : tablaReactionEmojis.includes(reactions as TablaReactionEmoji)
              ? reactions
              : undefined,
        ]),
      ) as Record<string, TablaReactionEmoji>;
      setSelectedCommentReactions(selected);
    } catch {
      window.localStorage.removeItem(commentReactionStorageKey);
    }
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
          <p className="eyebrow" style={{ background: "#fef08a", color: "#854d0e", border: "2px solid #000", fontWeight: 900 }}>
            PRÓXIMAMENTE 🏆
          </p>
          <h1>Copa Se mató Pavón</h1>
          <p className="heroCopy">
            La nueva edición oficial del prode para las definiciones más calientes del fútbol argentino y sudamericano. Prepará tus pronósticos!
          </p>
        </div>
      </section>

      <section className="registrationPanel" aria-labelledby="registration-title">
        <div className="registrationCopy">
          <p className="eyebrow">NUEVO PARTICIPANTE</p>
          <h2 id="registration-title">Anotate a la Copa.</h2>
          <p>Elegi tu nombre y un PIN de 4 a 10 numeros. Despues usalos para entrar y editar tu prode.</p>
        </div>
        <form className="registrationForm" onSubmit={registerParticipant}>
          <label className="registrationField">
            <span>Nombre</span>
            <input
              autoComplete="nickname"
              maxLength={40}
              minLength={2}
              onChange={(event) => setRegName(event.target.value)}
              placeholder="Tu nombre"
              required
              value={regName}
            />
          </label>
          <label className="registrationField">
            <span>PIN</span>
            <input
              autoComplete="new-password"
              inputMode="numeric"
              maxLength={10}
              minLength={4}
              onChange={(event) => setRegPin(event.target.value.replace(/\D/g, "").slice(0, 10))}
              pattern="[0-9]{4,10}"
              placeholder="4 a 10 numeros"
              required
              type="password"
              value={regPin}
            />
          </label>
          <button className="primaryAction registrationSubmit" disabled={regStatus === "saving"} type="submit">
            {regStatus === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            Anotarme
          </button>
        </form>
        {regMessage ? (
          <p className={`registrationMessage ${regStatus === "done" ? "successMessage" : "errorMessage"}`} role="status">
            {regMessage}
            {regStatus === "done" ? <Link href="/editar_prode">Ir a Editar Prode</Link> : null}
          </p>
        ) : null}
      </section>

      {/* ANUNCIO OFICIAL PROXIMAMENTE */}
      <section className="proximamentePanel" style={{ padding: "28px 24px", textAlign: "center" }}>
        <div className="panelHeader" style={{ textAlign: "center" }}>
          <p className="eyebrow" style={{ background: "#ef4444", color: "#fff", border: "2px solid #000", fontWeight: 900, display: "inline-block", padding: "5px 14px", borderRadius: "12px", fontSize: "0.85rem", margin: "0 auto 12px" }}>
            🔥 Edición Confirmada
          </p>
          <h2 style={{ fontSize: "1.65rem", margin: "8px 0", fontWeight: 900, textAlign: "center" }}>
            Competencias que disputan la Copa Se mató Pavón
          </h2>
          <p style={{ fontSize: "1.05rem", lineHeight: "1.5", textAlign: "center", maxWidth: "720px", margin: "0 auto 16px" }}>
            Esta nueva copa unificará los pronósticos de las fases decisivas y finales de cuatro competiciones estelares:
          </p>
        </div>

        <div className="reportCardsGrid" style={{ marginTop: "20px" }}>
          <article className="reportCard proximamenteCard" style={{ textAlign: "center" }}>
            <header style={{ justifyContent: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.6rem" }}>🌎</span>
              <h3 style={{ margin: 0 }}>COPA SUDAMERICANA</h3>
              <span className="reportPts">Semifinales + Final</span>
            </header>
            <p style={{ textAlign: "center", margin: "8px 0 0" }}>Partidos de ida y vuelta de semifinales y la gran definición por el título sudamericano.</p>
          </article>

          <article className="reportCard proximamenteCard" style={{ textAlign: "center" }}>
            <header style={{ justifyContent: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.6rem" }}>🏆</span>
              <h3 style={{ margin: 0 }}>COPA LIBERTADORES</h3>
              <span className="reportPts">Semifinales + Final</span>
            </header>
            <p style={{ textAlign: "center", margin: "8px 0 0" }}>Los 4 mejores del continente definiendo a la gloria eterna.</p>
          </article>

          <article className="reportCard proximamenteCard" style={{ textAlign: "center" }}>
            <header style={{ justifyContent: "center", gap: "10px" }}>
              <ArgentinaFlagBadge />
              <h3 style={{ margin: 0 }}>COPA ARGENTINA</h3>
              <span className="reportPts">Fase Eliminatoria</span>
            </header>
            <p style={{ textAlign: "center", margin: "8px 0 0" }}>Cruces mano a mano a todo o nada en canchas neutrales del fútbol argentino.</p>
          </article>

          <article className="reportCard proximamenteCard" style={{ textAlign: "center" }}>
            <header style={{ justifyContent: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.6rem" }}>⚽</span>
              <h3 style={{ margin: 0 }}>COPA DE LA LIGA</h3>
              <span className="reportPts">Fase Final</span>
            </header>
            <p style={{ textAlign: "center", margin: "8px 0 0" }}>Los playoffs decisivos de la Primera División del fútbol argentino.</p>
          </article>
        </div>

        <div className="proximamenteFooter" style={{ justifyContent: "center", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span className="historyBadge championTag" style={{ fontSize: "0.9rem", padding: "8px 16px", fontWeight: 800 }}>
              ⏳ Estado: Carga de pronósticos Próximamente
            </span>
          </div>
          <a className="primaryAction light" href="/campeones" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            🏆 Ver Historial de Copas y Campeones
          </a>
        </div>
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
              <div className="commentReactionPicker" aria-label={`Reacciones para el comentario de ${comment.name}`}>
                {(() => {
                  const selectedReaction = selectedCommentReactions[comment.id];
                  const totalReactions = tablaReactionEmojis.reduce((total, reaction) => total + (comment.reactions?.[reaction] ?? 0), 0);
                  const isOpen = openCommentReactionPicker === comment.id;
                  const isSaving = reactionSaving?.startsWith(`${comment.id}:`) ?? false;
                  return (
                    <>
                      {!selectedReaction ? (
                        <button
                          aria-expanded={isOpen}
                          aria-haspopup="true"
                          aria-label="Elegir una reaccion"
                          className="commentReactionTrigger"
                          disabled={isSaving}
                          onClick={() => setOpenCommentReactionPicker((current) => (current === comment.id ? null : comment.id))}
                          type="button"
                        >
                          <SmilePlus size={16} aria-hidden="true" />
                          <ChevronDown size={15} aria-hidden="true" />
                        </button>
                      ) : null}
                      {isOpen ? (
                        <div className="commentReactionOptions" role="group" aria-label="Elegir una reaccion">
                          {tablaReactionEmojis.map((reaction) => {
                            const count = comment.reactions?.[reaction] ?? 0;
                            return (
                              <button
                                aria-label={`Reaccionar ${reaction}${count > 0 ? `, ${count} reacciones` : ""}`}
                                className="commentReaction"
                                disabled={isSaving}
                                key={reaction}
                                onClick={() => void addCommentReaction(comment.id, reaction)}
                                type="button"
                              >
                                <span aria-hidden="true">{reaction}</span>
                                {count > 0 ? <b>{count}</b> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {totalReactions > 0 ? (
                        <div className="commentReactionCounts" aria-label={`${totalReactions} reacciones`}>
                          {tablaReactionEmojis.map((reaction) => {
                            const count = comment.reactions?.[reaction] ?? 0;
                            return count > 0 ? <span key={reaction}>{reaction} {count}</span> : null;
                          })}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
              <button className="commentReplyButton" onClick={() => openReply(comment.id)} type="button">
                {openReplyForm === comment.id ? "Cerrar respuesta" : "Responder"}
                {comment.replies.length > 0 ? <span>{comment.replies.length}</span> : null}
              </button>
              {openReplyForm === comment.id ? (
                <form className="commentReplyForm" onSubmit={(event) => void submitReply(event, comment.id)}>
                  <label>
                    <span>Nombre</span>
                    <input
                      maxLength={40}
                      onChange={(event) => updateReplyDraft(comment.id, "name", event.target.value)}
                      placeholder="Tu nombre"
                      value={replyDrafts[comment.id]?.name ?? commentName}
                    />
                  </label>
                  <label>
                    <span>Respuesta</span>
                    <textarea
                      maxLength={240}
                      onChange={(event) => updateReplyDraft(comment.id, "comment", event.target.value)}
                      placeholder={`Responder a ${comment.name}...`}
                      value={replyDrafts[comment.id]?.comment ?? ""}
                    />
                  </label>
                  <button className="commentReplySubmit" disabled={replySaving === comment.id} type="submit">
                    {replySaving === comment.id ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                    Publicar respuesta
                  </button>
                </form>
              ) : null}
              {comment.replies.length > 0 ? (
                <div className="commentReplies" aria-label={`Respuestas al comentario de ${comment.name}`}>
                  {comment.replies.map((reply) => (
                    <article className="commentReply" key={reply.id}>
                      <strong>{reply.name}</strong>
                      <p>{reply.comment}</p>
                      <small>{formatArgentinaDateTime(reply.createdAt)}</small>
                    </article>
                  ))}
                </div>
              ) : null}
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
