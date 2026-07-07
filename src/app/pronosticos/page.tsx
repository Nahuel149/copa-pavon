"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BarChart3, Download, ExternalLink, Loader2, PlayCircle, Share2 } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { formatArgentinaDateTime, formatArgentinaTime } from "@/lib/argentina-time";
import { readJsonResponse } from "@/lib/client-json";
import {
  groups,
  knockoutStageLabels,
  knockoutStages,
  matches,
  roundLabels,
  type GroupId,
  type KnockoutFixture,
  type Match,
  type MatchRound,
} from "@/lib/matches";
import {
  choiceLabel,
  getKnockoutUnderdogBonus,
  scoreKnockoutPredictionForFixture,
  serializeKnockoutPrediction,
  serializePrediction,
  type MatchResult,
  type Prediction,
  type PredictionChoice,
  type ResultStore,
  type StandingRow,
  type Submission,
} from "@/lib/prode";

type PublicSubmission = Omit<Submission, "pinHash">;

type PronosticosResponse = {
  submissions: PublicSubmission[];
  standings: StandingRow[];
  results: ResultStore;
  knockoutVisibility?: Record<string, { label: string; public: boolean; unlockAt: string }>;
  updatedAt: string;
};

type OutcomeCount = Record<PredictionChoice, number>;

const choiceOrder: PredictionChoice[] = ["home", "draw", "away"];
const dayLabels = Array.from(new Set(matches.map((match) => match.dateLabel)));

function emptyOutcomeCount(): OutcomeCount {
  return { home: 0, draw: 0, away: 0 };
}

function predictionOutcome(prediction: Prediction | undefined) {
  if (!prediction) return null;
  return prediction.type === "score" ? prediction.outcome : prediction.choice;
}

function outcomeLabel(choice: PredictionChoice, match: Match) {
  return choiceLabel(choice, match.home, match.away);
}

function percent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function resultLabel(result: MatchResult | undefined) {
  return result ? `${result.homeGoals}-${result.awayGoals}` : "Pendiente";
}

function scorersLabel(result: MatchResult | undefined, side: "home" | "away") {
  const scorers = result?.goalScorers?.filter((scorer) => scorer.team === side) ?? [];
  if (scorers.length === 0) return "";
  return scorers.map((scorer) => `${scorer.name}${scorer.minute ? ` ${scorer.minute}` : ""}`).join(", ");
}

function mediaEmbedUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shortsMatch = url.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shortsMatch?.[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      const embedMatch = url.pathname.match(/^\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }
    if (url.hostname === "dai.ly") {
      const id = url.pathname.replace("/", "").split("_")[0];
      return id ? `https://www.dailymotion.com/embed/video/${id}` : "";
    }
    if (url.hostname.endsWith("dailymotion.com")) {
      const directMatch = url.pathname.match(/^\/video\/([^/?_]+)/);
      if (directMatch?.[1]) return `https://www.dailymotion.com/embed/video/${directMatch[1]}`;
      const embedMatch = url.pathname.match(/^\/embed\/video\/([^/?_]+)/);
      if (embedMatch?.[1]) return `https://www.dailymotion.com/embed/video/${embedMatch[1]}`;
    }
  } catch {
    return "";
  }
  return "";
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

function svgText(value: string, x: number, y: number, options: { size?: number; weight?: number; fill?: string; anchor?: string } = {}) {
  const size = options.size ?? 26;
  const weight = options.weight ?? 800;
  const fill = options.fill ?? "#050505";
  const anchor = options.anchor ? ` text-anchor="${options.anchor}"` : "";
  return `<text x="${x}" y="${y}" font-family="Trebuchet MS, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor}>${escapeXml(value)}</text>`;
}

function svgPredictionText(value: string, x: number, y: number) {
  const parts = value.split(" · ");
  const firstLine = parts.length > 1 ? parts.slice(0, 2).join(" · ") : value;
  const secondLine = parts.length > 2 ? parts.slice(2).join(" · ") : "";
  return `<text x="${x}" y="${y}" font-family="Trebuchet MS, Arial, sans-serif" font-size="21" font-weight="900" fill="#050505">
    <tspan x="${x}" dy="0">${escapeXml(firstLine)}</tspan>
    ${secondLine ? `<tspan x="${x}" dy="24">${escapeXml(secondLine)}</tspan>` : ""}
  </text>`;
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
    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error("No se pudo generar el PNG."));
      }, "image/png");
    });
    return new File([pngBlob], filename, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PronosticosPage() {
  const [data, setData] = useState<PronosticosResponse | null>(null);
  const [activeRound, setActiveRound] = useState<MatchRound>(1);
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0].id);
  const [selectedKnockoutFixtureId, setSelectedKnockoutFixtureId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<GroupId>(groups[0].id);
  const [shareDay, setShareDay] = useState(matches[0].dateLabel);
  const [shareStatus, setShareStatus] = useState<"idle" | "working">("idle");
  const [shareMessage, setShareMessage] = useState("");
  const [knockoutShareStatus, setKnockoutShareStatus] = useState<"idle" | "working">("idle");
  const [knockoutShareMessage, setKnockoutShareMessage] = useState("");
  const [showGoalVideo, setShowGoalVideo] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState("");

  async function loadData() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/pronosticos", { cache: "no-store" });
      const body = await readJsonResponse<PronosticosResponse & { error?: string }>(response);
      if (!response.ok || body.error) throw new Error(body.error ?? "No se pudieron cargar los pronosticos.");
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pronosticos.");
    } finally {
      setStatus("ready");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setShowGoalVideo(false);
  }, [selectedMatchId]);

  useEffect(() => {
    const stageOrder = new Map(knockoutStages.map((stage, index) => [stage, index]));
    const firstFixture = data?.results.knockoutFixtures
      .toSorted((a, b) => {
        const stageDiff = (stageOrder.get(b.stage) ?? 0) - (stageOrder.get(a.stage) ?? 0);
        if (stageDiff !== 0) return stageDiff;
        return a.order - b.order;
      })[0];
    if (!selectedKnockoutFixtureId && firstFixture) setSelectedKnockoutFixtureId(firstFixture.id);
  }, [data?.results.knockoutFixtures, selectedKnockoutFixtureId]);

  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? roundMatches[0] ?? matches[0];
  const knockoutFixtures = data?.results.knockoutFixtures ?? [];
  const knockoutStageGroups = useMemo(() => {
    const stageOrder = new Map(knockoutStages.map((stage, index) => [stage, index]));
    const stagesInFixtures = Array.from(new Set(knockoutFixtures.map((fixture) => fixture.stage))).toSorted(
      (a, b) => (stageOrder.get(b) ?? -1) - (stageOrder.get(a) ?? -1),
    );
    return stagesInFixtures
      .map((stage) => ({
        stage,
        fixtures: knockoutFixtures.filter((fixture) => fixture.stage === stage).toSorted((a, b) => a.order - b.order),
      }))
      .filter((group) => group.fixtures.length > 0);
  }, [knockoutFixtures]);
  const selectedKnockoutFixture =
    knockoutFixtures.find((fixture) => fixture.id === selectedKnockoutFixtureId) ??
    knockoutStageGroups[0]?.fixtures[0] ??
    knockoutFixtures[0];
  const selectedKnockoutStage = selectedKnockoutFixture?.stage ?? knockoutStageGroups[0]?.stage;
  const visibleKnockoutFixtures =
    knockoutStageGroups.find((group) => group.stage === selectedKnockoutStage)?.fixtures ?? knockoutFixtures;
  const shareDayMatches = useMemo(() => matches.filter((match) => match.dateLabel === shareDay), [shareDay]);
  const resultByMatch = useMemo(
    () => new Map((data?.results.matchResults ?? []).map((result) => [result.matchId, result])),
    [data?.results.matchResults],
  );
  const standingPositionById = useMemo(
    () => new Map((data?.standings ?? []).map((standing, index) => [standing.submissionId, index + 1])),
    [data?.standings],
  );
  const knockoutResultByFixture = useMemo(
    () => new Map((data?.results.knockoutResults ?? []).map((result) => [result.fixtureId, result])),
    [data?.results.knockoutResults],
  );
  const selectedKnockoutVisibility = selectedKnockoutFixture ? data?.knockoutVisibility?.[selectedKnockoutFixture.id] : undefined;
  const selectedKnockoutIsPublic = Boolean(selectedKnockoutFixture && selectedKnockoutVisibility?.public);
  const selectedKnockoutResult = selectedKnockoutFixture ? knockoutResultByFixture.get(selectedKnockoutFixture.id) : undefined;
  const knockoutPredictionRows = useMemo(() => {
    if (!selectedKnockoutFixture || !selectedKnockoutIsPublic) return [];
    return (data?.submissions ?? [])
      .map((submission) => {
        const prediction = submission.knockoutPredictions?.find((item) => item.fixtureId === selectedKnockoutFixture.id);
        const score = scoreKnockoutPredictionForFixture(prediction, selectedKnockoutResult, selectedKnockoutFixture, {
          underdogBonus: getKnockoutUnderdogBonus(prediction, selectedKnockoutResult, selectedKnockoutFixture, data?.submissions ?? []),
        });
        return {
          submission,
          prediction,
          score,
          position: standingPositionById.get(submission.id) ?? 0,
          label: prediction ? serializeKnockoutPrediction(prediction) : "Sin cargar",
        };
      })
      .sort((a, b) => (a.position || 9999) - (b.position || 9999) || a.submission.name.localeCompare(b.submission.name, "es"));
  }, [data?.submissions, selectedKnockoutFixture, selectedKnockoutIsPublic, selectedKnockoutResult, standingPositionById]);
  const knockoutShareRows = useMemo(
    () => knockoutPredictionRows.filter((row) => !isHiddenFromShare(row.submission.name)),
    [knockoutPredictionRows],
  );

  const predictionRows = useMemo(() => {
    return (data?.submissions ?? [])
      .map((submission) => {
        const prediction = submission.predictions.find((item) => item.matchId === selectedMatch.id);
        return {
          submission,
          prediction,
          position: standingPositionById.get(submission.id) ?? 0,
          label: prediction ? serializePrediction(prediction) : "Sin cargar",
        };
      })
      .sort((a, b) => (a.position || 9999) - (b.position || 9999) || a.submission.name.localeCompare(b.submission.name, "es"));
  }, [data?.submissions, selectedMatch.id, standingPositionById]);

  const shareRows = useMemo(() => {
    return (data?.submissions ?? [])
      .filter((submission) => !isHiddenFromShare(submission.name))
      .map((submission) => ({
        submission,
        position: standingPositionById.get(submission.id) ?? 0,
        predictions: shareDayMatches.map((match) => {
          const prediction = submission.predictions.find((item) => item.matchId === match.id);
          return prediction ? serializePrediction(prediction) : "-";
        }),
      }))
      .sort((a, b) => (a.position || 9999) - (b.position || 9999) || a.submission.name.localeCompare(b.submission.name, "es"));
  }, [data?.submissions, shareDayMatches, standingPositionById]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const groupPredictionRows = useMemo(() => {
    return (data?.submissions ?? [])
      .map((submission) => {
        const prediction = submission.groupPredictions?.find((item) => item.groupId === selectedGroup.id);
        return {
          submission,
          prediction,
          position: standingPositionById.get(submission.id) ?? 0,
          label: prediction ? `${prediction.first} / ${prediction.second}` : "Sin cargar",
        };
      })
      .sort((a, b) => (a.position || 9999) - (b.position || 9999) || a.submission.name.localeCompare(b.submission.name, "es"));
  }, [data?.submissions, selectedGroup.id, standingPositionById]);

  const aggregates = useMemo(() => {
    const outcomes = emptyOutcomeCount();
    const scoreCounts = new Map<string, number>();

    for (const submission of data?.submissions ?? []) {
      const prediction = submission.predictions.find((item) => item.matchId === selectedMatch.id);
      const outcome = predictionOutcome(prediction);
      if (outcome) outcomes[outcome] += 1;
      if (prediction?.type === "score") {
        const score = `${prediction.homeGoals}-${prediction.awayGoals}`;
        scoreCounts.set(score, (scoreCounts.get(score) ?? 0) + 1);
      }
    }

    const topScores = [...scoreCounts.entries()]
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => b.count - a.count || a.score.localeCompare(b.score))
      .slice(0, 5);

    return { outcomes, topScores };
  }, [data?.submissions, selectedMatch.id]);

  const selectedHighlights = useMemo(() => {
    const submissions = data?.submissions ?? [];
    if (submissions.length === 0) return [];
    const rowsByOutcome = choiceOrder.map((choice) => {
      const names = submissions
        .filter((submission) => predictionOutcome(submission.predictions.find((item) => item.matchId === selectedMatch.id)) === choice)
        .map((submission) => submission.name);
      return { choice, names };
    });
    const majority = rowsByOutcome.toSorted((a, b) => b.names.length - a.names.length)[0];
    const unique = rowsByOutcome.find((item) => item.names.length === 1);
    const result = resultByMatch.get(selectedMatch.id);
    const nobodyHit =
      result &&
      submissions.every((submission) => predictionOutcome(submission.predictions.find((item) => item.matchId === selectedMatch.id)) !== result.outcome);
    return [
      majority?.names.length ? `Mayoria eligio ${outcomeLabel(majority.choice, selectedMatch)} (${majority.names.length}).` : "",
      unique ? `El unico con ${outcomeLabel(unique.choice, selectedMatch)} fue ${unique.names[0]}.` : "",
      nobodyHit ? "Nadie acerto el ganador de este partido." : "",
    ].filter(Boolean);
  }, [data?.submissions, resultByMatch, selectedMatch]);

  const roundStats = useMemo(() => {
    const submissions = data?.submissions ?? [];
    const results = resultByMatch;
    let mostPicked: { label: string; count: number; total: number } | null = null;
    let hardest: { label: string; missed: number; total: number } | null = null;
    let exactHits = 0;
    let exactTotal = 0;
    const popularByMatch = new Map<string, PredictionChoice>();

    for (const match of roundMatches) {
      const outcomes = emptyOutcomeCount();
      let total = 0;
      for (const submission of submissions) {
        const prediction = submission.predictions.find((item) => item.matchId === match.id);
        const outcome = predictionOutcome(prediction);
        if (!outcome) continue;
        outcomes[outcome] += 1;
        total += 1;
        if (match.exactScore && prediction?.type === "score") {
          const result = results.get(match.id);
          if (result) {
            exactTotal += 1;
            if (prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals) exactHits += 1;
          }
        }
      }

      const topChoice = choiceOrder
        .map((choice) => ({ choice, count: outcomes[choice] }))
        .sort((a, b) => b.count - a.count)[0];
      if (topChoice && topChoice.count > 0) {
        popularByMatch.set(match.id, topChoice.choice);
        if (!mostPicked || topChoice.count > mostPicked.count) {
          mostPicked = { label: `${outcomeLabel(topChoice.choice, match)} en #${match.order}`, count: topChoice.count, total };
        }
      }

      const result = results.get(match.id);
      if (result && total > 0) {
        const missed = submissions.reduce((sum, submission) => {
          const prediction = submission.predictions.find((item) => item.matchId === match.id);
          const outcome = predictionOutcome(prediction);
          return outcome && outcome !== result.outcome ? sum + 1 : sum;
        }, 0);
        if (!hardest || missed > hardest.missed) {
          hardest = { label: `#${match.order} ${match.home} vs ${match.away}`, missed, total };
        }
      }
    }

    const risky = submissions
      .map((submission) => {
        const different = roundMatches.reduce((sum, match) => {
          const popular = popularByMatch.get(match.id);
          const prediction = submission.predictions.find((item) => item.matchId === match.id);
          const outcome = predictionOutcome(prediction);
          return popular && outcome && outcome !== popular ? sum + 1 : sum;
        }, 0);
        return { name: submission.name, different };
      })
      .sort((a, b) => b.different - a.different || a.name.localeCompare(b.name, "es"))[0];

    return {
      mostPicked,
      risky,
      exactRate: exactTotal > 0 ? Math.round((exactHits / exactTotal) * 100) : null,
      exactHits,
      exactTotal,
      hardest,
    };
  }, [data?.submissions, resultByMatch, roundMatches]);

  const totalParticipants = data?.submissions.length ?? 0;
  const selectedResult = resultByMatch.get(selectedMatch.id);
  const selectedHighlightUrl = selectedResult?.highlightUrl;
  const selectedEmbedUrl = mediaEmbedUrl(selectedHighlightUrl);
  const homeScorersLabel = scorersLabel(selectedResult, "home");
  const awayScorersLabel = scorersLabel(selectedResult, "away");
  const hasGoalScorers = Boolean(homeScorersLabel || awayScorersLabel);

  function buildShareSvg() {
    const width = 1080;
    const rowHeight = 48;
    const headerHeight = 220;
    const footerHeight = 70;
    const tableTop = headerHeight;
    const height = tableTop + 56 + Math.max(shareRows.length, 1) * rowHeight + footerHeight;
    const left = 36;
    const rankWidth = 58;
    const nameWidth = 210;
    const available = width - left * 2 - rankWidth - nameWidth;
    const matchWidth = Math.floor(available / Math.max(shareDayMatches.length, 1));
    const red = "#fa3b22";
    const cream = "#fffdf7";
    const pale = "#fff1ec";
    const ink = "#050505";
    const matchHeaders = shareDayMatches.map((match, index) => {
      const x = left + rankWidth + nameWidth + index * matchWidth;
      return [
        `<rect x="${x}" y="${tableTop}" width="${matchWidth}" height="56" fill="${index % 2 ? "#f7fff2" : "#fff7ef"}" stroke="${ink}" stroke-width="2"/>`,
        svgText(`#${match.order}`, x + 12, tableTop + 21, { size: 15, weight: 900, fill: "#5f5a54" }),
        svgText(`${compactText(match.home, 8)} vs ${compactText(match.away, 8)}`, x + matchWidth / 2, tableTop + 43, {
          size: shareDayMatches.length > 4 ? 15 : 17,
          weight: 900,
          anchor: "middle",
        }),
      ].join("");
    });

    const rows = shareRows.map((row, index) => {
      const y = tableTop + 56 + index * rowHeight;
      const fill = index % 2 === 0 ? "#fffdf7" : "#fff2ed";
      const cells = row.predictions.map((prediction, predictionIndex) => {
        const x = left + rankWidth + nameWidth + predictionIndex * matchWidth;
        return [
          `<rect x="${x}" y="${y}" width="${matchWidth}" height="${rowHeight}" fill="${fill}" stroke="#bdb7ae" stroke-width="1"/>`,
          svgText(compactText(prediction, shareDayMatches.length > 4 ? 10 : 12), x + matchWidth / 2, y + 31, {
            size: shareDayMatches.length > 4 ? 17 : 20,
            weight: 900,
            anchor: "middle",
          }),
        ].join("");
      });
      return [
        `<rect x="${left}" y="${y}" width="${rankWidth}" height="${rowHeight}" fill="${red}" stroke="${ink}" stroke-width="1"/>`,
        svgText(`${row.position || index + 1}`, left + rankWidth / 2, y + 31, { size: 20, weight: 900, fill: "#fff", anchor: "middle" }),
        `<rect x="${left + rankWidth}" y="${y}" width="${nameWidth}" height="${rowHeight}" fill="${fill}" stroke="#bdb7ae" stroke-width="1"/>`,
        svgText(compactText(row.submission.name, 18), left + rankWidth + 12, y + 31, { size: 20, weight: 900 }),
        ...cells,
      ].join("");
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${cream}"/>
        <circle cx="880" cy="150" r="260" fill="#f7de8b" opacity="0.22"/>
        <circle cx="180" cy="760" r="320" fill="#dff5dc" opacity="0.2"/>
        <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${ink}" stroke-width="5"/>
        <rect x="42" y="44" width="78" height="78" fill="${red}" stroke="${ink}" stroke-width="5" transform="rotate(-3 81 83)"/>
        ${svgText("CK", 81, 93, { size: 30, weight: 900, fill: "#fff", anchor: "middle" })}
        ${svgText("Copa Kahl", 140, 78, { size: 44, weight: 900 })}
        ${svgText(`Pronosticos ${shareDay}`, 140, 116, { size: 25, weight: 900, fill: "#5f5a54" })}
        ${svgText(`${shareRows.length} participantes · ${shareDayMatches.length} partidos`, 42, 175, { size: 27, weight: 900 })}
        <rect x="${left}" y="${tableTop}" width="${rankWidth}" height="56" fill="${red}" stroke="${ink}" stroke-width="2"/>
        ${svgText("#", left + rankWidth / 2, tableTop + 36, { size: 20, weight: 900, fill: "#fff", anchor: "middle" })}
        <rect x="${left + rankWidth}" y="${tableTop}" width="${nameWidth}" height="56" fill="${pale}" stroke="${ink}" stroke-width="2"/>
        ${svgText("Participante", left + rankWidth + 14, tableTop + 36, { size: 20, weight: 900 })}
        ${matchHeaders.join("")}
        ${rows.join("")}
        ${svgText("copa-kahl.onrender.com", width / 2, height - 28, { size: 22, weight: 900, fill: "#5f5a54", anchor: "middle" })}
      </svg>
    `;
  }

  async function downloadShareCard() {
    setShareStatus("working");
    setShareMessage("");
    try {
      const file = await svgToPngFile(buildShareSvg(), `copa-kahl-${shareDay.replace(/\s+/g, "-").toLowerCase()}.png`);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShareMessage("Imagen descargada.");
    } catch (downloadError) {
      setShareMessage(downloadError instanceof Error ? downloadError.message : "No se pudo descargar la imagen.");
    } finally {
      setShareStatus("idle");
    }
  }

  async function shareCard() {
    setShareStatus("working");
    setShareMessage("");
    try {
      const file = await svgToPngFile(buildShareSvg(), `copa-kahl-${shareDay.replace(/\s+/g, "-").toLowerCase()}.png`);
      const shareData = {
        title: `Copa Kahl ${shareDay}`,
        text: `Pronosticos Copa Kahl ${shareDay}`,
        files: [file],
      };
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setShareMessage("Imagen lista para compartir.");
      } else {
        await downloadShareCard();
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        setShareMessage("");
      } else {
        setShareMessage(shareError instanceof Error ? shareError.message : "No se pudo compartir la imagen.");
      }
    } finally {
      setShareStatus("idle");
    }
  }

  function buildKnockoutShareSvg() {
    if (!selectedKnockoutFixture) throw new Error("No hay cruce seleccionado.");
    const width = 1080;
    const rowHeight = 68;
    const headerHeight = 250;
    const footerHeight = 72;
    const tableTop = headerHeight;
    const height = tableTop + 58 + Math.max(knockoutShareRows.length, 1) * rowHeight + footerHeight;
    const left = 36;
    const rankWidth = 64;
    const nameWidth = 345;
    const pointsWidth = 86;
    const predictionWidth = width - left * 2 - rankWidth - nameWidth - pointsWidth;
    const red = "#fa3b22";
    const cream = "#fffdf7";
    const pale = "#fff1ec";
    const ink = "#050505";
    const verdictFill = {
      exact: "#dff3dc",
      partial: "#fff2c2",
      miss: "#ffe0d7",
      pending: "#fffdf7",
    } as const;

    const rows = knockoutShareRows.map((row, index) => {
      const y = tableTop + 58 + index * rowHeight;
      const fill = verdictFill[row.score.verdict] ?? "#fffdf7";
      const points = selectedKnockoutResult ? `${row.score.totalPoints} pts` : "Pendiente";
      return [
        `<rect x="${left}" y="${y}" width="${rankWidth}" height="${rowHeight}" fill="${red}" stroke="${ink}" stroke-width="1"/>`,
        svgText(`${row.position || index + 1}`, left + rankWidth / 2, y + 35, { size: 22, weight: 900, fill: "#fff", anchor: "middle" }),
        `<rect x="${left + rankWidth}" y="${y}" width="${nameWidth}" height="${rowHeight}" fill="${fill}" stroke="#bdb7ae" stroke-width="1"/>`,
        svgText(compactText(row.submission.name, 26), left + rankWidth + 14, y + 35, { size: 22, weight: 900 }),
        `<rect x="${left + rankWidth + nameWidth}" y="${y}" width="${predictionWidth}" height="${rowHeight}" fill="${fill}" stroke="#bdb7ae" stroke-width="1"/>`,
        svgPredictionText(row.label, left + rankWidth + nameWidth + 18, y + 30),
        `<rect x="${left + rankWidth + nameWidth + predictionWidth}" y="${y}" width="${pointsWidth}" height="${rowHeight}" fill="${fill}" stroke="#bdb7ae" stroke-width="1"/>`,
        svgText(points, width - left - 12, y + 42, { size: 19, weight: 900, anchor: "end", fill: "#5f5a54" }),
      ].join("");
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${cream}"/>
        <circle cx="870" cy="155" r="270" fill="#f7de8b" opacity="0.22"/>
        <circle cx="150" cy="660" r="290" fill="#dff5dc" opacity="0.2"/>
        <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${ink}" stroke-width="5"/>
        <rect x="42" y="44" width="78" height="78" fill="${red}" stroke="${ink}" stroke-width="5" transform="rotate(-3 81 83)"/>
        ${svgText("CK", 81, 93, { size: 30, weight: 900, fill: "#fff", anchor: "middle" })}
        ${svgText("Copa Kahl", 140, 78, { size: 44, weight: 900 })}
        ${svgText(`Pronosticos #${selectedKnockoutFixture.order} - ${knockoutStageLabels[selectedKnockoutFixture.stage]}`, 140, 116, { size: 24, weight: 900, fill: "#5f5a54" })}
        ${svgText(`${selectedKnockoutFixture.home} vs ${selectedKnockoutFixture.away}`, 42, 180, { size: 42, weight: 900 })}
        ${svgText(`Resultado oficial: ${selectedKnockoutResult ? `${selectedKnockoutResult.homeGoals}-${selectedKnockoutResult.awayGoals}` : "Pendiente"}`, 42, 218, { size: 24, weight: 900, fill: "#5f5a54" })}
        <rect x="${left}" y="${tableTop}" width="${rankWidth}" height="58" fill="${red}" stroke="${ink}" stroke-width="2"/>
        ${svgText("#", left + rankWidth / 2, tableTop + 38, { size: 20, weight: 900, fill: "#fff", anchor: "middle" })}
        <rect x="${left + rankWidth}" y="${tableTop}" width="${nameWidth}" height="58" fill="${pale}" stroke="${ink}" stroke-width="2"/>
        ${svgText("Participante", left + rankWidth + 14, tableTop + 38, { size: 21, weight: 900 })}
        <rect x="${left + rankWidth + nameWidth}" y="${tableTop}" width="${predictionWidth}" height="58" fill="${pale}" stroke="${ink}" stroke-width="2"/>
        ${svgText("Pronostico", left + rankWidth + nameWidth + 18, tableTop + 38, { size: 21, weight: 900 })}
        ${rows.join("")}
        ${svgText("Verde exacto - amarillo parcial - rojo 0 puntos", 42, height - 28, { size: 20, weight: 900, fill: "#5f5a54" })}
        ${svgText("copa-kahl.onrender.com", width - 42, height - 28, { size: 20, weight: 900, fill: "#5f5a54", anchor: "end" })}
      </svg>
    `;
  }

  function selectedKnockoutFilename() {
    const fixture = selectedKnockoutFixture;
    if (!fixture) return "copa-kahl-eliminatorias.png";
    return `copa-kahl-eliminatorias-${fixture.order}-${fixture.home}-vs-${fixture.away}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .concat(".png");
  }

  async function downloadKnockoutShareCard() {
    setKnockoutShareStatus("working");
    setKnockoutShareMessage("");
    try {
      const file = await svgToPngFile(buildKnockoutShareSvg(), selectedKnockoutFilename());
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setKnockoutShareMessage("Imagen descargada.");
    } catch (downloadError) {
      setKnockoutShareMessage(downloadError instanceof Error ? downloadError.message : "No se pudo descargar la imagen.");
    } finally {
      setKnockoutShareStatus("idle");
    }
  }

  async function shareKnockoutCard() {
    setKnockoutShareStatus("working");
    setKnockoutShareMessage("");
    try {
      if (!selectedKnockoutFixture) throw new Error("No hay cruce seleccionado.");
      const file = await svgToPngFile(buildKnockoutShareSvg(), selectedKnockoutFilename());
      const shareData = {
        title: `Copa Kahl #${selectedKnockoutFixture.order}`,
        text: `Pronosticos Copa Kahl ${selectedKnockoutFixture.home} vs ${selectedKnockoutFixture.away}`,
        files: [file],
      };
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setKnockoutShareMessage("Imagen lista para compartir.");
      } else {
        await downloadKnockoutShareCard();
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        setKnockoutShareMessage("");
      } else {
        setKnockoutShareMessage(shareError instanceof Error ? shareError.message : "No se pudo compartir la imagen.");
      }
    } finally {
      setKnockoutShareStatus("idle");
    }
  }

  return (
    <div className="pageStack">
      <section className="compactHero">
        <div>
          <p className="eyebrow">Pronosticos</p>
          <h1>Mapa del torneo.</h1>
          <span>{data?.updatedAt ? `Actualizada ${formatArgentinaTime(data.updatedAt)}` : "Cargando..."}</span>
        </div>
      </section>

      {error ? <section className="errorPanel" aria-live="polite">{error}</section> : null}

      <section className="predictionExplorer knockoutPredictionPanel">
        <aside className="knockoutPickerColumn" aria-label="Cruces de eliminatorias">
          {knockoutStageGroups.length > 1 ? (
            <div className="knockoutStageSelector" aria-label="Rondas de eliminatorias">
              {knockoutStageGroups.map((group) => (
                <button
                  className={selectedKnockoutStage === group.stage ? "active" : ""}
                  key={group.stage}
                  onClick={() => setSelectedKnockoutFixtureId(group.fixtures[0]?.id ?? selectedKnockoutFixtureId)}
                  type="button"
                >
                  <span>{knockoutStageLabels[group.stage]}</span>
                  <strong>{group.fixtures.length}</strong>
                </button>
              ))}
            </div>
          ) : null}
          <div
            className="matchPicker knockoutMatchList"
            style={{ "--knockout-match-columns": Math.max(1, Math.ceil(visibleKnockoutFixtures.length / 4)) } as CSSProperties}
          >
          {visibleKnockoutFixtures.map((fixture) => (
            <button
              className={selectedKnockoutFixture?.id === fixture.id ? "matchPick active" : "matchPick"}
              key={fixture.id}
              onClick={() => setSelectedKnockoutFixtureId(fixture.id)}
              type="button"
            >
              <span>#{fixture.order} · {knockoutStageLabels[fixture.stage]}</span>
              <strong><TeamBadge compact team={fixture.home} /> vs <TeamBadge compact team={fixture.away} /></strong>
            </button>
          ))}
          {knockoutFixtures.length === 0 ? <div className="emptyState">Todavia no hay cruces de eliminatorias cargados.</div> : null}
          </div>
        </aside>

        <section className="predictionInsight">
          {selectedKnockoutFixture ? (
            <>
              <div className="matchFocus">
                <span>{knockoutStageLabels[selectedKnockoutFixture.stage]} · Marcador exacto</span>
                <h2><TeamBadge team={selectedKnockoutFixture.home} /> <b>vs</b> <TeamBadge team={selectedKnockoutFixture.away} /></h2>
                <p>
                  Resultado oficial:{" "}
                  <strong>
                    {selectedKnockoutResult
                      ? `${selectedKnockoutResult.homeGoals}-${selectedKnockoutResult.awayGoals}`
                      : "Pendiente"}
                  </strong>
                </p>
              </div>

              {["QF", "SF", "THIRD", "FINAL"].includes(selectedKnockoutFixture.stage) ? (
                <section className="knockoutRuleNote">
                  <strong>Regla desde cuartos</strong>
                  <span>
                    Goleador: figura +1, delantero +2, medio/defensa +3. Si 7 o menos eligieron al clasificado correcto,
                    bonus extra +3 por batacazo.
                  </span>
                </section>
              ) : null}

              {!selectedKnockoutIsPublic ? (
                <section className="validationPanel knockoutPrivateNotice">
                  <p className="eyebrow">Privado</p>
                  <h2>Los pronosticos de este partido todavia estan ocultos.</h2>
                  <p>
                    Se hacen publicos cuando se cierra la edicion de este partido.
                    {selectedKnockoutVisibility?.unlockAt ? ` Hora de apertura: ${formatArgentinaDateTime(selectedKnockoutVisibility.unlockAt)}.` : ""}
                  </p>
                </section>
              ) : (
                <>
                  <section className="compactPredictionList knockoutCompactList">
                    <div className="tableNote compactPredictionHeader">
                      <strong>Detalle individual</strong>
                      <div className="selectedMatchBar" aria-label="Cruce seleccionado">
                        <span>#{selectedKnockoutFixture.order}</span>
                        <strong><TeamBadge compact team={selectedKnockoutFixture.home} /> vs <TeamBadge compact team={selectedKnockoutFixture.away} /></strong>
                      </div>
                    </div>
                    <div className="compactPredictionRows">
                      {knockoutShareRows.map((row) => (
                        <article className={`compactPredictionRow knockoutVerdict ${row.score.verdict}`} key={row.submission.id}>
                          <span className="compactPredictionPosition">{row.position ? `${row.position})` : "-"}</span>
                          <strong>{row.submission.name}</strong>
                          <span>
                            <b>{row.label}</b>
                            <em className="predictionStatusBadge">{selectedKnockoutResult ? `${row.score.totalPoints} pts` : "Pendiente"}</em>
                          </span>
                        </article>
                      ))}
                      {knockoutShareRows.length === 0 ? <div className="emptyState">Todavia no hay pronosticos publicos para este cruce.</div> : null}
                    </div>
                  </section>

                  <section className="shareInlinePanel knockoutSharePanel" aria-label="Compartir pronosticos del cruce">
                    <div className="tableNote">
                      <strong>Compartir este partido</strong>
                      <span>Imagen con los participantes y sus pronosticos del cruce seleccionado.</span>
                    </div>
                    <div className="shareCardPreview">
                      <div>
                        <span>#{selectedKnockoutFixture.order} · {knockoutStageLabels[selectedKnockoutFixture.stage]}</span>
                        <strong><TeamBadge compact team={selectedKnockoutFixture.home} /> vs <TeamBadge compact team={selectedKnockoutFixture.away} /></strong>
                      </div>
                      <p>{knockoutShareRows.length} participantes</p>
                    </div>
                    <div className="shareActions">
                      <button
                        className="primaryAction"
                        disabled={knockoutShareStatus === "working" || knockoutShareRows.length === 0}
                        onClick={shareKnockoutCard}
                        type="button"
                      >
                        {knockoutShareStatus === "working" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
                        Compartir
                      </button>
                      <button
                        className="primaryAction light"
                        disabled={knockoutShareStatus === "working" || knockoutShareRows.length === 0}
                        onClick={downloadKnockoutShareCard}
                        type="button"
                      >
                        <Download size={18} aria-hidden="true" />
                        Descargar PNG
                      </button>
                    </div>
                    {knockoutShareMessage ? <p className="shareMessage" aria-live="polite">{knockoutShareMessage}</p> : null}
                  </section>
                </>
              )}
            </>
          ) : (
            <div className="emptyState">Todavia no hay cruces de eliminatorias para mostrar.</div>
          )}
        </section>
      </section>

      <details className="groupPhaseFold pronosticosGroupFold">
        <summary>
          <span>Grupos</span>
          <strong>Ver fase de grupos</strong>
        </summary>

      <section className="roundStrip" aria-label="Fechas de pronosticos">
        {([1, 2, 3] as MatchRound[]).map((round) => (
          <button
            className={activeRound === round ? "roundTab active" : "roundTab"}
            key={round}
            onClick={() => {
              setActiveRound(round);
              setSelectedMatchId(matches.find((match) => match.round === round)?.id ?? selectedMatchId);
            }}
            type="button"
          >
            <span>{roundLabels[round]}</span>
            <strong>{matches.filter((match) => match.round === round).length} partidos</strong>
          </button>
        ))}
      </section>

      <section className="predictionExplorer">
        <aside className="matchPicker" aria-label="Partidos">
          {roundMatches.map((match) => (
            <button
              className={selectedMatch.id === match.id ? "matchPick active" : "matchPick"}
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
              type="button"
            >
              <span>#{match.order} · Grupo {match.groupId}</span>
              <strong><TeamBadge compact team={match.home} /> vs <TeamBadge compact team={match.away} /></strong>
            </button>
          ))}
        </aside>

        <section className="predictionInsight">
          <div className="matchFocus">
            <span>Grupo {selectedMatch.groupId} · {selectedMatch.exactScore ? "Marcador exacto" : "1X2"}</span>
            <h2><TeamBadge team={selectedMatch.home} /> <b>vs</b> <TeamBadge team={selectedMatch.away} /></h2>
            <div className="matchResultLine">
              <p>Resultado oficial: <strong>{resultLabel(selectedResult)}</strong></p>
              {selectedHighlightUrl ? (
                <button className="matchVideoButton" type="button" onClick={() => setShowGoalVideo((current) => !current)}>
                  <PlayCircle size={18} aria-hidden="true" />
                  {showGoalVideo ? "Ocultar resumen" : "Resumen de goles"}
                </button>
              ) : null}
            </div>
            {hasGoalScorers ? (
              <div className="goalScorerStrip" aria-label="Goles del partido">
                {homeScorersLabel ? (
                  <p>
                    <TeamBadge compact team={selectedMatch.home} />
                    <span>{homeScorersLabel}</span>
                  </p>
                ) : null}
                {awayScorersLabel ? (
                  <p>
                    <TeamBadge compact team={selectedMatch.away} />
                    <span>{awayScorersLabel}</span>
                  </p>
                ) : null}
              </div>
            ) : selectedResult ? (
              <p className="goalScorerEmpty">Goleadores: sin datos cargados.</p>
            ) : null}
          </div>

          {showGoalVideo && selectedHighlightUrl ? (
            <section className="matchVideoPanel" aria-label="Resumen de goles">
              <div>
                <PlayCircle size={20} aria-hidden="true" />
                <strong>Resumen de goles</strong>
              </div>
              {selectedEmbedUrl ? (
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  src={selectedEmbedUrl}
                  title={`Resumen ${selectedMatch.home} vs ${selectedMatch.away}`}
                />
              ) : (
                <a href={selectedHighlightUrl} rel="noreferrer" target="_blank">
                  <ExternalLink size={18} aria-hidden="true" />
                  Abrir resumen
                </a>
              )}
            </section>
          ) : null}

          <div className="pollGrid" aria-label="Porcentajes del partido">
            {choiceOrder.map((choice) => {
              const count = aggregates.outcomes[choice];
              const pct = percent(count, totalParticipants);
              return (
                <article className="pollCard" key={choice}>
                  <div>
                    <span>{outcomeLabel(choice, selectedMatch)}</span>
                    <strong>{pct}%</strong>
                  </div>
                  <i style={{ width: `${pct}%` }} />
                  <small>{count}/{totalParticipants} participantes</small>
                </article>
              );
            })}
          </div>

          <section className="scoreCloud">
            <div>
              <BarChart3 size={20} aria-hidden="true" />
              <strong>Marcadores mas repetidos</strong>
            </div>
            {aggregates.topScores.length > 0 ? (
              <ul>
                {aggregates.topScores.map((item) => (
                  <li key={item.score}><span>{item.score}</span><b>{item.count}</b></li>
                ))}
              </ul>
            ) : (
              <p>Este partido se juega por 1X2, sin marcador exacto.</p>
            )}
          </section>

          {selectedHighlights.length > 0 ? (
            <section className="highlightPanel" aria-label="Predicciones destacadas">
              <strong>Predicciones destacadas</strong>
              {selectedHighlights.map((highlight) => <p key={highlight}>{highlight}</p>)}
            </section>
          ) : null}
        </section>
      </section>

      <section className="compactPredictionList">
        <div className="tableNote compactPredictionHeader">
          <strong>Detalle individual</strong>
          <div className="selectedMatchBar" aria-label="Partido seleccionado">
            <span>#{selectedMatch.order}</span>
            <strong><TeamBadge compact team={selectedMatch.home} /> vs <TeamBadge compact team={selectedMatch.away} /></strong>
          </div>
        </div>
        <div className="compactPredictionRows">
          {predictionRows.map((row) => (
            <article className="compactPredictionRow" key={row.submission.id}>
              <span className="compactPredictionPosition">{row.position ? `${row.position})` : "-"}</span>
              <strong>{row.submission.name}</strong>
              <span>{row.label}</span>
            </article>
          ))}
          {predictionRows.length === 0 ? <div className="emptyState">No hay pronosticos para mostrar.</div> : null}
        </div>
      </section>

      <section className="groupPredictionPanel">
        <div className="tableNote compactPredictionHeader">
          <strong>Pronosticos de grupos</strong>
          <span>Top 2 que puso cada participante para el grupo seleccionado.</span>
        </div>
        <div className="groupTabs" role="group" aria-label="Elegir grupo">
          {groups.map((group) => (
            <button
              className={selectedGroup.id === group.id ? "active" : ""}
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              type="button"
            >
              Grupo {group.id}
            </button>
          ))}
        </div>
        <div className="groupFocusBar">
          <span>Grupo {selectedGroup.id}</span>
          <strong>{selectedGroup.teams.map((team) => team).join(" · ")}</strong>
        </div>
        <div className="compactPredictionRows">
          {groupPredictionRows.map((row) => (
            <article className="compactPredictionRow groupPredictionRow" key={row.submission.id}>
              <span className="compactPredictionPosition">{row.position ? `${row.position})` : "-"}</span>
              <strong>{row.submission.name}</strong>
              <span>{row.label}</span>
            </article>
          ))}
          {groupPredictionRows.length === 0 ? <div className="emptyState">No hay pronosticos de grupos para mostrar.</div> : null}
        </div>
      </section>

      <section className="statsPanel" aria-label="Estadisticas de la fecha">
        <div className="tableNote">
          <strong>Estadisticas de {roundLabels[activeRound]}</strong>
          <span>Resumen automatico de tendencias y aciertos de la fecha seleccionada.</span>
        </div>
        <div className="statsGrid">
          <article>
            <span>Resultado mas elegido</span>
            <strong>{roundStats.mostPicked?.label ?? "Sin datos"}</strong>
            <small>{roundStats.mostPicked ? `${roundStats.mostPicked.count}/${roundStats.mostPicked.total} participantes` : "-"}</small>
          </article>
          <article>
            <span>Mas arriesgado</span>
            <strong>{roundStats.risky?.different ? roundStats.risky.name : "Sin diferencias"}</strong>
            <small>{roundStats.risky?.different ? `${roundStats.risky.different} picks contra la mayoria` : "Todos fueron parecidos"}</small>
          </article>
          <article>
            <span>Exactos acertados</span>
            <strong>{roundStats.exactRate === null ? "Pendiente" : `${roundStats.exactRate}%`}</strong>
            <small>{roundStats.exactTotal > 0 ? `${roundStats.exactHits}/${roundStats.exactTotal} marcadores` : "Faltan resultados oficiales"}</small>
          </article>
          <article>
            <span>Partido mas errado</span>
            <strong>{roundStats.hardest?.label ?? "Pendiente"}</strong>
            <small>{roundStats.hardest ? `${roundStats.hardest.missed}/${roundStats.hardest.total} erraron ganador` : "Faltan resultados oficiales"}</small>
          </article>
        </div>
      </section>


      <section className="shareInlinePanel">
        <div className="tableNote">
          <strong>Tarjeta para compartir</strong>
          <span>Imagen por dia con los participantes y sus pronosticos.</span>
        </div>
        <div className="shareDaySelector" role="group" aria-label="Elegir dia para compartir">
          {dayLabels.map((day) => (
            <button className={shareDay === day ? "active" : ""} key={day} onClick={() => setShareDay(day)} type="button">
              {day}
            </button>
          ))}
        </div>
        <div className="shareCardPreview">
          <div>
            <span>{shareDay}</span>
            <strong>{shareDayMatches.map((match) => `#${match.order}`).join(" · ")}</strong>
          </div>
          <p>{shareRows.length} participantes · {shareDayMatches.length} partidos</p>
        </div>
        <div className="shareActions">
          <button className="primaryAction" disabled={shareStatus === "working" || shareRows.length === 0} onClick={shareCard} type="button">
            {shareStatus === "working" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
            Compartir
          </button>
          <button className="primaryAction light" disabled={shareStatus === "working" || shareRows.length === 0} onClick={downloadShareCard} type="button">
            <Download size={18} aria-hidden="true" />
            Descargar PNG
          </button>
        </div>
        {shareMessage ? <p className="shareMessage" aria-live="polite">{shareMessage}</p> : null}
      </section>

      </details>

    </div>
  );
}
