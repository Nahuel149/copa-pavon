"use client";

import { useState } from "react";
import { Award, Calendar, History, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { allTimePalmares, historicalEditions } from "@/lib/historia";

const champions = [
  {
    name: "Javi",
    trophies: ["Copa Fiss"],
    image: "/kahl-assets/campeon-javi.jpeg",
  },
  {
    name: "Gonza Fiss",
    trophies: ["Copa Chiqui Bauch", "Copa Kahl"],
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
  },
];

const totalTrophies = champions.reduce((total, c) => total + c.trophies.length, 0);

const relegated = ["Fer", "Maxi", "Nahuel"];
const thirdDivision = [{ name: "Ale con Pelo", note: "Suspendido para jugar las próximas 3 copas" }];

export default function CampeonesPage() {
  const [selectedEditionId, setSelectedEditionId] = useState<string>("copa-kahl-2026");
  const [viewMode, setViewMode] = useState<"ediciones" | "palmares">("ediciones");

  const currentEdition = historicalEditions.find((e) => e.id === selectedEditionId) ?? historicalEditions[0];

  return (
    <div className="pageStack">
      {/* Hero Header */}
      <section className="heroBand championsHero">
        <div>
          <p className="eyebrow">Historial & Museo Oficial</p>
          <h1>Campeones, Historia y Descendidos.</h1>
          <p className="heroCopy">
            La vitrina oficial de la Copa Kahl: gloria arriba con los campeones, las tablas históricas completas y la B Nacional abajo.
          </p>
        </div>
        <div className="scoreSeal">
          <Trophy size={34} aria-hidden="true" />
          <strong>{totalTrophies}</strong>
          <span>copas</span>
        </div>
      </section>

      {/* Hall of Fame / Vitrina de Campeones */}
      <section>
        <div className="panelHeader" style={{ marginBottom: "16px" }}>
          <p className="eyebrow">Galería de Gloria</p>
          <h2>Vitrina Oficial de Campeones</h2>
        </div>

        <div className="championGrid" aria-label="Campeones">
          {champions.map((champion) => (
            <article className="championCard" key={champion.name}>
              <figure>
                <img src={champion.image} alt={`Foto de ${champion.name}, campeón`} />
              </figure>
              <div>
                <p className="eyebrow">Campeón consagrado</p>
                <h2>{champion.name}</h2>
                <div className="championTrophies">
                  {champion.trophies.map((trophy) => (
                    <span key={trophy}>
                      <Award size={18} aria-hidden="true" />
                      {trophy}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Main View Mode Selector for Historical Tables */}
      <section style={{ marginTop: "16px" }}>
        <div className="panelHeader" style={{ marginBottom: "16px" }}>
          <p className="eyebrow">Archivo de Torneos</p>
          <h2>Tablas Históricas por Edición</h2>
        </div>

        <nav className="historyViewNav" aria-label="Modo de vista histórica">
          <button
            className={viewMode === "ediciones" ? "modeTab active" : "modeTab"}
            onClick={() => setViewMode("ediciones")}
            type="button"
          >
            <Trophy size={18} aria-hidden="true" />
            <span>Ediciones & Tablas</span>
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
          <div className="historyContentStack" style={{ marginTop: "16px" }}>
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

            {/* Historical Standings Table (if available) */}
            <section className="historyTablePanel">
              <div className="panelHeader">
                <p className="eyebrow">Posiciones Oficiales</p>
                <h3>{currentEdition.title} ({currentEdition.year})</h3>
              </div>
              {currentEdition.table && currentEdition.table.length > 0 ? (
                <div className="tableWrapper">
                  {currentEdition.table[0]?.played !== undefined ? (
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
                  ) : (
                    <table className="recopaTable historyTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Participante</th>
                          <th>Puntos</th>
                          <th>Distinción</th>
                          <th style={{ textAlign: "left" }}>Análisis & Comentario Oficial</th>
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
                            <td className="pointsCell">{row.points} pts</td>
                            <td>
                              {row.badge === "champion" && <span className="historyBadge championTag">🏆 Campeón</span>}
                              {row.badge === "runner-up" && <span className="historyBadge runnerTag">🥈 Subcampeón</span>}
                              {row.badge === "podium" && <span className="historyBadge podiumTag">🥉 Podio</span>}
                              {row.badge === "relegated" && <span className="historyBadge relegatedTag">🔻 Descendido</span>}
                              {!row.badge && <span className="historyBadge defaultTag">Competidor</span>}
                            </td>
                            <td style={{ fontSize: "0.88rem", color: "#334155", fontStyle: "italic", textAlign: "left", lineHeight: "1.4" }}>
                              "{row.notes}"
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
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
          <section className="palmaresPanel" style={{ marginTop: "16px" }}>
            <div className="panelHeader">
              <p className="eyebrow">Cuadro de Honor</p>
              <h2>Palmarés Histórico de Campeones</h2>
              <p>Historial unificado de títulos conseguidos por cada participante en todas las ediciones jugadas.</p>
            </div>

            <div className="tableWrapper">
              <table className="recopaTable palmaresTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>Copas Ganadas</th>
                    <th>Títulos Obtenidos</th>
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
      </section>

      {/* Zona de Descenso */}
      <section style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
        <section className="relegationPanel" aria-label="Descendidos">
          <div>
            <p className="eyebrow">Historial de Perdedores</p>
            <h2>B Nacional</h2>
            <p>Los participantes que perdieron la categoría en las distintas ediciones.</p>
          </div>
          <div className="relegatedList" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, color: "#991b1b", fontSize: "0.85rem", textTransform: "uppercase" }}>Copa Kahl 2026:</span>
              {["Fer", "Maxi", "Nahuel"].map((name) => (
                <span key={name}>
                  <ShieldAlert size={18} aria-hidden="true" />
                  {name}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              <span style={{ fontWeight: 800, color: "#991b1b", fontSize: "0.85rem", textTransform: "uppercase" }}>Copa Chiqui Bauch 2025:</span>
              {["Javi", "Buda (Matías Nicolas)"].map((name) => (
                <span key={name}>
                  <ShieldAlert size={18} aria-hidden="true" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relegationPanel thirdDivisionPanel" aria-label="C">
          <div>
            <p className="eyebrow">Sanciones Administrativas</p>
            <h2>La C</h2>
            <p>Zona de castigo deportivo y administrativo.</p>
          </div>
          <div className="relegatedList">
            {thirdDivision.map((player) => (
              <span key={player.name}>
                <ShieldAlert size={18} aria-hidden="true" />
                <strong>{player.name}</strong>
                <small>({player.note})</small>
              </span>
            ))}
          </div>
        </section>
      </section>

      <KahlImageScatter page="campeones" count={4} variant="compact" />
    </div>
  );
}
