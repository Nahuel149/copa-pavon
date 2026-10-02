const normalizeClubName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const clubs: [string, string[]][] = [
  ["boca-juniors", ["Boca Juniors", "Boca"]],
  ["vasco-da-gama", ["Vasco da Gama", "Vasco"]],
  ["atletico-mineiro", ["Atlético Mineiro", "Atlético-MG"]],
  ["montevideo-city-torque", ["Montevideo City Torque"]],
  ["fluminense", ["Fluminense"]],
  ["palmeiras", ["Palmeiras"]],
  ["estudiantes", ["Estudiantes de La Plata"]],
  ["flamengo", ["Flamengo"]],
  ["banfield", ["Banfield"]],
  ["atletico-tucuman", ["Atlético Tucumán"]],
  ["platense", ["Platense"]],
  ["sarmiento-junin", ["Sarmiento Junín", "Sarmiento (Junín)"]],
  ["deportivo-riestra", ["Deportivo Riestra"]],
  ["tigre", ["Tigre"]],
  ["river-plate", ["River Plate"]],
  ["velez-sarsfield", ["Vélez Sarsfield"]],
  ["independiente", ["Independiente"]],
  ["instituto", ["Instituto", "Instituto (Córdoba)"]],
  ["gimnasia-mendoza", ["Gimnasia de Mendoza", "Gimnasia (Mendoza)"]],
];

const badgeByClub = new Map(clubs.flatMap(([slug, names]) => names.map((name) => [normalizeClubName(name), `/club-badges/${slug}.png`] as const)));

export function getClubBadgeUrl(team: string) {
  return badgeByClub.get(normalizeClubName(team)) ?? null;
}
