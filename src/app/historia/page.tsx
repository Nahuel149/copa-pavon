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
            El resumen histórico definitivo con todas las tablas de posiciones, campeones consagrados y descensos de ediciones anteriores.
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

          <article className="statBox">
            <Users size={24} className="statIcon blue" />
            <div>
              <strong>10</strong>
              <small>Jugadores Históricos</small>
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
          <span>Tablas por Edición</span>
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
                <div className="honorBadge silver">
                  <Medal size={16} />
                  <span>Subcampeón: <strong>{currentEdition.runnerUp}</strong></span>
                </div>
              </div>
            </div>
          </section>

          {/* Historical Standings Table */}
          <section className="historyTablePanel">
            <div className="panelHeader">
              <p className="eyebrow">Tabla de Posiciones Final</p>
              <h3>{currentEdition.title} ({currentEdition.year})</h3>
            </div>

            <div className="tableWrapper">
              <table className="recopaTable historyTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participante</th>
                    <th>Puntos</th>
                    <th>Jugados</th>
                    <th>Exactos (+3)</th>
                    <th>Ganadores (+1)</th>
                    <th>Distinción / Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEdition.table.map((row) => (
                    <tr
                      key={row.participant}
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
                      <td className="pointsCell">{row.points} pts</td>
                      <td>{row.played}</td>
                      <td>{row.exactHits}</td>
                      <td>{row.winnerHits}</td>
                      <td>
                        {row.badge === "champion" && <span className="historyBadge championTag">🏆 Campeón</span>}
                        {row.badge === "runner-up" && <span className="historyBadge runnerTag">🥈 Subcampeón</span>}
                        {row.badge === "podium" && <span className="historyBadge podiumTag">🥉 Podio</span>}
                        {row.badge === "relegated" && <span className="historyBadge relegatedTag">🔻 Descendido</span>}
                        {!row.badge && <span className="historyBadge defaultTag">Competidor</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        /* PALMARÉS & ACCUMULATED ALL-TIME TABLE */
        <section className="palmaresPanel">
          <div className="panelHeader">
            <p className="eyebrow">Tabla Histórica Acumulada</p>
            <h2>Palmarés Oficial de Copa Kahl</h2>
            <p>Conteo histórico total de títulos, podios y descensos cosechados en todas las ediciones.</p>
          </div>

          <div className="tableWrapper">
            <table className="recopaTable palmaresTable">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Jugador Leyenda</th>
                  <th>Copas 🏆</th>
                  <th>Subcampeonatos 🥈</th>
                  <th>Podios Total 🥉</th>
                  <th>Descensos 🔻</th>
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
                    <td className="highlightCount silver">{player.runnerUps}</td>
                    <td className="highlightCount bronze">{player.podiums}</td>
                    <td className="highlightCount red">{player.relegations}</td>
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
