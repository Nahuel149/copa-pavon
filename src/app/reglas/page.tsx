import Link from "next/link";
import { ArrowRight, Brackets, ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";


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
    points: "3 pts",
    copy: "Si acertás el marcador exacto del partido, sumás 3 puntos.",
  },
  {
    label: "Ganador / acierto",
    points: "1 pt",
    copy: "Si no pegás el exacto pero acertás quién gana (o que empatan), sumás 1 punto.",
  },
  {
    label: "Goleador acertado",
    points: "1 pt",
    copy: "Si elegís un goleador y ese jugador convierte en el partido, sumás 1 punto extra.",
  },
];

export default function ReglasPage() {
  return (
    <div className="pageStack">
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
          <p className="eyebrow">Tabla</p>
          <h2>Acumulado automático</h2>
          <p>
            La tabla toma todos los envíos guardados y los compara contra los resultados oficiales cargados en admin.
            Cada nuevo resultado recalcula totales, desempates y columnas de puntos.
          </p>
        </article>
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Mano a mano</p>
        <h2>Puntos por etapa.</h2>
        <p>
          Los partidos mano a mano se juegan con marcador exacto, ganador y goleador. En semifinales se usan los puntos
          base. En la final los puntos suben para darle más peso al último partido. Cada partido se bloquea 10 minutos
          antes de empezar.
        </p>
      </section>

      <section className="scoreRuleGrid knockoutScoreGrid" aria-label="Puntos por etapa">
        <article>
          <span>Semifinales</span>
          <strong>3 / 1 / 1</strong>
          <p>
            Exacto: 3 pts. Ganador/acierto: 1 pt. Goleador acertado: 1 pt. Máximo 5 puntos por partido.
          </p>
        </article>
        <article>
          <span>Final</span>
          <strong>5 / 3 / 2</strong>
          <p>
            Exacto: 5 pts. Ganador/acierto: 3 pts. Goleador acertado: 2 pts. Máximo 7 puntos en la final.
          </p>
        </article>
      </section>

      <section className="rulesCallout">
        <Brackets size={28} aria-hidden="true" />
        <div>
          <h2>Importante</h2>
          <p>
            Revisá bien antes de enviar. Después podés volver a editar los partidos que todavía no cerraron.
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
