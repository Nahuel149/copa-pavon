import Link from "next/link";
import { ArrowRight, BadgeCheck, Brackets, ClipboardList, Medal, RefreshCw, ShieldCheck, Target } from "lucide-react";
import { choiceMatches, exactScoreMatches, groups, knockoutStageLabels, knockoutStageSchedule, knockoutStageScoring, knockoutStages, matches } from "@/lib/matches";

const ruleSteps = [
  {
    title: "1. Cargá tu nombre",
    copy: "Usá siempre el mismo nombre. El envío de fase de grupos queda cerrado y no se puede editar.",
    icon: ClipboardList,
  },
  {
    title: "2. Completá todo",
    copy: "El formulario no deja enviar si falta un partido, un resultado exacto o un top 2 de grupo.",
    icon: ShieldCheck,
  },
  {
    title: "3. Seguí la tabla",
    copy: "Cuando admin carga resultados oficiales, la tabla recalcula los puntos acumulados automáticamente.",
    icon: RefreshCw,
  },
];

const scoringRules = [
  {
    label: "Resultado exacto",
    points: "2 pts",
    copy: `${exactScoreMatches.length} partidos de fase de grupos piden marcador exacto. En eliminatorias el valor sube segun la etapa.`,
  },
  {
    label: "Ganador / empate",
    points: "1 pt",
    copy: `${choiceMatches.length} partidos de fase de grupos piden elegir local, empate o visitante.`,
  },
  {
    label: "Top 2 de grupo",
    points: "3 pts",
    copy: "Si acertás los dos clasificados del grupo, suma aunque el orden de 1º y 2º esté invertido.",
  },
];

export default function ReglasPage() {
  return (
    <div className="pageStack">
      <section className="compactHero">
        <div>
          <p className="eyebrow">Reglas</p>
          <h1>Cómo se juega.</h1>
          <span>Puntos, grupos y eliminatorias en una sola pagina.</span>
        </div>
        <Link className="primaryAction light" href="/">
          <ClipboardList size={18} aria-hidden="true" />
          Ir al formulario
        </Link>
      </section>

      <section className="metricGrid" aria-label="Resumen del prode">
        <article className="metric">
          <Target size={20} aria-hidden="true" />
          <span>Partidos fase grupos</span>
          <strong>{matches.length}</strong>
        </article>
        <article className="metric">
          <BadgeCheck size={20} aria-hidden="true" />
          <span>Exactos en grupos</span>
          <strong>{exactScoreMatches.length}</strong>
        </article>
        <article className="metric alert">
          <Medal size={20} aria-hidden="true" />
          <span>Grupos con top 2</span>
          <strong>{groups.length}</strong>
        </article>
      </section>

      <section className="rulesFlow" aria-label="Qué tiene que hacer cada participante">
        {ruleSteps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
            </article>
          );
        })}
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Puntaje</p>
        <h2>Cómo suma cada acierto.</h2>
      </section>

      <section className="scoreRuleGrid" aria-label="Sistema de puntos">
        {scoringRules.map((rule) => (
          <article key={rule.label}>
            <span>{rule.label}</span>
            <strong>{rule.points}</strong>
            <p>{rule.copy}</p>
          </article>
        ))}
      </section>

      <section className="rulesDetailGrid" aria-label="Detalles importantes">
        <article>
          <p className="eyebrow">Fase de grupos</p>
          <h2>Híbrido por fecha</h2>
          <p>
            Hay 10 partidos importantes por fecha con marcador exacto. El resto se juega con 1X2: gana local, empate o
            gana visitante.
          </p>
        </article>
        <article>
          <p className="eyebrow">Clasificados</p>
          <h2>Top 2 por grupo</h2>
          <p>
            Se eligen dos equipos por grupo. Si los dos equipos son correctos, sumás 3 puntos. Si acertás uno solo o
            ninguno, suma 0.
          </p>
        </article>
        <article>
          <p className="eyebrow">Eliminatorias</p>
          <h2>16avos desde el 28 de junio</h2>
          <p>
            Cuando admin cargue los cruces, cada participante completa marcadores exactos. Si no pega exacto pero acierta
            el ganador/clasificado, tambien suma puntos. Desde 16avos tambien puede elegir un goleador del partido:
            si ese jugador convierte, suma 1 punto extra. Si deja el goleador vacio, se toma como apuesta a 0-0
            sin goleadores; si el partido termina asi, tambien suma ese punto. El marcador de eliminatorias cuenta al
            final de los 120 minutos: si sale empatado y acertaste el marcador exacto pero erraste el clasificado por
            penales, suma 2 puntos.
          </p>
        </article>
        <article>
          <p className="eyebrow">Tabla</p>
          <h2>Acumulado automático</h2>
          <p>
            La tabla toma todos los envíos guardados y los compara contra los resultados oficiales cargados en admin.
            Cada nuevo resultado recalcula totales, desempates y columnas de puntos.
          </p>
        </article>
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Eliminatorias</p>
        <h2>Puntos por etapa.</h2>
        <p>
          Los 16avos empiezan el 28 de junio. Desde ahi, cada ronda pesa mas para mantener el prode abierto. El goleador
          acertado suma 1 punto extra en cualquier cruce. Dejarlo vacio equivale a elegir sin goleador, y suma si el
          partido termina 0-0. En empates tras 120 minutos tambien se elige quien clasifica por penales.
        </p>
      </section>

      <section className="scoreRuleGrid knockoutScoreGrid" aria-label="Puntos de eliminatorias">
        {knockoutStages.map((stage) => {
          const scoring = knockoutStageScoring[stage];
          return (
            <article key={stage}>
              <span>{knockoutStageLabels[stage]}</span>
              <strong>{scoring.exact} / {scoring.winner}</strong>
              <p>
                Exacto: {scoring.exact} pts. {scoring.winnerLabel}: {scoring.winner} pts. Fecha: {knockoutStageSchedule[stage]}.
                Empate exacto con clasificado errado: 2 pts.
              </p>
            </article>
          );
        })}
      </section>

      <section className="rulesCallout">
        <Brackets size={28} aria-hidden="true" />
        <div>
          <h2>Importante</h2>
          <p>
            El envío es definitivo. Antes de mandar, revisá nombre, partidos y grupos. Después podés volver para cargar
            eliminatorias cuando los cruces estén disponibles.
          </p>
        </div>
        <Link className="primaryAction" href="/tabla">
          Ver tabla
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

    </div>
  );
}
