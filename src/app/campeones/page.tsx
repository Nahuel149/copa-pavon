"use client";

import { useState } from "react";
import { Award, Calendar, History, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { allTimePalmares, historicalEditions } from "@/lib/historia";

const champions = [
  {
    name: "Javier",
    trophies: ["Copa Fiss", "Recopa Fiss Kahl"],
    image: "/kahl-assets/campeon-javi.jpeg",
  },
  {
    name: "Gonza el + Fachero.",
    trophies: ["Copa Chiqui Bauch", "Copa Kahl"],
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
  },
];

const totalTrophies = champions.reduce((total, c) => total + c.trophies.length, 0);

const relegated = ["Fer", "Maxi", "Nahuel"];
const thirdDivision = [{ name: "Ale con Pelo", note: "Suspendido para jugar las próximas 3 copas" }];

export default function CampeonesPage() {
  const [selectedEditionId, setSelectedEditionId] = useState<string>("recopa-fiss-kahl-2026");
  const [viewMode, setViewMode] = useState<"ediciones" | "palmares">("ediciones");

  const currentEdition = historicalEditions.find((e) => e.id === selectedEditionId) ?? historicalEditions[0];
  const hasGroupsColumn = currentEdition.table?.some((r) => r.groups !== undefined && r.groups !== "");

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
                          {hasGroupsColumn && <th>Grupos</th>}
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
                            <td>
                              <div className="participantCell">
                                <strong>{row.participant}</strong>
                              </div>
                            </td>
                            <td className="pointsCell">{row.points}</td>
                            <td>{row.played}</td>
                            <td>{row.won}</td>
                            <td>{row.lost}</td>
                            <td>{row.exactHits}</td>
                            <td>{row.goals}</td>
                            {hasGroupsColumn && <td>{row.groups}</td>}
                            <td>{row.totalHits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : currentEdition.table[0]?.streak !== undefined ? (
                    <table className="recopaTable historyTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Participante</th>
                          <th>Puntos</th>
                          <th>Racha</th>
                          <th>Distinción / Estado</th>
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
                            <td>
                              <div className="participantCell">
                                <strong>{row.participant}</strong>
                              </div>
                            </td>
                            <td className="pointsCell">{row.points} pts</td>
                            <td>
                              <span className="historyBadge defaultTag" style={{ background: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" }}>
                                ⚡ {row.streak}
                              </span>
                            </td>
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
                            <td>
                              <div className="participantCell">
                                <strong>{row.participant}</strong>
                              </div>
                            </td>
                            <td className="pointsCell">{row.points} pts</td>
                            <td>
                              {row.badge === "champion" && <span className="historyBadge championTag">🏆 Campeón</span>}
                              {row.badge === "runner-up" && <span className="historyBadge runnerTag">🥈 Subcampeón</span>}
                              {row.badge === "podium" && <span className="historyBadge podiumTag">🥉 Podio</span>}
                              {row.badge === "relegated" && <span className="historyBadge relegatedTag">🔻 Descendido</span>}
                              {!row.badge && <span className="historyBadge defaultTag">Competidor</span>}
                            </td>
                            <td className="historyNotesCell">
                              "{row.notes}"
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="emptyTableNotice">
                  <History size={28} style={{ marginBottom: "8px" }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    La tabla completa de posiciones de la {currentEdition.title} no está disponible.
                  </p>
                  <small>Solo se encuentra registrado el campeón oficial de esta edición.</small>
                </div>
              )}
            </section>

            {/* INFORME FINAL - COPA KAHL 2026 */}
            {currentEdition.id === "copa-kahl-2026" && (
              <section className="historyReportPanel" style={{ marginTop: "24px" }}>
                <div className="panelHeader">
                  <p className="eyebrow" style={{ background: "#ffd700", color: "#000", border: "2px solid #000" }}>
                    🏆 INFORME FINAL — COPA KAHL 2026 🏆
                  </p>
                  <h2>Evaluación Oficial de los 15 Participantes</h2>
                  <p>
                    Después de 104 partidos, quince participantes, cuatrocientas reformas reglamentarias, tres tablas paralelas y un organizador investigándose a sí mismo, terminó la competencia más prestigiosa desde la Copa Fiss. Procedemos a evaluar a cada participante:
                  </p>
                </div>

                <div className="reportCardsGrid">
                  <article className="reportCard gold">
                    <header>
                      <span className="reportPos">🥇 1.º</span>
                      <h3>GONZA</h3>
                      <span className="reportPts">162 puntos</span>
                    </header>
                    <p>
                      El rugby finalmente le dio algo al fútbol: un campeón. Gonza logró la hazaña de ganar un Mundial sin acertar quién salía campeón del mundo. Estudió 104 partidos para equivocarse justo en el más importante. Un visionario.
                    </p>
                    <p>
                      Durante la final se pasó media hora llorando: “¿Cómo vas a poner x2?”, “¡No es justo!”, “¡Dejalo normal!”. Mucho rugbier, mucho franeleo, pero cuando vio venir el contacto pidió touch y llamó al Fiss Kahl.
                    </p>
                    <p>
                      Diez exactos, 71 ganadores y siete grupos acertados. Números respetables hasta que uno recuerda que ascendió por una copa de leche y ahora se hace llamar bicampeón.
                    </p>
                    <p>
                      En Koalas alcanzaba botellitas; en la Copa Kahl, Chiqui Balsas directamente lo llevó en andas hasta el podio. Campeón sin acertar al campeón, suplente con sed y dueño de una foto de perfil que grita: “¿Querés ser tu propio jefe? Te cuento cómo ganar plata con criptomonedas y scrums”.
                    </p>
                    <p className="reportFooter">Felicitaciones, Gonza. Levantá la copa rápido antes de que descubran que tampoco sabés cuánto pesa porque siempre las cargó otro. 🐨💧🏆</p>
                  </article>

                  <article className="reportCard silver">
                    <header>
                      <span className="reportPos">🥈 2.º</span>
                      <h3>NICO MONTES</h3>
                      <span className="reportPts">157 puntos</span>
                    </header>
                    <p>
                      Diez exactos, nueve grupos y solamente cinco puntos menos que el campeón. Hizo prácticamente todo bien salvo lo único que necesitaba: ganarle a un tipo que pensaba que España no podía ser campeón.
                    </p>
                    <p>
                      Terminó empatado con Miguel, perdió la copa y declaró que estaba “manoseada”. Después anunció que no jugaba nunca más porque le daba mucha paja. El auténtico cebollita: corrió 104 partidos para llevarse una medalla que Gonza ya sabía cuánto pesaba.
                    </p>
                    <p className="reportFooter">Le faltaron cinco puntos y un poquito menos de cagazo en la final. Para la próxima puede probar acertando o, al menos, no retirándose del fútbol por fiaca.</p>
                  </article>

                  <article className="reportCard bronze">
                    <header>
                      <span className="reportPos">🥉 3.º</span>
                      <h3>MIGUEL</h3>
                      <span className="reportPts">157 puntos</span>
                    </header>
                    <p>
                      Ganó 72 pronósticos, más que absolutamente todos. Fue puntero durante medio Mundial, se autonombró “gordo, borracho y puntero de la Kahl” y terminó tercero, sin copa y anotado en la B Nacional.
                    </p>
                    <p>
                      La mayor pecheada desde que existen las bebidas alcohólicas. Perdió la punta después de 93 partidos y procesó la derrota tomándose la séptima cerveza negra mientras miraba <em>Berlín</em> en Netflix. El problema no fue el alcohol: fue haber frenado en la séptima.
                    </p>
                    <p>
                      Pasó de “infeliz no soy porque estoy puntero” a preguntar cuándo arrancaba el próximo prode. Miguel no perdió una copa: protagonizó una serie completa sobre cómo desperdiciar una campaña histórica.
                    </p>
                    <p className="reportFooter"><strong>Felicidades al campeón moral de la vinoteca. 🍷</strong></p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">4.º</span>
                      <h3>ALE BAUCH/GAYCH</h3>
                      <span className="reportPts">153 puntos</span>
                    </header>
                    <p>
                      Cuarto en la tabla oficial, primero en la tabla que confeccionó él, campeón de eliminatorias, ganador de “la copa que vale” y presidente vitalicio de la Federación Internacional de Planillas Paralelas.
                    </p>
                    <p>
                      Metió ocho exactos y presentó aproximadamente ochenta denuncias. Si la tabla no lo favorecía, era fraude; si lo favorecía, era la única competición seria. Hamigo, acertaste apenas seis grupos de doce: no existe Excel que arregle semejante animalada.
                    </p>
                    <p className="reportFooter">No ganó la Copa Kahl, pero se llevó una hermosa copa de leche que perdió por llorón antes de llegar a su casa.</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">5.º</span>
                      <h3>ZINO</h3>
                      <span className="reportPts">152 puntos</span>
                    </header>
                    <p>
                      Terminó a un punto de Ale y a diez del campeón, aunque según sus cálculos le robaron puntos en prácticamente todos los continentes.
                    </p>
                    <p>
                      Ocho exactos, 99 aciertos y conexión de dos megas para mirar Disney. Zino veía el gol cuarenta segundos tarde y aun así detectaba una reforma reglamentaria antes que los demás.
                    </p>
                    <p className="reportFooter">Gran torneo del fiscal oficial de la Kahl: se quejó ochenta veces de que no premiaban la regularidad y terminó regularmente sin ganar nada.</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">6.º</span>
                      <h3>LAUTARO FLACO/TARADO</h3>
                      <span className="reportPts">150 puntos</span>
                    </header>
                    <p>
                      Jugó solamente 100 partidos porque ingresó tarde después del histórico <strong>Kahlgate</strong>. Estuvo trescientas intervenciones tratando de demostrar que él también se llamaba Lautaro y reclamando dos puntos desaparecidos.
                    </p>
                    <p>
                      Terminó a doce del campeón, por lo que esos dos puntos que defendió como si fueran las Malvinas no le servían absolutamente para nada.
                    </p>
                    <p className="reportFooter">Metió 17 goleadores y acabó sexto: gran remontada del único concursante cuyo nombre aparecía cortado en la tabla porque ni el servidor estaba seguro de quién carajo era.</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">7.º</span>
                      <h3>JAVI QUE SABE DE FÚTBOL</h3>
                      <span className="reportPts">150 puntos</span>
                    </header>
                    <p>
                      El histórico campeón de la Copa Fiss terminó séptimo, perdió el desempate con Lautaro y acertó solamente cinco grupos de doce.
                    </p>
                    <p>
                      Se pasó el Mundial diciendo “BASTA DE PRODES” mientras revisaba cada tabla, organizaba encuestas, presumía su antigua copa y exigía admiración. Es como un jubilado que pide que bajen la música pero no abandona el boliche.
                    </p>
                    <p>
                      Ahora figura descendido a la B Nacional. Por respeto a la estadística, debería actualizar su nombre a <strong>Javi Que Sabía de Fútbol</strong>.
                    </p>
                    <p className="reportFooter">Eso sí: dejó una enseñanza fundamental para todos sus alumnos. Tomen agua, porque la gaseosa hace caer el pelo y una mala Copa Kahl hace caer de categoría. 💧</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">8.º</span>
                      <h3>ENZO</h3>
                      <span className="reportPts">147 puntos</span>
                    </header>
                    <p>
                      Clavó once exactos, récord absoluto del torneo, y aun así terminó octavo. Era un francotirador: cada tanto acertaba algo imposible y después tiraba cinco fechas con el joystick desconectado.
                    </p>
                    <p>
                      Durante la copa explicó que los puestos 1 al 4 eran “vividos sin vida”, del 5 al 10 estaban los “chads” y del 11 al 15 los burros. Casualidad: él estaba octavo. Fue el pronóstico más preciso de toda su campaña.
                    </p>
                    <p className="reportFooter">Su teclado vale menos que la opinión de un descendido, pero oficialmente Enzo es el campeón de los chads de mitad de tabla. 🎮</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">9.º</span>
                      <h3>MATÍAS BUDA</h3>
                      <span className="reportPts">147 puntos</span>
                    </header>
                    <p>
                      El analista serio del grupo: observó contextos, estados físicos, planteamientos tácticos y procesos históricos. Mientras terminaba cada análisis, la tabla ya había avanzado cuatro puestos sin él.
                    </p>
                    <p>
                      Solamente cuatro exactos y 46 derrotas. Hizo honor al nombre Buda: alcanzó un estado de desapego absoluto respecto del resultado correcto.
                    </p>
                    <p className="reportFooter">Quedó empatado con Enzo, perdió el desempate y fue enviado a la B Nacional. Mucha lectura de juego, pero la iluminación estaba en otro campeonato.</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">10.º</span>
                      <h3>TONY</h3>
                      <span className="reportPts">142 puntos</span>
                    </header>
                    <p>
                      Nueve exactos hablando una vez cada quince partidos. Tony tiraba un resultado correcto, desaparecía y volvía tres fechas después como Skay para tocar los clásicos.
                    </p>
                    <p>
                      Podría haber peleado más arriba, pero trató la Copa Kahl como un recital: llegó, miró tranquilo y se fue antes del bis para evitar a los borrachos.
                    </p>
                    <p className="reportFooter">Terminó décimo porque la experiencia sirve para reconocer buena música, no para adivinar qué carajo iba a hacer Cabo Verde.</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">11.º</span>
                      <h3>GORDO LAUTA</h3>
                      <span className="reportPts">136 puntos</span>
                    </header>
                    <p>
                      Ganó la batalla legal por el nombre “Lautaro” y perdió todo lo relacionado con el fútbol. Él era el Lautaro original, pero el Lautaro trucho que entró tarde terminó catorce puntos arriba.
                    </p>
                    <p>
                      Imaginate ser el producto oficial y que la copia de La Salada funcione mejor.
                    </p>
                    <p className="reportFooter">Su frase fue: “El único que se anotó al prode soy yo, vos dormiste”. Efectivamente jugó los 104 partidos. Lamentablemente, por los resultados parece que el que durmió fue él.</p>
                  </article>

                  <article className="reportCard">
                    <header>
                      <span className="reportPos">12.º</span>
                      <h3>MONO ANDRÉS</h3>
                      <span className="reportPts">135 puntos</span>
                    </header>
                    <p>
                      Cinco exactos, nueve goleadores y más encuestas que puntos. Andrés pasó de “no puedo estar tan abajo, esta tabla es IA” a compararse con Argentina 2014: subcampeón, después al borde del abismo y “la próxima la gano”.
                    </p>
                    <p>
                      Hamigo, saliste duodécimo. Antes de pensar en ganar la próxima, tratá de encontrar el arco en esta.
                    </p>
                    <p className="reportFooter">Por lo menos cumplió su lema de “primero mono que en la B”. No cayó oficialmente, aunque la tabla lo dejó balanceándose peligrosamente sobre la rama.</p>
                  </article>

                  <article className="reportCard relegated">
                    <header>
                      <span className="reportPos">13.º 🔻</span>
                      <h3>NAHUEL</h3>
                      <span className="reportPts">129 puntos</span>
                    </header>
                    <p>
                      El organizador, programador, administrador, fiscal, tribunal de disciplina y principal víctima de su propio reglamento.
                    </p>
                    <p>
                      Cambió puntajes, agregó goleadores, batacazos, figuras, mediocampistas, falopas, multiplicadores y una final que podía entregar sesenta puntos. Hizo más reformas que el Chiqui Tapia y aun así terminó decimotercero.
                    </p>
                    <p>
                      Es el primer mafioso de la historia que intenta arreglar su propio torneo y termina perjudicándose a sí mismo. <strong>Chiqui Balsas se mandó solo al descenso.</strong>
                    </p>
                    <p>
                      La página cargó correctamente en Render; lo único que nunca terminó de renderizar fue su conocimiento futbolístico: 79 aciertos y 48 derrotas. Se puso una camiseta de Japón, culpó al árbitro, a las lesiones y a Scaloni, pero ni los ponjas aceptaron hacerse cargo de este papelón.
                    </p>
                    <p className="reportFooter">Gracias por organizar todo, pelado. Con la plata del próximo prode comprate Hair Recovery o, por lo menos, un asesor que sepa pronosticar. 🇯🇵</p>
                  </article>

                  <article className="reportCard relegated">
                    <header>
                      <span className="reportPos">14.º 🔻</span>
                      <h3>MAXI/BAXI</h3>
                      <span className="reportPts">124 puntos</span>
                    </header>
                    <p>
                      Acertó solamente tres grupos de doce, la peor marca de la competición. Veía una zona con cuatro selecciones y elegía clasificar a las dos que volvían a casa.
                    </p>
                    <p>
                      Su estrategia durante la final fue “aguantar veinte más”. La aplicó durante todo el torneo y, efectivamente, aguantó hasta terminar penúltimo.
                    </p>
                    <p className="reportFooter">Tuvo 86 aciertos, más que Nahuel, pero cinco puntos menos. Prueba definitiva de que para entender el reglamento de la Copa Kahl hacía falta un contador, un abogado y acceso al teléfono del organizador.</p>
                  </article>

                  <article className="reportCard relegated">
                    <header>
                      <span className="reportPos">15.º 🔻</span>
                      <h3>FER</h3>
                      <span className="reportPts">118 puntos</span>
                    </header>
                    <p>
                      Último, tres exactos, 49 derrotas y 75 aciertos: líder indiscutido en todas las estadísticas que nadie quería ganar.
                    </p>
                    <p>
                      En semifinales apareció gritando “¡CAGONES!” mientras ocupaba el fondo de la tabla. Es como que Deportivo Riestra cargue al Real Madrid por perder una Champions.
                    </p>
                    <p>
                      Una vez sumó cinco puntos y escribió: “No lo puedo creer”. Esa frase resume perfectamente su Mundial.
                    </p>
                    <p className="reportFooter">El verdadero batacazo de la Copa Kahl habría sido que Fer no terminara último.</p>
                  </article>

                  <article className="reportCard disciplinary">
                    <header>
                      <span className="reportPos">🚨 SANCIONADO</span>
                      <h3>ALE CON PELO</h3>
                      <span className="reportPts">MENCIÓN DISCIPLINARIA</span>
                    </header>
                    <p>
                      Llegó tarde, denunció que la aplicación no funcionaba, amenazó con irse al prode de ML y abandonó. Resultado: descenso directo a la C y suspensión durante las próximas tres copas.
                    </p>
                    <p className="reportFooter">Ni siquiera consiguió un puesto final: terminó más expulsado que clasificado. Lo único que permaneció en Primera fue el pelo, y aparentemente también está evaluando retirarse.</p>
                  </article>
                </div>

                <div className="falloFinalCard" style={{ marginTop: "20px" }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "1.3rem", color: "#b91c1c", textTransform: "uppercase", fontWeight: 900 }}>⚖️ FALLO FINAL</h3>
                  <ul style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "8px", fontWeight: 700 }}>
                    <li>Gonza: campeón mundial sin acertar al campeón mundial.</li>
                    <li>Nico: cebollita oficial.</li>
                    <li>Miguel: de puntero histórico a borracho de la B.</li>
                    <li>Ale: campeón de una tabla que solamente reconoce él.</li>
                    <li>Javi, Buda y Miguel: a remar en la B Nacional.</li>
                    <li>Ale con Pelo: a la C, suspendido y sin derecho a presentar champú como apelación.</li>
                    <li>Nahuel: organizó la fiesta y terminó lavando los platos en el descenso.</li>
                    <li>Fer: último con autoridad.</li>
                  </ul>
                  <p style={{ margin: "16px 0 0", fontStyle: "italic", fontWeight: 800, fontSize: "1.05rem" }}>
                    La Copa Kahl no la ganó el que más sabía de fútbol. La ganó Gonza, que es la demostración científica de esa afirmación. Nos vemos en la próxima edición, si antes el campeón no convierte el trofeo en un curso de Amway. 🏆🐨
                  </p>
                </div>
              </section>
            )}
          </div>
        ) : (
          <section className="palmaresPanel" style={{ marginTop: "16px" }}>
            <div className="panelHeader">
              <p className="eyebrow">Medallero Histórico Acumulado</p>
              <h2>Palmarés Completo de Campeones y Podios</h2>
              <p>Clasificación histórica acumulada según medallas de Oro (Campeón), Plata (Subcampeón) y Bronce (3er Puesto) obtenidas en todas las copas.</p>
            </div>

            <div className="tableWrapper">
              <table className="recopaTable palmaresTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>🏆 Oro</th>
                    <th>🥈 Plata</th>
                    <th>🥉 Bronce</th>
                    <th>Detalle de Medallas & Copas</th>
                  </tr>
                </thead>
                <tbody>
                  {allTimePalmares.map((player, idx) => (
                    <tr key={player.participant} className={idx === 0 ? "kingRow" : idx === 1 ? "runnerUpRow" : ""}>
                      <td className="posCell">
                        {idx === 0 ? (
                          <Trophy size={18} className="goldTrophy" />
                        ) : idx === 1 ? (
                          <Medal size={18} className="silverMedal" />
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td>
                        <div className="participantCell">
                          <strong>{player.participant}</strong>
                        </div>
                      </td>
                      <td className="pointsCell" style={{ color: "#d97706", fontWeight: 900 }}>{player.gold}</td>
                      <td className="pointsCell" style={{ color: "#475569", fontWeight: 900 }}>{player.silver}</td>
                      <td className="pointsCell" style={{ color: "#c2410c", fontWeight: 900 }}>{player.bronze}</td>
                      <td>
                        {player.medals.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className={`historyBadge ${
                              m.type === "gold" ? "championTag" : m.type === "silver" ? "runnerTag" : "podiumTag"
                            }`}
                            style={{ marginRight: 6, display: "inline-block", margin: "3px 4px" }}
                          >
                            {m.type === "gold" ? "🏆" : m.type === "silver" ? "🥈" : "🥉"} {m.title}
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
              <span style={{ fontWeight: 900, color: "#ffffff", background: "#b91c1c", borderColor: "#7f1d1d", fontSize: "0.85rem", textTransform: "uppercase" }}>Copa Kahl 2026:</span>
              {["Fer", "Maxi", "Nahuel"].map((name) => (
                <span key={name}>
                  <ShieldAlert size={18} aria-hidden="true" />
                  {name}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              <span style={{ fontWeight: 900, color: "#ffffff", background: "#b91c1c", borderColor: "#7f1d1d", fontSize: "0.85rem", textTransform: "uppercase" }}>Copa Chiqui Bauch 2026:</span>
              {["Javi", "Buda (Matías Nicolas)"].map((name) => (
                <span key={name}>
                  <ShieldAlert size={18} aria-hidden="true" />
                  {name}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              <span style={{ fontWeight: 900, color: "#ffffff", background: "#b91c1c", borderColor: "#7f1d1d", fontSize: "0.85rem", textTransform: "uppercase" }}>Copa Fiss 2025:</span>
              {["Miguel", "Gonza"].map((name) => (
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
