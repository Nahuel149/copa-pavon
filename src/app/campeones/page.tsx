import { Award, ShieldAlert, Trophy } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";

const champions = [
  {
    name: "Javi",
    trophy: "Copa Fiss",
    image: "/kahl-assets/campeon-javi.jpeg",
  },
  {
    name: "Gonza Fiss",
    trophy: "Copa Chiqui Bauch",
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
  },
];

const relegated = ["Javi", "El Buda", "Miguel"];

export default function CampeonesPage() {
  return (
    <div className="pageStack">
      <section className="heroBand championsHero">
        <div>
          <p className="eyebrow">Historial</p>
          <h1>Campeones y descendidos.</h1>
          <p className="heroCopy">La vitrina oficial de Copa Kahl: gloria arriba, B Nacional abajo.</p>
        </div>
        <div className="scoreSeal">
          <Trophy size={34} aria-hidden="true" />
          <strong>{champions.length}</strong>
          <span>copas</span>
        </div>
      </section>

      <section className="championGrid" aria-label="Campeones">
        {champions.map((champion) => (
          <article className="championCard" key={champion.name}>
            <figure>
              <img src={champion.image} alt={`Foto de ${champion.name}, campeón de ${champion.trophy}`} />
            </figure>
            <div>
              <p className="eyebrow">Campeón</p>
              <h2>{champion.name}</h2>
              <span>
                <Award size={18} aria-hidden="true" />
                {champion.trophy}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="relegationPanel" aria-label="Descendidos">
        <div>
          <p className="eyebrow">Descendidos</p>
          <h2>B Nacional</h2>
          <p>Estos tres arrancan mirando la Copa Kahl desde abajo.</p>
        </div>
        <div className="relegatedList">
          {relegated.map((name) => (
            <span key={name}>
              <ShieldAlert size={18} aria-hidden="true" />
              {name}
            </span>
          ))}
        </div>
      </section>

      <KahlImageScatter page="campeones" count={4} variant="compact" />
    </div>
  );
}
