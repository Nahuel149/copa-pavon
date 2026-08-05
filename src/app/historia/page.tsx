"use client";

import { useState } from "react";
import { Award, Calendar, History, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { allTimePalmares, historicalEditions, type HistoricalEdition } from "@/lib/historia";

export default function HistoriaPage() {
  const [selectedEditionId, setSelectedEditionId] = useState<string>("copa-kahl-2026");
  const [viewMode, setViewMode] = useState<"ediciones" | "palmares">("ediciones");

  const currentEdition = historicalEditions.find((e) => e.id === selectedEditionId) ?? historicalEditions[0];

  return (
    <div className="pageStack">
      {/* Hero Header */}
      <section className="heroBand historyHero">
        <div>
          <p className="eyebrow historyEyebrow">
            <History size={14} aria-hidden="true" />
            Archivo Histórico
          </p>
          <h1>Museo y Registro de Copas.</h1>
          <p className="heroCopy">
            El resumen histórico oficial con las ediciones disputadas, sus campeones consagrados y el palmarés acumulado.
          </p>
        </div>

        <div className="historyStatsRow">
          <article className="statBox">
            <Trophy size={24} className="statIcon gold" />
            <div>
              <strong>{historicalEditions.length}</strong>
              <small>Ediciones Oficiales</small>
            </div>
          </article>

          <article className="statBox">
            <Medal size={24} className="statIcon silver" />
            <div>
              <strong>2</strong>
              <small>Campeones Distintos</small>
            </div>
          </article>
        </div>
      </section>

      {/* Main View Mode Selector */}
      <nav className="historyViewNav" aria-label="Modo de vista histórica">
        <button
          className={viewMode === "ediciones" ? "modeTab active" : "modeTab"}
          onClick={() => setViewMode("ediciones")}
          type="button"
        >
          <Trophy size={18} aria-hidden="true" />
          <span>Ediciones & Campeones</span>
        </button>

        <button
          className={viewMode === "palmares" ? "modeTab active" : "modeTab"}
          onClick={() => setViewMode("palmares")}
          type="button"
        >
          <Medal size={18} aria-hidden="true" />
          <span>Palmarés Acumulado</span>
        </button>
      </nav>

      {viewMode === "ediciones" ? (
        <div className="historyContentStack">
          {/* Edition Tabs */}
          <div className="editionTabsList">
            {historicalEditions.map((edition) => (
              <button
                key={edition.id}
                type="button"
                className={`editionTabItem ${selectedEditionId === edition.id ? "active" : ""}`}
                onClick={() => setSelectedEditionId(edition.id)}
              >
                <div className="tabHeaderRow">
                  <Trophy size={16} className="tabTrophyIcon" />
                  <strong>{edition.title}</strong>
                </div>
                <span className="tabYear">{edition.year}</span>
              </button>
            ))}
          </div>

          {/* Selected Edition Banner */}
          <section className="selectedEditionCard">
            {currentEdition.image && (
              <figure className="editionChampionFigure">
                <img src={currentEdition.image} alt={`Campeón ${currentEdition.champion}`} />
              </figure>
            )}
            <div className="editionMeta">
              <span className="editionYearTag">
                <Calendar size={14} /> Edición {currentEdition.year}
              </span>
              <h2>{currentEdition.title}</h2>
              <p className="editionDesc">{currentEdition.description}</p>

              <div className="editionHonorRoll">
                <div className="honorBadge gold">
                  <Trophy size={16} />
                  <span>Campeón: <strong>{currentEdition.champion}</strong></span>
                </div>
                {currentEdition.runnerUp && (
                  <div className="honorBadge silver">
                    <Medal size={16} />
                    <span>Subcampeón: <strong>{currentEdition.runnerUp}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Historical Standings Table (only if available) */}
          <section className="historyTablePanel">
            <div className="panelHeader">
              <p className="eyebrow">Posiciones</p>
              <h3>{currentEdition.title} ({currentEdition.year})</h3>
            </div>

            {currentEdition.table && currentEdition.table.length > 0 ? (
              <div className="tableWrapper">
                <table className="recopaTable historyTable">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Participante</th>
                      <th>Puntos</th>
                      <th>Jugados</th>
                      <th>Ganados</th>
                      <th>Perdidos</th>
                      <th>Exactos</th>
                      <th>Goles</th>
                      <th>Grupos</th>
                      <th>Aciertos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEdition.table.map((row) => (
                      <tr
                        key={`${row.pos}-${row.participant}`}
                        className={
                          row.badge === "champion"
                            ? "championRow"
                            : row.badge === "runner-up"
                            ? "runnerUpRow"
                            : row.badge === "relegated"
                            ? "relegatedRow"
                            : ""
                        }
                      >
                        <td className="posCell">
                          {row.badge === "champion" ? (
                            <Trophy size={18} className="goldTrophy" />
                          ) : row.badge === "runner-up" ? (
                            <Medal size={18} className="silverMedal" />
                          ) : (
                            row.pos
                          )}
                        </td>
                        <td className="participantCell">
                          <strong>{row.participant}</strong>
                        </td>
                        <td className="pointsCell">{row.points}</td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.lost}</td>
                        <td>{row.exactHits}</td>
                        <td>{row.goals}</td>
                        <td>{row.groups}</td>
                        <td>{row.totalHits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="emptyTableNotice" style={{ padding: "24px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <History size={28} style={{ color: "#64748b", marginBottom: "8px" }} />
                <p style={{ margin: 0, fontWeight: 700, color: "#475569" }}>
                  La tabla completa de posiciones de la {currentEdition.title} no está disponible.
                </p>
                <small style={{ color: "#94a3b8" }}>Solo se encuentra registrado el campeón oficial de esta edición.</small>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* PALMARÉS & ACCUMULATED ALL-TIME TABLE */
        <section className="palmaresPanel">
          <div className="panelHeader">
            <p className="eyebrow">Tabla Histórica Acumulada</p>
            <h2>Palmarés Oficial de Copa Kahl</h2>
            <p>Conteo histórico total de títulos cosechados en todas las ediciones.</p>
          </div>

          <div className="tableWrapper">
            <table className="recopaTable palmaresTable">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Jugador Leyenda</th>
                  <th>Títulos 🏆</th>
                  <th>Copas Ganadas</th>
                </tr>
              </thead>
              <tbody>
                {allTimePalmares.map((player, idx) => (
                  <tr key={player.participant} className={idx === 0 ? "kingRow" : ""}>
                    <td className="posCell">{idx === 0 ? <Trophy size={18} className="goldTrophy" /> : idx + 1}</td>
                    <td className="participantCell">
                      <strong>{player.participant}</strong>
                    </td>
                    <td className="highlightCount gold">{player.titles}</td>
                    <td>
                      {player.trophies.map((t) => (
                        <span key={t} className="historyBadge championTag" style={{ marginRight: 6, display: "inline-block", margin: "2px 4px" }}>
                          🏆 {t}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <KahlImageScatter page="campeones" count={4} variant="compact" />
    </div>
  );
}
