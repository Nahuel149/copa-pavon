"use client";

export default function PronosticosPage() {
  return (
    <div className="pageStack">
      <section className="heroBand tableHero standingsHero">
        <div>
          <p className="eyebrow" style={{ background: "#fef08a", color: "#854d0e", border: "2px solid #000", fontWeight: 900 }}>
            PRÓXIMAMENTE 🏆
          </p>
          <h1>Copa Se mató Pavón</h1>
          <p className="heroCopy">
            Los pronósticos del mapa de partidos, cruces eliminatorios y tendencias se habilitarán próximamente antes del inicio del torneo.
          </p>
        </div>
      </section>

      <section className="proximamentePanel" style={{ padding: "32px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "16px" }}>⚽</span>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 12px" }}>
            Pronósticos Próximamente
          </h2>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.6, opacity: 0.85 }}>
            Cuando arranque la Copa Se mató Pavón, acá vas a poder ver en vivo los pronósticos de cada participante, marcadores, tendencias y porcentajes de aciertos partido por partido.
          </p>
          <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <a className="primaryAction light" href="/tabla" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              📊 Ver Tabla
            </a>
            <a className="primaryAction light" href="/campeones" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              🏆 Ver Histórico
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
