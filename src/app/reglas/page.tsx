import Link from "next/link";
import { ArrowRight, Brackets, CheckCircle2, ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";

const ruleSteps = [
  {
    title: "1. Entrá con tu nombre y PIN",
    copy: "Usá el mismo nombre y PIN para abrir tu prode y modificar los partidos que todavía estén habilitados.",
    icon: ClipboardList,
  },
  {
    title: "2. Pronosticá cada partido",
    copy: "Cargá el marcador y un goleador. En las vueltas y los partidos únicos, elegí además el equipo que clasifica.",
    icon: ShieldCheck,
  },
  {
    title: "3. Seguí la tabla",
    copy: "Cuando se cargan los resultados oficiales, la tabla recalcula automáticamente los puntos acumulados.",
    icon: RefreshCw,
  },
];

const scoringRules = [
  {
    label: "Marcador o resultado",
    points: "3 o 1 · 5 o 3",
    copy: "En semifinales, el marcador exacto vale 3. Si no acertás el exacto pero sí el triunfo local, el empate o el triunfo visitante, sumás 1. En la final, valen 5 y 3. Son excluyentes: el exacto no suma también el punto por resultado.",
  },
  {
    label: "Equipo que clasifica",
    points: "+1",
    copy: "Se suma después de terminar la vuelta o el partido único y cargar el clasificado oficial. Si acertás quién avanza o sale campeón, ganás +1. Se elige por separado del marcador del partido.",
  },
  {
    label: "Goleador",
    points: "+1",
    copy: "Sumás si el jugador nombrado convierte durante el partido. Los goles de la tanda de penales no cuentan. Podés elegir “sin goleador” para un 0-0, pero no da bonus.",
  },
  {
    label: "Minoría",
    points: "+2",
    copy: "Solo en el partido que define la serie: si acertás el clasificado y lo eligieron 7 participantes o menos. En ida y vuelta, los votos se cuentan al cierre del segundo partido.",
  },
];

function ArgentinaFlagBadge() {
  return (
    <span title="Argentina" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "17px", borderRadius: "3px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.25)", background: "#75AADB", flexShrink: 0 }}>
      <svg width="26" height="17" viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="30" height="20" fill="#75AADB" />
        <rect y="6.66" width="30" height="6.66" fill="#FFFFFF" />
        <circle cx="15" cy="10" r="2.3" fill="#F6B40E" />
        <path d="M15 6.8L15.4 8.5L16.8 7.7L15.9 9.1L17.7 10L15.9 10.9L16.8 12.3L15.4 11.5L15 13.2L14.6 11.5L13.2 12.3L14.1 10.9L12.3 10L14.1 9.1L13.2 7.7L14.6 8.5Z" fill="#855B14" />
      </svg>
    </span>
  );
}

export default function ReglasPage() {
  return (
    <div className="pageStack">
      <section className="heroBand tableHero standingsHero">
        <div>
          <p className="eyebrow" style={{ background: "#fef08a", color: "#854d0e", border: "2px solid #000", fontWeight: 900 }}>
            Reglamento oficial
          </p>
          <h1>Copa Se mató Pavón</h1>
          <p className="heroCopy">
            Cada partido se pronostica y puntúa de manera individual. En las series de ida y vuelta, el marcador de cada partido y el equipo que clasifica son aciertos distintos.
          </p>
        </div>
      </section>

      <section className="rulesFlow" aria-label="Cómo participar">
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
        <h2>Qué suma en cada partido</h2>
        <p>El marcador exacto y el resultado correcto son alternativas. Los demás aciertos se agregan cuando corresponden.</p>
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

      <section className="validationPanel" style={{ background: "var(--panel, #fff)", border: "2px solid rgba(5,5,5,0.15)", borderRadius: "16px", padding: "24px" }}>
        <p className="eyebrow">Ejemplo</p>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px" }}>Máximo de una semifinal definitoria: 7 puntos</h2>
        <p style={{ fontSize: "1rem", lineHeight: "1.6", marginBottom: "12px" }}>
          Si acertás el marcador exacto, el equipo que clasifica, un goleador y además se activa el bonus de minoría:
        </p>
        <div style={{ display: "grid", gap: "10px", background: "rgba(0,0,0,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", fontSize: "0.95rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" aria-hidden="true" />
            <span>Marcador exacto: <strong>3 puntos</strong>.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" aria-hidden="true" />
            <span>Clasificado y goleador: <strong>1 + 1 puntos</strong>.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" aria-hidden="true" />
            <span>Minoría de 7 votos o menos al cierre: <strong>2 puntos</strong>.</span>
          </div>
          <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px solid rgba(0,0,0,0.1)", fontWeight: 800 }}>
            Total: 3 + 1 + 1 + 2 = 7 puntos.
          </div>
        </div>
      </section>

      <section className="scoreRuleGrid knockoutScoreGrid" aria-label="Máximos por tipo de partido">
        <article>
          <span>Semifinal · Ida</span>
          <strong>Máximo 4</strong>
          <p className="scoreRuleLegend">Exacto 3 + goleador 1. La ida no pide clasificado ni habilita bonus de minoría, incluso si termina empatada.</p>
        </article>
        <article>
          <span>Semifinal · Definitorio</span>
          <strong>Máximo 7</strong>
          <p className="scoreRuleLegend">Exacto 3 + clasificado 1 + goleador 1 + minoría 2.</p>
        </article>
        <article>
          <span>Final</span>
          <strong>Máximo 9</strong>
          <p className="scoreRuleLegend">Exacto 5 + campeón 1 + goleador 1 + minoría 2. Si no acertás el exacto, el resultado correcto vale 3.</p>
        </article>
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Definición</p>
        <h2>Marcador y clasificación se pronostican por separado</h2>
        <p>
          En una vuelta, elegís quién clasifica aunque tu marcador no sea empate. La clasificación puede definirse por el resultado global, tiempo extra o penales. En un partido único de semifinal o final también elegís siempre al clasificado o campeón.
        </p>
        <p>
          Ejemplo: Boca gana la ida 2-0 y Vasco gana la vuelta 1-0. Vasco ganó ese partido, pero Boca clasificó 2-1 en el resultado global. Si pronosticaste 1-0, sumás los 3 puntos del exacto aunque hayas elegido mal al clasificado; el clasificado se evalúa aparte y vale +1.
        </p>
        <p>
          También podés errar el marcador y sumar por la serie: acertar que Boca clasifica vale +1 y, si lo eligieron 7 participantes o menos, agrega +2 de minoría.
        </p>
      </section>

      <div className="reportCardsGrid">
        <article className="reportCard proximamenteCard">
          <header>
            <Brackets size={24} aria-hidden="true" />
            <h3>Sudamericana y Libertadores</h3>
            <span className="reportPts">Ida y vuelta</span>
          </header>
          <p>Las semifinales tienen dos partidos. La ida puntúa solo marcador/resultado y goleador; la vuelta agrega clasificado y posible bonus de minoría. La final es un partido único definitorio.</p>
        </article>
        <article className="reportCard proximamenteCard">
          <header>
            <ArgentinaFlagBadge />
            <h3>Copa Argentina y Copa de la Liga</h3>
            <span className="reportPts">Partido único</span>
          </header>
          <p>Semifinales y final se definen en un solo partido. Siempre se elige quién clasifica o sale campeón, aunque el marcador pronosticado tenga un ganador.</p>
        </article>
      </div>

      <section className="rulesCallout">
        <Brackets size={28} aria-hidden="true" />
        <div>
          <h2>Cierre de cada partido</h2>
          <p>
            Cada pronóstico se puede cargar o editar hasta <strong>10 minutos antes de su propio horario de inicio</strong>. Los partidos con fecha y horario a confirmar todavía no admiten pronósticos ni cuentan como partidos omitidos. En partidos únicos, la minoría se mide al cierre de ese partido; en series, al cierre de la vuelta.
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
