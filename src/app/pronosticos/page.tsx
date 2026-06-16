"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Eye, Loader2, Share2, Target, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import { matches, roundLabels, type KnockoutStage, type Match, type MatchRound } from "@/lib/matches";
import {
  choiceLabel,
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
  knockoutVisibility?: Record<KnockoutStage, { label: string; public: boolean; unlockAt: string }>;
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
  const [shareDay, setShareDay] = useState(matches[0].dateLabel);
  const [shareStatus, setShareStatus] = useState<"idle" | "working">("idle");
  const [shareMessage, setShareMessage] = useState("");
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

  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? roundMatches[0] ?? matches[0];
  const shareDayMatches = useMemo(() => matches.filter((match) => match.dateLabel === shareDay), [shareDay]);
  const resultByMatch = useMemo(
    () => new Map((data?.results.matchResults ?? []).map((result) => [result.matchId, result])),
    [data?.results.matchResults],
  );
  const standingPositionById = useMemo(
    () => new Map((data?.standings ?? []).map((standing, index) => [standing.submissionId, index + 1])),
    [data?.standings],
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
  const leader = data?.standings[0];

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

  return (
    <div className="pageStack">
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Pronosticos</p>
          <h1>Mapa del torneo.</h1>
          <p className="heroCopy">
            Mira que eligio cada participante, compara tendencias por partido y segui como se mueve el prode con los
            resultados reales.
          </p>
        </div>
        <div className="tableRefresh">
          <span>{data?.updatedAt ? `Actualizada ${new Date(data.updatedAt).toLocaleTimeString("es-AR")}` : "Cargando..."}</span>
          <button className="primaryAction light" onClick={loadData} type="button">
            {status === "loading" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            Actualizar
          </button>
        </div>
      </section>

      {error ? <section className="errorPanel" aria-live="polite">{error}</section> : null}

      <section className="metricGrid" aria-label="Resumen de pronosticos">
        <article className="metric">
          <Users size={20} aria-hidden="true" />
          <span>Participantes</span>
          <strong>{totalParticipants}</strong>
        </article>
        <article className="metric">
          <Trophy size={20} aria-hidden="true" />
          <span>Puntero actual</span>
          <strong>{leader?.name ?? "-"}</strong>
        </article>
        <article className="metric alert">
          <Target size={20} aria-hidden="true" />
          <span>Partido elegido</span>
          <strong>#{selectedMatch.order}</strong>
        </article>
      </section>

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
            <p>Resultado oficial: <strong>{resultLabel(selectedResult)}</strong></p>
          </div>

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

      <section className="shareCardPanel">
        <div className="tableNote">
          <strong>Tarjeta para compartir</strong>
          <span>Elegis un dia y se arma una imagen con los participantes y sus pronosticos de esos partidos.</span>
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

      <KahlImageScatter page="tabla" count={1} variant="compact" />
    </div>
  );
}
