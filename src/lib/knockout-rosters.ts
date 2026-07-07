export type KnockoutScorerRole = "star" | "forward" | "field";

export type KnockoutRosterPlayer = {
  name: string;
  role: KnockoutScorerRole;
};

export type KnockoutScorerOption = KnockoutRosterPlayer & {
  team: string;
  side: "home" | "away";
};

export const knockoutScorerRolePoints: Record<KnockoutScorerRole, number> = {
  star: 1,
  forward: 2,
  field: 3,
};

export const knockoutScorerRoleLabels: Record<KnockoutScorerRole, string> = {
  star: "Figura +1",
  forward: "Delantero +2",
  field: "Medio/defensa +3",
};

const knockoutTeamAliases: Record<string, string[]> = {
  Argentina: ["Argentina"],
  Belgica: ["Belgica", "BÃ©lgica", "Bélgica", "Belgium"],
  Colombia: ["Colombia"],
  Espana: ["Espana", "EspaÃ±a", "España", "Spain"],
  Francia: ["Francia", "France"],
  Inglaterra: ["Inglaterra", "England"],
  Marruecos: ["Marruecos", "Morocco"],
  Noruega: ["Noruega", "Norway"],
};

export const knockoutTeamRosters: Record<string, KnockoutRosterPlayer[]> = {
  Argentina: [
    { name: "Lionel Messi", role: "star" },
    { name: "Julian Alvarez", role: "forward" },
    { name: "Lautaro Martinez", role: "forward" },
    { name: "Nicolas Gonzalez", role: "forward" },
    { name: "Alejandro Garnacho", role: "forward" },
    { name: "Paulo Dybala", role: "forward" },
    { name: "Angel Di Maria", role: "forward" },
    { name: "Emiliano Martinez", role: "field" },
    { name: "Geronimo Rulli", role: "field" },
    { name: "Franco Armani", role: "field" },
    { name: "Nahuel Molina", role: "field" },
    { name: "Gonzalo Montiel", role: "field" },
    { name: "Cristian Romero", role: "field" },
    { name: "Nicolas Otamendi", role: "field" },
    { name: "Lisandro Martinez", role: "field" },
    { name: "Nicolas Tagliafico", role: "field" },
    { name: "Marcos Acuna", role: "field" },
    { name: "German Pezzella", role: "field" },
    { name: "Alexis Mac Allister", role: "field" },
    { name: "Rodrigo De Paul", role: "field" },
    { name: "Enzo Fernandez", role: "field" },
    { name: "Leandro Paredes", role: "field" },
    { name: "Giovani Lo Celso", role: "field" },
    { name: "Exequiel Palacios", role: "field" },
    { name: "Guido Rodriguez", role: "field" },
    { name: "Thiago Almada", role: "field" },
  ],
  Belgica: [
    { name: "Romelu Lukaku", role: "star" },
    { name: "Jeremy Doku", role: "forward" },
    { name: "Lois Openda", role: "forward" },
    { name: "Leandro Trossard", role: "forward" },
    { name: "Johan Bakayoko", role: "forward" },
    { name: "Charles De Ketelaere", role: "forward" },
    { name: "Michy Batshuayi", role: "forward" },
    { name: "Thibaut Courtois", role: "field" },
    { name: "Koen Casteels", role: "field" },
    { name: "Matz Sels", role: "field" },
    { name: "Timothy Castagne", role: "field" },
    { name: "Thomas Meunier", role: "field" },
    { name: "Arthur Theate", role: "field" },
    { name: "Jan Vertonghen", role: "field" },
    { name: "Wout Faes", role: "field" },
    { name: "Zeno Debast", role: "field" },
    { name: "Maxim De Cuyper", role: "field" },
    { name: "Amadou Onana", role: "field" },
    { name: "Youri Tielemans", role: "field" },
    { name: "Kevin De Bruyne", role: "field" },
    { name: "Axel Witsel", role: "field" },
    { name: "Orel Mangala", role: "field" },
    { name: "Yannick Carrasco", role: "field" },
    { name: "Arthur Vermeeren", role: "field" },
    { name: "Aster Vranckx", role: "field" },
    { name: "Alexis Saelemaekers", role: "field" },
  ],
  Colombia: [
    { name: "Luis Diaz", role: "star" },
    { name: "Jhon Duran", role: "forward" },
    { name: "Rafael Santos Borre", role: "forward" },
    { name: "Miguel Borja", role: "forward" },
    { name: "Luis Sinisterra", role: "forward" },
    { name: "Jhon Arias", role: "forward" },
    { name: "Yaser Asprilla", role: "forward" },
    { name: "Camilo Vargas", role: "field" },
    { name: "David Ospina", role: "field" },
    { name: "Kevin Mier", role: "field" },
    { name: "Daniel Munoz", role: "field" },
    { name: "Davinson Sanchez", role: "field" },
    { name: "Yerry Mina", role: "field" },
    { name: "Jhon Lucumi", role: "field" },
    { name: "Carlos Cuesta", role: "field" },
    { name: "Johan Mojica", role: "field" },
    { name: "Deiver Machado", role: "field" },
    { name: "Jefferson Lerma", role: "field" },
    { name: "Richard Rios", role: "field" },
    { name: "Mateus Uribe", role: "field" },
    { name: "James Rodriguez", role: "field" },
    { name: "Juan Quintero", role: "field" },
    { name: "Jorge Carrascal", role: "field" },
    { name: "Kevin Castano", role: "field" },
    { name: "Wilmar Barrios", role: "field" },
    { name: "Juan Portilla", role: "field" },
  ],
  Espana: [
    { name: "Lamine Yamal", role: "star" },
    { name: "Alvaro Morata", role: "forward" },
    { name: "Nico Williams", role: "forward" },
    { name: "Ferran Torres", role: "forward" },
    { name: "Joselu", role: "forward" },
    { name: "Mikel Oyarzabal", role: "forward" },
    { name: "Ansu Fati", role: "forward" },
    { name: "Unai Simon", role: "field" },
    { name: "David Raya", role: "field" },
    { name: "Alex Remiro", role: "field" },
    { name: "Dani Carvajal", role: "field" },
    { name: "Robin Le Normand", role: "field" },
    { name: "Aymeric Laporte", role: "field" },
    { name: "Nacho", role: "field" },
    { name: "Dani Vivian", role: "field" },
    { name: "Alejandro Grimaldo", role: "field" },
    { name: "Marc Cucurella", role: "field" },
    { name: "Rodri", role: "field" },
    { name: "Martin Zubimendi", role: "field" },
    { name: "Fabian Ruiz", role: "field" },
    { name: "Pedri", role: "field" },
    { name: "Gavi", role: "field" },
    { name: "Mikel Merino", role: "field" },
    { name: "Dani Olmo", role: "field" },
    { name: "Alex Baena", role: "field" },
    { name: "Jesus Navas", role: "field" },
  ],
  Francia: [
    { name: "Kylian Mbappe", role: "star" },
    { name: "Randal Kolo Muani", role: "forward" },
    { name: "Marcus Thuram", role: "forward" },
    { name: "Ousmane Dembele", role: "forward" },
    { name: "Bradley Barcola", role: "forward" },
    { name: "Kingsley Coman", role: "forward" },
    { name: "Christopher Nkunku", role: "forward" },
    { name: "Mike Maignan", role: "field" },
    { name: "Alphonse Areola", role: "field" },
    { name: "Brice Samba", role: "field" },
    { name: "Jules Kounde", role: "field" },
    { name: "William Saliba", role: "field" },
    { name: "Dayot Upamecano", role: "field" },
    { name: "Ibrahima Konate", role: "field" },
    { name: "Theo Hernandez", role: "field" },
    { name: "Ferland Mendy", role: "field" },
    { name: "Benjamin Pavard", role: "field" },
    { name: "Aurelien Tchouameni", role: "field" },
    { name: "Eduardo Camavinga", role: "field" },
    { name: "Adrien Rabiot", role: "field" },
    { name: "Antoine Griezmann", role: "field" },
    { name: "Warren Zaire-Emery", role: "field" },
    { name: "Youssouf Fofana", role: "field" },
    { name: "N'Golo Kante", role: "field" },
    { name: "Jonathan Clauss", role: "field" },
    { name: "Malo Gusto", role: "field" },
  ],
  Inglaterra: [
    { name: "Harry Kane", role: "star" },
    { name: "Bukayo Saka", role: "forward" },
    { name: "Phil Foden", role: "forward" },
    { name: "Marcus Rashford", role: "forward" },
    { name: "Ollie Watkins", role: "forward" },
    { name: "Ivan Toney", role: "forward" },
    { name: "Anthony Gordon", role: "forward" },
    { name: "Jordan Pickford", role: "field" },
    { name: "Aaron Ramsdale", role: "field" },
    { name: "Dean Henderson", role: "field" },
    { name: "Kyle Walker", role: "field" },
    { name: "John Stones", role: "field" },
    { name: "Marc Guehi", role: "field" },
    { name: "Harry Maguire", role: "field" },
    { name: "Luke Shaw", role: "field" },
    { name: "Kieran Trippier", role: "field" },
    { name: "Trent Alexander-Arnold", role: "field" },
    { name: "Declan Rice", role: "field" },
    { name: "Jude Bellingham", role: "field" },
    { name: "Kobbie Mainoo", role: "field" },
    { name: "Cole Palmer", role: "field" },
    { name: "Conor Gallagher", role: "field" },
    { name: "Eberechi Eze", role: "field" },
    { name: "James Maddison", role: "field" },
    { name: "Levi Colwill", role: "field" },
    { name: "Jarrod Bowen", role: "forward" },
  ],
  Marruecos: [
    { name: "Brahim Diaz", role: "star" },
    { name: "Youssef En-Nesyri", role: "forward" },
    { name: "Ayoub El Kaabi", role: "forward" },
    { name: "Abde Ezzalzouli", role: "forward" },
    { name: "Soufiane Rahimi", role: "forward" },
    { name: "Ilias Akhomach", role: "forward" },
    { name: "Hakim Ziyech", role: "forward" },
    { name: "Yassine Bounou", role: "field" },
    { name: "Munir Mohamedi", role: "field" },
    { name: "El Mehdi Benabid", role: "field" },
    { name: "Achraf Hakimi", role: "field" },
    { name: "Noussair Mazraoui", role: "field" },
    { name: "Romain Saiss", role: "field" },
    { name: "Nayef Aguerd", role: "field" },
    { name: "Chadi Riad", role: "field" },
    { name: "Yahya Attiat-Allah", role: "field" },
    { name: "Sofyan Amrabat", role: "field" },
    { name: "Azzedine Ounahi", role: "field" },
    { name: "Selim Amallah", role: "field" },
    { name: "Amine Harit", role: "field" },
    { name: "Bilal El Khannouss", role: "field" },
    { name: "Amir Richardson", role: "field" },
    { name: "Anass Zaroury", role: "field" },
    { name: "Eliesse Ben Seghir", role: "field" },
    { name: "Yunis Abdelhamid", role: "field" },
    { name: "Achraf Dari", role: "field" },
  ],
  Noruega: [
    { name: "Erling Haaland", role: "star" },
    { name: "Alexander Sorloth", role: "forward" },
    { name: "Antonio Nusa", role: "forward" },
    { name: "Oscar Bobb", role: "forward" },
    { name: "Jorgen Strand Larsen", role: "forward" },
    { name: "Mohamed Elyounoussi", role: "forward" },
    { name: "Ola Solbakken", role: "forward" },
    { name: "Orjan Nyland", role: "field" },
    { name: "Egil Selvik", role: "field" },
    { name: "Mathias Dyngeland", role: "field" },
    { name: "Julian Ryerson", role: "field" },
    { name: "Kristoffer Ajer", role: "field" },
    { name: "Leo Ostigard", role: "field" },
    { name: "Marcus Holmgren Pedersen", role: "field" },
    { name: "Birger Meling", role: "field" },
    { name: "Sander Berge", role: "field" },
    { name: "Martin Odegaard", role: "field" },
    { name: "Morten Thorsby", role: "field" },
    { name: "Patrick Berg", role: "field" },
    { name: "Fredrik Aursnes", role: "field" },
    { name: "Hugo Vetlesen", role: "field" },
    { name: "Aron Donnum", role: "field" },
    { name: "Kristian Thorstvedt", role: "field" },
    { name: "Mats Moller Daehli", role: "field" },
    { name: "Sander Tronstad", role: "field" },
    { name: "Bard Finne", role: "forward" },
  ],
};

export function normalizeRosterText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã©/gi, "e")
    .replace(/Ã±/gi, "n")
    .replace(/Ã¡/gi, "a")
    .replace(/Ã­/gi, "i")
    .replace(/Ã³/gi, "o")
    .replace(/Ãº/gi, "u")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function canonicalTeamName(team: string) {
  const normalized = normalizeRosterText(team);
  return Object.entries(knockoutTeamAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizeRosterText(alias) === normalized),
  )?.[0];
}

export function getKnockoutRoster(team: string) {
  const key = canonicalTeamName(team);
  return key ? knockoutTeamRosters[key] ?? [] : [];
}

export function getKnockoutScorerOptions(home: string, away: string): KnockoutScorerOption[] {
  return [
    ...getKnockoutRoster(home).map((player) => ({ ...player, team: home, side: "home" as const })),
    ...getKnockoutRoster(away).map((player) => ({ ...player, team: away, side: "away" as const })),
  ];
}

export function getKnockoutScorerRole(teamA: string, teamB: string, scorerName: string) {
  const normalizedScorer = normalizeRosterText(scorerName);
  if (!normalizedScorer) return undefined;

  const options = getKnockoutScorerOptions(teamA, teamB);
  return options.find((player) => normalizeRosterText(player.name) === normalizedScorer)?.role;
}
