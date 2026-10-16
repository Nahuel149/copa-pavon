"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildPredictionShareSvg, predictionImageFile } from "@/lib/prediction-share";
import { Download, Share2, RefreshCw } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { isoToArgentinaInput } from "@/lib/argentina-time";
import { readJsonResponse } from "@/lib/client-json";
import type { KnockoutFixture } from "@/lib/matches";
import { predictionVerdict, predictionVerdictLabels } from "@/lib/prediction-verdict";
import type { KnockoutResult, Submission } from "@/lib/prode";

type PublicPredictions = {
  submissions: Omit<Submission, "pinHash">[];
  results: { knockoutFixtures: KnockoutFixture[]; knockoutResults: KnockoutResult[] };
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
  const [sharing, setSharing] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<Record<string,string>>({});
  async function sharePredictions(fixture: KnockoutFixture, downloadOnly = false) {
    if (sharing) return;
    setSharing(fixture.id);
    setShareMessage(current=>({...current,[fixture.id]:""}));
    try {
      const file=await predictionImageFile(buildPredictionShareSvg(fixture,visibleParticipants,data?.knockoutVisibility[fixture.id]?.public===true,data?.results.knockoutResults?.find(result=>result.fixtureId===fixture.id)),`pronosticos-${fixture.id}.png`);
      if(!downloadOnly && navigator.canShare?.({files:[file]})) {
        await navigator.share({title:`${fixture.home} vs ${fixture.away}`,files:[file]});
        setShareMessage(current=>({...current,[fixture.id]:"Imagen lista para compartir."}));
      } else {
        const url=URL.createObjectURL(file);const link=document.createElement("a");link.href=url;link.download=file.name;link.click();URL.revokeObjectURL(url);
        setShareMessage(current=>({...current,[fixture.id]:"Imagen descargada."}));
      }
    } catch(caught) {
      if(!(caught instanceof Error && caught.name==="AbortError"))setShareMessage(current=>({...current,[fixture.id]:caught instanceof Error?caught.message:"No se pudo generar la imagen."}));
    } finally {setSharing(null);}
  }
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
            const officialResult = data?.results.knockoutResults?.find(result=>result.fixtureId===fixture.id);
            const visibility = data?.knockoutVisibility[fixture.id];
            const isPublic = visibility?.public === true;
            const competition = fixture.id.startsWith("sudamericana-") ? "Copa Sudamericana" : fixture.id.startsWith("libertadores-") ? "Copa Libertadores" : fixture.id.startsWith("copa-argentina-") ? "Copa Argentina" : "Eliminatorias";
            return <article className="publicPredictionCard" key={fixture.id}>
              <header><span className="eyebrow">{competition} · {fixture.id.endsWith("-ida") ? "Ida" : fixture.id.endsWith("-vuelta") ? "Vuelta" : "Semifinal"}</span><div className="homeFixtureTeams"><TeamBadge team={fixture.home} /><span>vs.</span><TeamBadge team={fixture.away} /></div><p>{fixture.schedulePending || !fixture.kickoffAt ? "Fecha y horario a confirmar" : argentinaDate(fixture.kickoffAt)}</p></header>
              {!isPublic ? <p className="predictionPrivacyNote">{fixture.schedulePending || !fixture.kickoffAt ? "Los pronósticos se publicarán al cierre, una vez confirmado el horario." : `Pronósticos privados hasta ${visibility?.unlockAt ? argentinaDate(visibility.unlockAt) : "el cierre del partido"}.`}</p> : null}
              {officialResult ? <div className="predictionResultSummary"><strong>Resultado oficial: {officialResult.homeGoals}–{officialResult.awayGoals}</strong>{officialResult.qualifiedTeam ? <span>Clasificado: {officialResult.qualifiedTeam==="home"?fixture.home:fixture.away}</span>:null}<p><span>Verde: exacto</span> · <span>Amarillo: resultado o clasificado</span> · <span>Rojo: sin aciertos</span>. El goleador no influye en el color.</p></div>:null}
              <div className="predictionShareActions">
                <button className="tableButton" type="button" disabled={sharing!==null || visibleParticipants.length===0} onClick={()=>void sharePredictions(fixture)}><Share2 size={16} aria-hidden="true"/> Compartir</button>
                <button className="tableButton" type="button" disabled={sharing!==null || visibleParticipants.length===0} onClick={()=>void sharePredictions(fixture,true)}><Download size={16} aria-hidden="true"/> {sharing===fixture.id?"Preparando…":"Guardar foto"}</button>
              </div>
              {shareMessage[fixture.id]?<p role="status">{shareMessage[fixture.id]}</p>:null}
              <div className="tableShell"><table className="publicPredictionTable"><colgroup><col style={{width:"34%"}}/><col style={{width:"18%"}}/><col style={{width:"24%"}}/><col style={{width:"24%"}}/></colgroup><thead><tr><th scope="col">Participante</th><th scope="col">Marcador</th><th scope="col">Clasificado</th><th scope="col">Goleador</th></tr></thead><tbody>{visibleParticipants.map((participant) => {
                const prediction = participant.knockoutPredictions.find((item) => item.fixtureId === fixture.id);
                const verdict = isPublic ? predictionVerdict(fixture,prediction,officialResult) : "pending";
                return <tr className={`predictionVerdict-${verdict}`} title={predictionVerdictLabels[verdict]} key={participant.id}><th scope="row">{participant.name}</th>{isPublic ? <><td>{prediction ? `${prediction.homeGoals} - ${prediction.awayGoals}` : "Sin cargar"}</td><td>{prediction?.qualifiedTeam ? (prediction.qualifiedTeam === "home" ? fixture.home : fixture.away) : "—"}</td><td>{prediction?.goalScorer || "—"}</td></> : <td colSpan={3}>Privado hasta el cierre</td>}</tr>;
              })}</tbody></table></div>
              {participants.length === 0 ? <p>Todavía no hay participantes anotados.</p> : null}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
