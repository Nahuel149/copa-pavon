"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { isoToArgentinaInput } from "@/lib/argentina-time";
import { readJsonResponse } from "@/lib/client-json";
import type { KnockoutFixture } from "@/lib/matches";
import type { Submission } from "@/lib/prode";

type PublicPredictions = {
  submissions: Omit<Submission, "pinHash">[];
  results: { knockoutFixtures: KnockoutFixture[] };
  knockoutVisibility: Record<string, { public: boolean; unlockAt: string }>;
  error?: string;
};
function argentinaDate(value: string) {
  const formatted = isoToArgentinaInput(value);
  return `${formatted.slice(0, 10).split("-").reverse().join("/")} · ${formatted.slice(11)} (ARG)`;
}
export default function PronosticosPage() {
  const [data, setData] = useState<PublicPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  async function loadPredictions() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pronosticos", { cache: "no-store" });
      const body = await readJsonResponse<PublicPredictions>(response);
      if (!response.ok || body.error) throw new Error(body.error ?? "No se pudieron cargar los pronósticos.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los pronósticos.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadPredictions(); }, []);
  const fixtures = data?.results.knockoutFixtures ?? [];
  const participants = data?.submissions ?? [];
  const visibleParticipants = selected ? participants.filter((participant) => participant.id === selected) : participants;
  return (
    <div className="pageStack">
      <section className="heroBand tableHero standingsHero">
        <div>
          <p className="eyebrow">PRONÓSTICOS</p>
          <h1>Copa Se mató Pavón</h1>
          <p className="heroCopy">Compará los marcadores, clasificados y goleadores de cada participante. Los pronósticos se hacen públicos cuando cierra la edición de cada partido, 10 minutos antes del inicio.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pavonHeroImage" src="/images/pavon-hero.png" alt="Cristian Pavón junto a la Copa Libertadores" width={1774} height={887} fetchPriority="high" />
      </section>
      <section className="publicPredictionsPanel" aria-labelledby="predictions-title">
        <div className="tableNote">
          <div><strong id="predictions-title">Pronósticos por partido</strong><span>{participants.length} participantes · horarios de Argentina</span></div>
          <button className="tableButton" type="button" disabled={loading} onClick={() => void loadPredictions()}><RefreshCw size={17} aria-hidden="true" /> Actualizar</button>
        </div>
        <div className="predictionsControls">
          <label>Participante<select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Todos los participantes</option>{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}</select></label>
          <Link className="primaryAction" href="/editar_prode">Cargar / editar mi prode</Link>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {loading && !data ? <p role="status">Cargando cruces y participantes…</p> : null}
        {!loading && data && fixtures.length === 0 ? <p>No hay partidos cargados todavía.</p> : null}
        <div className="publicPredictionsGrid">
          {fixtures.map((fixture) => {
            const visibility = data?.knockoutVisibility[fixture.id];
            const isPublic = visibility?.public === true;
            const competition = fixture.id.startsWith("sudamericana-") ? "Copa Sudamericana" : fixture.id.startsWith("libertadores-") ? "Copa Libertadores" : fixture.id.startsWith("copa-argentina-") ? "Copa Argentina" : "Eliminatorias";
            return <article className="publicPredictionCard" key={fixture.id}>
              <header><span className="eyebrow">{competition} · {fixture.id.endsWith("-ida") ? "Ida" : fixture.id.endsWith("-vuelta") ? "Vuelta" : "Semifinal"}</span><div className="homeFixtureTeams"><TeamBadge team={fixture.home} /><span>vs.</span><TeamBadge team={fixture.away} /></div><p>{fixture.schedulePending || !fixture.kickoffAt ? "Fecha y horario a confirmar" : argentinaDate(fixture.kickoffAt)}</p></header>
              {!isPublic ? <p className="predictionPrivacyNote">{fixture.schedulePending || !fixture.kickoffAt ? "Los pronósticos se publicarán al cierre, una vez confirmado el horario." : `Pronósticos privados hasta ${visibility?.unlockAt ? argentinaDate(visibility.unlockAt) : "el cierre del partido"}.`}</p> : null}
              <div className="tableShell"><table className="publicPredictionTable"><thead><tr><th scope="col">Participante</th><th scope="col">Marcador</th><th scope="col">Clasificado</th><th scope="col">Goleador</th></tr></thead><tbody>{visibleParticipants.map((participant) => {
                const prediction = participant.knockoutPredictions.find((item) => item.fixtureId === fixture.id);
                return <tr key={participant.id}><th scope="row">{participant.name}</th>{isPublic ? <><td>{prediction ? `${prediction.homeGoals} - ${prediction.awayGoals}` : "Sin pronóstico"}</td><td>{prediction?.qualifiedTeam ? (prediction.qualifiedTeam === "home" ? fixture.home : fixture.away) : "—"}</td><td>{prediction?.goalScorer || "—"}</td></> : <td colSpan={3}>Privado hasta el cierre</td>}</tr>;
              })}</tbody></table></div>
              {participants.length === 0 ? <p>Todavía no hay participantes anotados.</p> : null}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
