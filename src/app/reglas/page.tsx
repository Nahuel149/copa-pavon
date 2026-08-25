import Link from "next/link";
import { ArrowRight, BookOpenCheck, Brackets, CheckCircle2, ClipboardList, HelpCircle, RefreshCw, ShieldCheck, Sparkles, Trophy } from "lucide-react";

const ruleSteps = [
  {
    title: "1. Anotate con Nombre y PIN",
    copy: "Elegí tu nombre y un PIN numérico desde la Tabla o Editar Prode. Con ellos vas a poder ingresar y modificar tus jugadas.",
    icon: ClipboardList,
  },
  {
    title: "2. Cargá tus pronósticos",
    copy: "Completá los marcadores exactos, el clasificado (si el cruce tiene definición) y el goleador del partido.",
    icon: ShieldCheck,
  },
  {
    title: "3. Seguí la tabla en vivo",
    copy: "A medida que se carguen los resultados oficiales, la tabla recalcula las posiciones y puntos acumulados al instante.",
    icon: RefreshCw,
  },
];

const scoringRules = [
  {
    label: "Resultado exacto",
    points: "3 pts / 5 pts",
    copy: "Si acertás el marcador exacto en los 90' o 120'. Vale 3 pts en Semifinales y 5 pts en la Final.",
  },
  {
    label: "Ganador / Empate (1X2)",
    points: "1 pt / 3 pts",
    copy: "Si no pegás el exacto pero acertás quién gana o si termina en empate. Vale 1 pt en Semifinales y 3 pts en la Final.",
  },
  {
    label: "Clasificado / Penales",
    points: "+1 pt",
    copy: "En partidos que definen cruce (Vuelta o Partido Único), si acertás quién avanza a la siguiente ronda o es campeón.",
  },
  {
    label: "Goleador acertado",
    points: "1 pt / 2 pts",
    copy: "Si el jugador que elegiste convierte al menos un gol en el partido. Vale 1 pt en Semifinales y 2 pts en la Final.",
  },
];

function ArgentinaFlagBadge() {
  return (
    <span title="Argentina" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "17px", borderRadius: "3px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.25)", background: "#75AADB", flexShrink: 0 }}>
      <svg width="26" height="17" viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="20" fill="#75AADB"/>
        <rect y="6.66" width="30" height="6.66" fill="#FFFFFF"/>
        <circle cx="15" cy="10" r="2.3" fill="#F6B40E"/>
        <path d="M15 6.8L15.4 8.5L16.8 7.7L15.9 9.1L17.7 10L15.9 10.9L16.8 12.3L15.4 11.5L15 13.2L14.6 11.5L13.2 12.3L14.1 10.9L12.3 10L14.1 9.1L13.2 7.7L14.6 8.5Z" fill="#855B14"/>
      </svg>
    </span>
  );
}

export default function ReglasPage() {
  return (
    <div className="pageStack">
      {/* 1. HERO */}
      <section className="heroBand tableHero standingsHero">
        <div>
          <p className="eyebrow" style={{ background: "#fef08a", color: "#854d0e", border: "2px solid #000", fontWeight: 900 }}>
            REGLAMENTO OFICIAL 🏆
          </p>
          <h1>Copa Se mató Pavón</h1>
          <p className="heroCopy">
            Guía completa sobre el sistema de puntuación independiente, los mano a mano y el formato de las 4 competiciones estelares.
          </p>
        </div>
      </section>

      {/* 2. PASO A PASO */}
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

      {/* 3. SISTEMA DE PUNTOS SEPARADOS */}
      <section className="sectionHeader">
        <p className="eyebrow">Puntaje</p>
        <h2>Cómo suma cada acierto (Puntos Separados).</h2>
        <p>
          Los puntos se cuentan de manera individual por cada ítem acertado en el partido:
        </p>
      </section>

      <section className="scoreRuleGrid" aria-label="Sistema de puntos" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {scoringRules.map((rule) => (
          <article key={rule.label}>
            <span>{rule.label}</span>
            <strong>{rule.points}</strong>
            <p>{rule.copy}</p>
          </article>
        ))}
      </section>

      {/* 4. EJEMPLO PRÁCTICO */}
      <section className="validationPanel" style={{ background: "var(--panel, #fff)", border: "2px solid rgba(5,5,5,0.15)", borderRadius: "16px", padding: "24px" }}>
        <p className="eyebrow" style={{ background: "#38bdf8", color: "#0369a1", border: "2px solid #000", fontWeight: 900, display: "inline-block", padding: "4px 10px", borderRadius: "10px", fontSize: "0.8rem", marginBottom: "10px" }}>
          💡 EJEMPLO PRÁCTICO
        </p>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px" }}>
          ¿Cómo se acumulan los puntos en una Semifinal?
        </h2>
        <p style={{ fontSize: "1rem", lineHeight: "1.6", marginBottom: "12px" }}>
          Supongamos que en un partido decisivo pronosticás <strong>1 - 1</strong> con clasificación por penales para el <strong>Equipo A</strong> y elegís de goleador a <strong>Messi</strong>:
        </p>
        <div style={{ display: "grid", gap: "10px", background: "rgba(0,0,0,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", fontSize: "0.95rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>Si el partido termina <strong>2 - 2</strong>: Sumás <strong>1 punto</strong> por acertar que empataron (aunque no diste el resultado exacto).</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>Si en los penales clasifica el <strong>Equipo A</strong>: Sumás <strong>+1 punto extra</strong> por acertar el ganador de la serie.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>Si además convirtió <strong>Messi</strong>: Sumás <strong>+1 punto extra</strong> por el goleador.</span>
          </div>
          <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px solid rgba(0,0,0,0.1)", fontWeight: 800 }}>
            🔥 Total acumulado en esa jugada: 1 + 1 + 1 = 3 puntos.
          </div>
        </div>
      </section>

      {/* 5. PUNTOS POR ETAPA: SEMIS VS FINAL */}
      <section className="sectionHeader">
        <p className="eyebrow">Mano a mano</p>
        <h2>Escala de puntos por Etapa.</h2>
        <p>En la gran Final todos los aciertos tienen mayor valor para definir al campeón del prode.</p>
      </section>

      <section className="scoreRuleGrid knockoutScoreGrid" aria-label="Puntos por etapa">
        <article>
          <span>Semifinales</span>
          <strong>3 / 1 / 1</strong>
          <p className="scoreRuleLegend">Exacto (3 pts) · Ganador/Empate (1 pt) · Goleador (1 pt).</p>
          <p>En partidos con definición por penales, el clasificado suma <strong>+1 pt extra</strong>.</p>
        </article>
        <article>
          <span>Final</span>
          <strong>5 / 3 / 2</strong>
          <p className="scoreRuleLegend">Exacto (5 pts) · Ganador/Campeón (3 pts) · Goleador (2 pts).</p>
          <p>Puntaje máximo de hasta 10 puntos en la final.</p>
        </article>
      </section>

      {/* 6. FORMATO DE LAS 4 COMPETENCIAS */}
      <section className="sectionHeader">
        <p className="eyebrow">Competencias</p>
        <h2>Formato de las 4 Copas Estelares.</h2>
        <p>La Copa Se mató Pavón unifica las etapas decisivas de cuatro torneos clave:</p>
      </section>

      <div className="reportCardsGrid">
        <article className="reportCard proximamenteCard">
          <header>
            <span style={{ fontSize: "1.6rem" }}>🌎</span>
            <h3>COPA SUDAMERICANA</h3>
            <span className="reportPts">Ida y Vuelta</span>
          </header>
          <p>
            <strong>Semifinales:</strong> 2 partidos (Ida y Vuelta). El partido de Ida puede terminar en empate sin definición. La Vuelta define al clasificado (tiempo extra / penales).
          </p>
          <p style={{ marginTop: "6px" }}>
            <strong>Final:</strong> Partido Único en sede neutral con definición de campeón.
          </p>
        </article>

        <article className="reportCard proximamenteCard">
          <header>
            <span style={{ fontSize: "1.6rem" }}>🏆</span>
            <h3>COPA LIBERTADORES</h3>
            <span className="reportPts">Ida y Vuelta</span>
          </header>
          <p>
            <strong>Semifinales:</strong> 2 partidos (Ida y Vuelta). La Ida no tiene penales; la Vuelta define quién pasa a la final.
          </p>
          <p style={{ marginTop: "6px" }}>
            <strong>Final:</strong> Partido Único por la gloria eterna.
          </p>
        </article>

        <article className="reportCard proximamenteCard">
          <header>
            <ArgentinaFlagBadge />
            <h3>COPA ARGENTINA</h3>
            <span className="reportPts">Partido Único</span>
          </header>
          <p>
            <strong>Semifinales:</strong> 1 solo partido mano a mano. Si termina empatado en los 90', va directamente a definición por penales.
          </p>
          <p style={{ marginTop: "6px" }}>
            <strong>Final:</strong> Partido Único con definición por penales en caso de empate.
          </p>
        </article>

        <article className="reportCard proximamenteCard">
          <header>
            <span style={{ fontSize: "1.6rem" }}>⚽</span>
            <h3>COPA DE LA LIGA</h3>
            <span className="reportPts">Partido Único</span>
          </header>
          <p>
            <strong>Semifinales:</strong> 1 solo partido eliminatorio en cancha neutral. En caso de igualdad, se define por penales.
          </p>
          <p style={{ marginTop: "6px" }}>
            <strong>Final:</strong> Partido Único decisivo por el título local.
          </p>
        </article>
      </div>

      {/* 7. CIERRE & LLAMADO A LA ACCIÓN */}
      <section className="rulesCallout">
        <Brackets size={28} aria-hidden="true" />
        <div>
          <h2>Cierre de partidos</h2>
          <p>
            Cada cruce se puede cargar o editar hasta <strong>10 minutos antes</strong> de su horario oficial de inicio. Pasado ese límite, el partido queda bloqueado y se hace público para todos.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link className="primaryAction" href="/editar_prode">
            Ir a Editar Prode
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
