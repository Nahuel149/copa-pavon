import { Award, ShieldAlert, Trophy } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";

const champions = [
  {
    name: "Javi",
    trophies: ["Copa Fiss"],
    image: "/kahl-assets/campeon-javi.jpeg",
  },
  {
    name: "Gonza Fiss",
    trophies: ["Copa Chiqui Bauch", "Copa Kahl"],
    image: "/kahl-assets/campeon-gonza-fiss.jpeg",
  },
];

const totalTrophies = champions.reduce((total, c) => total + c.trophies.length, 0);

const relegated = ["Javi", "El Buda", "Miguel"];
const thirdDivision = [{ name: "Ale con Pelo", note: "Suspendido para jugar las próximas 3 copas" }];

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
          <strong>{totalTrophies}</strong>
          <span>copas</span>
        </div>
      </section>

      <section className="championGrid" aria-label="Campeones">
        {champions.map((champion) => (
          <article className="championCard" key={champion.name}>
            <figure>
              <img src={champion.image} alt={`Foto de ${champion.name}, campeón`} />
            </figure>
            <div>
              <p className="eyebrow">Campeón</p>
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

      <section className="relegationPanel thirdDivisionPanel" aria-label="C">
        <div>
          <p className="eyebrow">Descendidos</p>
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

      <KahlImageScatter page="campeones" count={4} variant="compact" />
    </div>
  );
}
