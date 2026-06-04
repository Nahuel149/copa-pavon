"use client";

import { useEffect, useState } from "react";
import { Brackets, RefreshCw, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { type ClanId, type StandingRow } from "@/lib/prode";

type StandingsResponse = {
  standings: StandingRow[];
  standingsByClan: Record<ClanId, StandingRow[]>;
  playedMatches: number;
  decidedGroups: number;
  knockoutFixtures: number;
  playedKnockoutMatches: number;
  updatedAt: string;
};

export default function TablaPage() {
  const [data, setData] = useState<StandingsResponse>({
    standings: [],
    standingsByClan: { "river-plate": [], "la-batata": [] },
    playedMatches: 0,
    decidedGroups: 0,
    knockoutFixtures: 0,
    playedKnockoutMatches: 0,
    updatedAt: "",
  });
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const rows = data.standingsByClan?.["river-plate"] ?? data.standings.filter((row) => row.clan === "river-plate");
  const relegationCount = rows.length > 10 ? 3 : 2;

  async function loadStandings() {
    setStatus("loading");
    const response = await fetch("/api/standings", { cache: "no-store" });
    const body = (await response.json()) as StandingsResponse;
    setData(body);
    setStatus("ready");
  }

  useEffect(() => {
    void loadStandings();
    const intervalId = window.setInterval(() => {
      void loadStandings();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="pageStack">
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Tabla</p>
          <h1>Posiciones del prode.</h1>
          <p className="heroCopy">
            Puntaje acumulado por 1X2, marcadores exactos, grupos y eliminatorias. Se recalcula con los resultados
            oficiales cargados en admin.
          </p>
        </div>
        <div className="tableRefresh">
          <span>{data.updatedAt ? `Actualizada ${new Date(data.updatedAt).toLocaleTimeString("es-AR")}` : "Actualizando..."}</span>
          <button className="primaryAction light" onClick={loadStandings} type="button">
            <RefreshCw className={status === "loading" ? "spin" : ""} size={18} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </section>

      <KahlImageScatter page="tabla" count={4} variant="compact" />

      <section className="tableShell">
        <div className="tableNote">
          <strong>Tabla</strong>
          <span>
            Los puntos se suman cada vez que existen resultados oficiales: partidos de grupo, top 2 por grupo y cruces
            de eliminatorias.
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Participante</th>
              <th>Puntos</th>
              <th>Exactos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLeader = index === 0;
              const isRelegation = rows.length > 1 && index >= rows.length - relegationCount;
              return (
                <tr className={isLeader ? "leaderRow" : isRelegation ? "relegationRow" : ""} key={row.submissionId}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.totalPoints}</td>
                  <td>{row.exactHits + row.knockoutExactHits}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>La tabla aparece cuando haya envios guardados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="metricGrid" aria-label="Estado de tabla">
        <article className="metric">
          <Users size={20} aria-hidden="true" />
          <span>Participantes</span>
          <strong>{rows.length}</strong>
        </article>
        <article className="metric">
          <Trophy size={20} aria-hidden="true" />
          <span>Partidos con resultado</span>
          <strong>{data.playedMatches}/72</strong>
        </article>
        <article className="metric alert">
          <Brackets size={20} aria-hidden="true" />
          <span>Eliminatorias con resultado</span>
          <strong>{data.playedKnockoutMatches}/{data.knockoutFixtures}</strong>
        </article>
      </section>
    </div>
  );
}
